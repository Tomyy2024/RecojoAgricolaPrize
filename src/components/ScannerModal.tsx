import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ScanBarcode, 
  SwitchCamera, 
  Image as ImageIcon, 
  Flashlight,
  RefreshCw,
  HelpCircle,
  Smartphone,
  Sparkles,
  ExternalLink,
  Wrench,
  Check,
  Zap,
  Volume2,
  VolumeX,
  Search,
  Maximize2
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';
import { Trabajador } from '../types';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanDni: (dni: string) => void;
  trabajadores: Trabajador[];
  mode?: 'worker' | 'leader';
}

// Complete list of supported barcode and 2D formats, including PDF_417 for Peruvian DNI
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.PDF_417,     // Peruvian DNI Azul & DNIe (Crucial for DNI)
  Html5QrcodeSupportedFormats.QR_CODE,     // DNI Electrónico & Fotochecks QR
  Html5QrcodeSupportedFormats.CODE_128,    // Industrial Barcode (Fotochecks)
  Html5QrcodeSupportedFormats.CODE_39,     // Standard Barcode (Fotochecks)
  Html5QrcodeSupportedFormats.EAN_13,      // Commercial Barcode
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.CODABAR
];

// Simple Web Audio beep sound on successful scan
const playSuccessBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // AudioContext might be muted or restricted
  }
};

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanDni,
  trabajadores = [],
  mode = 'worker'
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('Listo para escanear DNI / Fotocheck.');
  const [statusType, setStatusType] = useState<'info' | 'ok' | 'err' | 'warn'>('info');
  const [manualDni, setManualDni] = useState('');
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showPermHelp, setShowPermHelp] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Diagnostic mode
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);
  const [isInIframe, setIsInIframe] = useState(false);
  const [cameraTestPassed, setCameraTestPassed] = useState<boolean | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerContainerId = 'html5-qr-reader-container';

  // Check iframe status
  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const addLog = (msg: string) => {
    setDiagnosticLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 20)]);
  };

  // Initialize and load camera devices when modal opens
  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      setStatusMsg(
        mode === 'leader'
          ? '👑 Modo Líder: Apunta la cámara al fotocheck o DNI del líder.'
          : '📷 Apunta la cámara al código de barras / QR / PDF417 del DNI.'
      );
      setStatusType('info');
      setShowPermHelp(false);
      setIsStartingCamera(false);
      setManualDni('');
      setCameraTestPassed(null);
      setDiagnosticLog([]);

      addLog('Lector de escaneo abierto.');

      // Check available cameras if permissions are already given
      if (navigator?.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            if (!isMounted) return;
            const videoDevices = devices.filter((d) => d.kind === 'videoinput');
            addLog(`Dispositivos de video detectados: ${videoDevices.length}`);
            
            if (videoDevices.length > 0) {
              const camList: CameraDevice[] = videoDevices.map((d, i) => ({
                id: d.deviceId,
                label: d.label || `Cámara ${i + 1} (${d.deviceId.slice(0, 6)}...)`
              }));
              setAvailableCameras(camList);
              
              const backCam = camList.find(
                (c) =>
                  c.label.toLowerCase().includes('back') ||
                  c.label.toLowerCase().includes('trasera') ||
                  c.label.toLowerCase().includes('posterior') ||
                  c.label.toLowerCase().includes('environment') ||
                  c.label.toLowerCase().includes('0, facing back')
              );
              setSelectedCameraId(backCam ? backCam.id : camList[0].id);
            }
          })
          .catch((e) => {
            addLog(`Aviso enumerateDevices: ${e.message}`);
          });
      }

      // Auto-start camera after slight mount delay
      const timer = setTimeout(() => {
        if (isMounted) {
          startCamera();
        }
      }, 400);

      return () => {
        clearTimeout(timer);
        isMounted = false;
        stopCamera();
      };
    } else {
      stopCamera();
    }

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, mode]);

  const stopCamera = async () => {
    setIsStartingCamera(false);
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error during scanner cleanup:', err);
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setHasTorch(false);
  };

  const startCamera = async (overrideCameraId?: string) => {
    try {
      setIsStartingCamera(true);
      setShowPermHelp(false);
      await stopCamera();

      // Check if container element is ready in DOM
      const elem = document.getElementById(readerContainerId);
      if (!elem) {
        setIsStartingCamera(false);
        addLog('Elemento contenedor de cámara no encontrado en el DOM.');
        return;
      }

      setStatusMsg('Solicitando acceso a la cámara...');
      setStatusType('info');
      addLog('Iniciando instancia de Html5Qrcode con soporte DNI PDF417...');

      const scanner = new Html5Qrcode(readerContainerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false
      });
      html5QrCodeRef.current = scanner;

      const qrBoxDimensions = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(minEdge * 0.90),
          height: Math.floor(minEdge * 0.65)
        };
      };

      const scanConfig = {
        fps: 15,
        qrbox: qrBoxDimensions,
        aspectRatio: 1.333333
      };

      // Strategy 1: Camera ID if specified
      const targetCamId = overrideCameraId || selectedCameraId;
      let startedSuccessfully = false;

      if (targetCamId) {
        try {
          addLog(`Intentando iniciar con ID de cámara: ${targetCamId.slice(0, 10)}...`);
          await scanner.start(
            targetCamId,
            scanConfig,
            (decodedText) => handleDecodedContent(decodedText),
            () => {}
          );
          startedSuccessfully = true;
        } catch (errCamId: unknown) {
          addLog(`Fallo inicio por CameraId: ${errCamId instanceof Error ? errCamId.message : String(errCamId)}`);
        }
      }

      // Strategy 2: facingMode 'environment' (Rear Camera)
      if (!startedSuccessfully) {
        try {
          addLog('Intentando iniciar con facingMode: environment...');
          await scanner.start(
            { facingMode: 'environment' },
            scanConfig,
            (decodedText) => handleDecodedContent(decodedText),
            () => {}
          );
          startedSuccessfully = true;
        } catch (errEnv: unknown) {
          addLog(`Fallo environment: ${errEnv instanceof Error ? errEnv.message : String(errEnv)}`);
        }
      }

      // Strategy 3: facingMode 'user' (Front Camera Fallback)
      if (!startedSuccessfully) {
        try {
          addLog('Intentando iniciar con facingMode: user (frontal)...');
          await scanner.start(
            { facingMode: 'user' },
            scanConfig,
            (decodedText) => handleDecodedContent(decodedText),
            () => {}
          );
          startedSuccessfully = true;
        } catch (errUser: unknown) {
          addLog(`Fallo user: ${errUser instanceof Error ? errUser.message : String(errUser)}`);
        }
      }

      // Strategy 4: Flexible default camera
      if (!startedSuccessfully) {
        try {
          addLog('Intentando iniciar con configuración genérica de cámara...');
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            setAvailableCameras(cameras);
            await scanner.start(
              cameras[0].id,
              scanConfig,
              (decodedText) => handleDecodedContent(decodedText),
              () => {}
            );
            startedSuccessfully = true;
          }
        } catch (errAny: unknown) {
          addLog(`Fallo fallback genérico: ${errAny instanceof Error ? errAny.message : String(errAny)}`);
          throw errAny;
        }
      }

      if (startedSuccessfully) {
        setCameraActive(true);
        setIsStartingCamera(false);
        setCameraTestPassed(true);
        setStatusMsg('📷 Cámara activa. Enfoque el código de barras o QR.');
        setStatusType('info');
        addLog('Cámara iniciada con éxito. Escaneo en vivo activo.');

        // Refresh available cameras with updated labels
        Html5Qrcode.getCameras()
          .then((cams) => {
            if (cams && cams.length > 0) {
              setAvailableCameras(cams);
            }
          })
          .catch(() => {});

        // Check torch support
        try {
          const capabilities = scanner.getRunningTrackCapabilities();
          if (capabilities && (capabilities as unknown as { torch?: boolean }).torch) {
            setHasTorch(true);
            addLog('Linterna / Flash disponible en este sensor.');
          }
        } catch {}
      } else {
        throw new Error('No se pudo inicializar ningún sensor de video disponible.');
      }

    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      setCameraActive(false);
      setIsStartingCamera(false);
      setCameraTestPassed(false);

      let msg = 'No se pudo abrir la cámara en vivo.';
      if (err instanceof Error) {
        addLog(`Error fatal cámara: ${err.name} - ${err.message}`);
        if (err.name === 'NotAllowedError' || err.message.toLowerCase().includes('permission') || err.message.toLowerCase().includes('denied')) {
          msg = 'Permiso de cámara bloqueado en el navegador. Haz clic en "Tomar Foto (Nativo)" o permite la cámara.';
          setShowPermHelp(true);
        } else if (err.name === 'NotFoundError' || err.message.toLowerCase().includes('not found')) {
          msg = 'No se detectó cámara física disponible en el dispositivo.';
        } else if (err.name === 'NotReadableError' || err.message.toLowerCase().includes('in use')) {
          msg = 'La cámara está en uso por otra pestaña o app. Ciérrala y reintenta.';
        } else {
          msg = `Aviso de cámara: ${err.message}`;
        }
      }
      setStatusMsg(msg);
      setStatusType('err');
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !cameraActive) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }] as unknown as MediaTrackConstraintSet[]
      });
      setTorchOn(nextState);
      addLog(`Linterna: ${nextState ? 'Encendida' : 'Apagada'}`);
    } catch (err) {
      console.warn('Flashlight not available:', err);
      addLog('Linterna no soportada en este dispositivo.');
    }
  };

  const handleSwitchCamera = async () => {
    if (availableCameras.length < 2) {
      startCamera();
      return;
    }

    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    setSelectedCameraId(nextCamera.id);
    addLog(`Cambiando a cámara: ${nextCamera.label || nextCamera.id}`);
    await startCamera(nextCamera.id);
  };

  // Smart DNI Parser (Supports Peruvian DNI PDF417, Barcode 128/39, QR and MRZ)
  const handleDecodedContent = (rawCode: string) => {
    if (!rawCode) return;
    const clean = rawCode.trim();
    addLog(`Código decodificado recibido (${clean.length} caracteres): ${clean.slice(0, 25)}...`);

    // Sound and vibration feedback
    if (soundEnabled) {
      playSuccessBeep();
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }

    // Pattern 1: Look for 8-digit exact number anywhere
    const dniMatch = clean.match(/\b\d{8}\b/) || clean.match(/\d{8}/);
    let extractedDni = dniMatch ? dniMatch[0] : '';

    // Pattern 2: Peruvian MRZ on DNI Electrónico / Pasaporte (e.g. I<PER12345678)
    if (!extractedDni) {
      const mrzMatch = clean.match(/PER(\d{8})/i) || clean.match(/I<([A-Z0-9]{8})/i);
      if (mrzMatch && mrzMatch[1]) {
        extractedDni = mrzMatch[1];
      }
    }

    // Pattern 3: Clean non-digits
    if (!extractedDni) {
      const digitsOnly = clean.replace(/\D/g, '');
      if (digitsOnly.length === 8) {
        extractedDni = digitsOnly;
      } else if (digitsOnly.length > 8) {
        extractedDni = digitsOnly.slice(0, 8);
      }
    }

    if (extractedDni && extractedDni.length === 8) {
      confirmScannedDni(extractedDni);
    } else if (clean.length > 0) {
      confirmScannedDni(clean);
    }
  };

  const confirmScannedDni = (dni: string) => {
    stopCamera();
    const cleanDni = dni.trim();
    const found = trabajadores.find((t) => String(t.dni).trim() === cleanDni);

    if (found) {
      setStatusMsg(`✅ DNI ${cleanDni} identificado: ${found.nombres}`);
      setStatusType('ok');
      addLog(`DNI ${cleanDni} validado con trabajador: ${found.nombres}`);
      onScanDni(cleanDni);
    } else {
      setStatusMsg(`⚠️ DNI ${cleanDni} leído (No encontrado en nómina actual).`);
      setStatusType('warn');
      addLog(`DNI ${cleanDni} leído pero sin match en lista de trabajadores.`);
      onScanDni(cleanDni);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDni.trim()) return;
    confirmScannedDni(manualDni.trim());
    setManualDni('');
  };

  // Direct Mobile Photo Trigger (Native Android/iOS Camera - 100% Reliable without WebRTC restrictions)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setStatusMsg('Analizando fotografía del DNI / Fotocheck...');
    setStatusType('info');
    addLog(`Foto recibida: ${file.name} (${Math.round(file.size / 1024)} KB). Procesando...`);

    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(readerContainerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false
        });
      }

      const decodedText = await scanner.scanFile(file, true);
      setIsProcessingFile(false);
      addLog(`Foto decodificada con éxito: ${decodedText.slice(0, 30)}`);
      handleDecodedContent(decodedText);
    } catch (err: unknown) {
      setIsProcessingFile(false);
      console.warn('Photo scan error:', err);
      addLog(`Fallo al leer la foto: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMsg('No se detectó un código nítido en la imagen. Intenta con mejor iluminación o ingresa el DNI.');
      setStatusType('err');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Run self-diagnostic test
  const handleRunDiagnostics = async () => {
    addLog('--- INICIANDO DIAGNÓSTICO DE CÁMARA ---');
    addLog(`Navegador: ${navigator.userAgent}`);
    addLog(`Enlace Seguro HTTPS: ${window.location.protocol === 'https:' ? 'SÍ (Correcto)' : 'NO (Inseguro)'}`);
    addLog(`En entorno iFrame: ${isInIframe ? 'SÍ (Iframe Preview)' : 'NO (Ventana Directa)'}`);
    addLog(`Soporte navigator.mediaDevices: ${!!navigator?.mediaDevices ? 'SÍ (Disponible)' : 'NO'}`);
    
    if (navigator?.mediaDevices?.getUserMedia) {
      addLog('Soporte getUserMedia: SÍ (Disponible)');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        addLog('✅ Permiso de cámara WebRTC concedido con éxito.');
        const track = stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          addLog(`Sensor Activo: ${track.label || 'Cámara'}`);
          addLog(`Resolución: ${settings.width || '?'}x${settings.height || '?'}`);
        }
        track.stop();
        stream.getTracks().forEach((t) => t.stop());
        setCameraTestPassed(true);
        setStatusMsg('✅ Prueba de cámara exitosa. Sensor listo para operar.');
        setStatusType('ok');
        // Restart scanner
        startCamera();
      } catch (e: unknown) {
        addLog(`❌ Error en prueba directa de getUserMedia: ${e instanceof Error ? e.message : String(e)}`);
        setCameraTestPassed(false);
      }
    } else {
      addLog('❌ getUserMedia no disponible en este navegador o contexto.');
      setCameraTestPassed(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f5e9] text-[#1b5e20] flex items-center justify-center font-bold shadow-xs">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[#1b5e20] leading-tight">
                  {mode === 'leader' ? '👑 Escanear Fotocheck de Líder' : '📷 Escanear DNI / Fotocheck'}
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  PDF417 · Barcode · QR
                </span>
              </div>
              <p className="text-[11px] text-[#757575]">Compatible con DNI Peruano (Azul/DNIe) y Fotocheck</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full cursor-pointer transition-all ${
                soundEnabled ? 'text-[#2e7d32] bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={soundEnabled ? 'Sonido de escaneo activado' : 'Sonido desactivado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer active:scale-95 transition-all"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 py-3 space-y-3">
          
          {/* IFrame & Permissions Notice if needed */}
          {isInIframe && (
            <div className="bg-[#f1f8e9] border border-[#c5e1a5] p-2.5 rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#2e7d32]">
                <Smartphone className="w-4 h-4 shrink-0 text-[#1b5e20]" />
                <span className="text-[11px] font-semibold text-[#1b5e20]">
                  ¿Problemas con la cámara del navegador? Abre en pantalla completa o usa <strong>Tomar Foto (Nativo)</strong>.
                </span>
              </div>
              <a
                href={window.location.href}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 bg-[#2e7d32] hover:bg-[#1b5e20] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs"
              >
                <span>Nueva Pestaña</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Cámara Container */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-inner flex flex-col items-center justify-center min-h-[220px]">
            <div
              id={readerContainerId}
              className={`w-full ${cameraActive ? 'block' : 'hidden'}`}
              style={{ minHeight: '220px' }}
            />

            {!cameraActive && (
              <div className="p-6 text-center text-white/90 space-y-2.5">
                <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400 shadow-md">
                  {isStartingCamera ? (
                    <RefreshCw className="w-7 h-7 animate-spin text-emerald-300" />
                  ) : (
                    <Camera className="w-7 h-7" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">
                  {isStartingCamera ? 'Activando sensor de cámara...' : 'Visor de Cámara Listo'}
                </div>
                <p className="text-[11px] text-white/70 max-w-xs mx-auto">
                  Toca <strong className="text-emerald-300">"Iniciar Cámara"</strong> para escanear en tiempo real o <strong className="text-emerald-300">"Tomar Foto (Nativo)"</strong> para usar la app de cámara de tu celular con autoenfoque.
                </p>
              </div>
            )}

            {/* Overlays in Camera View */}
            {cameraActive && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-white/20">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-1.5 rounded-full text-xs cursor-pointer transition-all ${
                      torchOn ? 'bg-amber-400 text-black shadow-md' : 'text-white hover:bg-white/20'
                    }`}
                    title="Encender Linterna / Flash"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}

                {availableCameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="p-1.5 rounded-full text-white hover:bg-white/20 text-xs cursor-pointer transition-all"
                    title="Cambiar Cámara (Frontal / Trasera)"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Estado Informativo */}
          <div
            className={`text-xs font-semibold p-2.5 rounded-xl flex items-center gap-2 transition-all ${
              statusType === 'ok'
                ? 'bg-[#e8f5e9] text-[#1b5e20] border border-[#a5d6a7]'
                : statusType === 'err'
                ? 'bg-[#ffebee] text-[#c62828] border border-[#ffcdd2]'
                : statusType === 'warn'
                ? 'bg-[#fff8e1] text-[#b78103] border border-[#ffe082]'
                : 'bg-[#e3f2fd] text-[#1565c0] border border-[#90caf9]'
            }`}
          >
            {statusType === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2e7d32]" />
            ) : statusType === 'err' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#c62828]" />
            ) : (
              <ScanBarcode className="w-4 h-4 shrink-0 text-[#1565c0]" />
            )}
            <span className="flex-1 leading-snug">{statusMsg}</span>
          </div>

          {/* Ayuda de Permisos si el navegador bloquea la cámara */}
          {showPermHelp && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 space-y-1.5 animate-in fade-in">
              <div className="font-bold flex items-center gap-1 text-amber-800">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>¿Cómo activar la cámara en tu celular?</span>
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-amber-900/90">
                <li>Toca el icono de <strong>Candado 🔒 o Ajustes</strong> al lado de la URL en Chrome / Safari.</li>
                <li>Selecciona <strong>"Permisos"</strong> y activa el interruptor de <strong>Cámara</strong>.</li>
                <li>O usa el botón verde <strong>"Tomar Foto (Nativo)"</strong> que siempre abre tu cámara sin necesidad de permisos web.</li>
              </ol>
            </div>
          )}

          {/* Botones de Control de Cámara */}
          <div className="grid grid-cols-2 gap-2">
            {!cameraActive ? (
              <button
                type="button"
                onClick={() => startCamera()}
                disabled={isStartingCamera}
                className="bg-[#2e7d32] hover:bg-[#1b5e20] active:bg-[#1b5e20] text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              >
                {isStartingCamera ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Iniciando...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>Iniciar Cámara</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="bg-[#d32f2f] hover:bg-[#b71c1c] active:bg-[#b71c1c] text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <X className="w-4 h-4 shrink-0" />
                <span>Detener Cámara</span>
              </button>
            )}

            {/* Disparador de Cámara Nativa del Celular (100% compatible con iOS y Android sin WebRTC) */}
            <label className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm border border-emerald-400 transition-all cursor-pointer text-center ${
              isProcessingFile
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : 'bg-[#e8f5e9] text-[#1b5e20] hover:bg-[#c8e6c9] active:scale-95'
            }`}>
              {isProcessingFile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Procesando foto...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Tomar Foto (Nativo)</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                disabled={isProcessingFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Selector de cámara si hay más de 1 */}
          {availableCameras.length > 1 && !cameraActive && (
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 text-xs">
              <SwitchCamera className="w-4 h-4 text-gray-500 shrink-0" />
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="bg-transparent flex-1 text-xs text-gray-700 outline-none cursor-pointer font-medium"
              >
                {availableCameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Lente de Cámara ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Herramienta de Diagnóstico y Prueba de Cámara */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-[11px] font-bold text-gray-700 hover:text-[#1b5e20] flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5 text-[#2e7d32]" />
                <span>{showDiagnostics ? 'Ocultar Diagnóstico de Cámara' : '🛠️ Probar y Diagnosticar Cámara'}</span>
              </button>

              <button
                type="button"
                onClick={handleRunDiagnostics}
                className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-[#1b5e20] px-2.5 py-1 rounded-lg border border-[#a5d6a7] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
              >
                <Zap className="w-3 h-3 text-[#ff8f00]" />
                <span>Ejecutar Test</span>
              </button>
            </div>

            {showDiagnostics && (
              <div className="mt-2.5 pt-2 border-t border-gray-200 space-y-2 text-[11px] animate-in fade-in">
                <div className="flex flex-wrap gap-2 items-center text-[10px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${cameraTestPassed ? 'bg-emerald-100 text-emerald-800' : cameraTestPassed === false ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700'}`}>
                    Test: {cameraTestPassed ? '✅ Aprobado' : cameraTestPassed === false ? '❌ Error' : 'Sin Ejecutar'}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-medium">
                    Cámaras: {availableCameras.length}
                  </span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-medium">
                    {isInIframe ? 'IFrame: Sí' : 'IFrame: No'}
                  </span>
                </div>

                <div className="bg-black/90 text-emerald-400 font-mono p-2 rounded-lg text-[10px] max-h-32 overflow-y-auto space-y-0.5 leading-tight">
                  {diagnosticLog.length === 0 ? (
                    <div className="text-gray-500">Toca "Ejecutar Test" para inspeccionar los sensores de tu dispositivo.</div>
                  ) : (
                    diagnosticLog.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ingreso Manual de DNI y Búsqueda */}
          <div className="border-t border-[#e0e0e0] pt-3">
            <label className="block text-xs font-bold text-[#40493d] mb-1.5">
              O ingresa el número de DNI directamente:
            </label>
            <form onSubmit={handleManualSubmit} className="flex gap-2 mb-2.5">
              <input
                type="text"
                maxLength={8}
                placeholder="Ingresar DNI de 8 dígitos..."
                value={manualDni}
                onChange={(e) => setManualDni(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3 py-2 text-xs border border-[#bfcaba] rounded-xl focus:outline-none focus:border-[#2e7d32] bg-white font-medium shadow-xs"
              />
              <button
                type="submit"
                disabled={!manualDni.trim()}
                className="bg-[#2e7d32] hover:bg-[#1b5e20] disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Agregar
              </button>
            </form>

            {/* Accesos rápidos de trabajadores */}
            {trabajadores.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block mb-1">
                  Personal registrado (Toca para seleccionar rápido):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {trabajadores.slice(0, 10).map((t) => (
                    <button
                      key={t.dni}
                      type="button"
                      onClick={() => confirmScannedDni(t.dni)}
                      className="text-[11px] bg-[#f5f5f5] hover:bg-[#e8f5e9] hover:text-[#1b5e20] hover:border-[#a5d6a7] text-gray-700 px-2 py-1 rounded-lg border border-gray-200 transition-all cursor-pointer truncate max-w-[160px] font-medium active:scale-95"
                      title={`${t.nombres} (${t.dni})`}
                    >
                      {t.dni} · {t.nombres.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#e0e0e0] pt-2.5 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold cursor-pointer transition-all active:scale-95"
          >
            Cerrar Lector
          </button>
        </div>

      </div>
    </div>
  );
};
