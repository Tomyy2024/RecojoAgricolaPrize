import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ScanBarcode, 
  SwitchCamera, 
  Flashlight,
  RefreshCw,
  HelpCircle,
  Smartphone,
  Wrench,
  Zap,
  Volume2,
  VolumeX,
  Download,
  Image as ImageIcon,
  Check,
  Search,
  Sun
} from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Trabajador } from '../types';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanDni: (dni: string) => void;
  trabajadores: Trabajador[];
  mode?: 'worker' | 'leader';
}

// Audio beep on successful scan
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
    // AudioContext might be blocked or muted
  }
};

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanDni,
  trabajadores = [],
  mode = 'worker'
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'native_photo' | 'manual'>('live');
  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('Listo para escanear.');
  const [statusType, setStatusType] = useState<'info' | 'ok' | 'err' | 'warn'>('info');
  const [manualDni, setManualDni] = useState('');
  const [manualSearchFilter, setManualSearchFilter] = useState('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showPermHelp, setShowPermHelp] = useState(false);
  const [showPwaHelp, setShowPwaHelp] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeEngine, setActiveEngine] = useState<'barcode_detector' | 'zxing' | 'none'>('none');
  const [boostBrightness, setBoostBrightness] = useState(false);

  // Diagnostics
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);
  const [isInIframe, setIsInIframe] = useState(false);
  const [cameraTestPassed, setCameraTestPassed] = useState<boolean | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const isScanningRef = useRef(false);

  const addLog = (msg: string) => {
    setDiagnosticLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 30)]);
  };

  // Check iframe context
  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  // Smart DNI Parser (Peruvian DNI PDF417, Barcodes, QR, MRZ)
  const handleDecodedContent = useCallback((rawCode: string) => {
    if (!rawCode || !isScanningRef.current) return;
    const clean = rawCode.trim();
    addLog(`Código leído (${clean.length} chars): ${clean.slice(0, 25)}...`);

    // Feedback
    if (soundEnabled) {
      playSuccessBeep();
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }

    // Pattern 1: Exact 8 digits
    const dniMatch = clean.match(/\b\d{8}\b/) || clean.match(/\d{8}/);
    let extractedDni = dniMatch ? dniMatch[0] : '';

    // Pattern 2: MRZ on Peruvian DNI Electrónico / Pasaporte (e.g. I<PER12345678)
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

    const finalDni = (extractedDni && extractedDni.length === 8) ? extractedDni : clean;
    confirmScannedDni(finalDni);
  }, [soundEnabled, trabajadores, onScanDni]);

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
      setStatusMsg(`⚠️ DNI ${cleanDni} leído (No registrado en nómina actual).`);
      setStatusType('warn');
      addLog(`DNI ${cleanDni} leído.`);
      onScanDni(cleanDni);
    }
  };

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch {}
      zxingReaderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setIsStartingCamera(false);
    setTorchOn(false);
    setHasTorch(false);
    setActiveEngine('none');
  }, []);

  // Continuous Scan Loop with Hardware Acceleration + Canvas Blit
  const startScanningLoop = useCallback(async (videoElem: HTMLVideoElement) => {
    isScanningRef.current = true;

    // Check if Native BarcodeDetector is available (Hardware accelerated in Android Chrome)
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    
    if (hasBarcodeDetector) {
      try {
        addLog('Iniciando decodificador nativo BarcodeDetector (Hardware Acelerado)...');
        // @ts-expect-error - BarcodeDetector standard web API
        const detector = new window.BarcodeDetector({
          formats: [
            'pdf417',
            'qr_code',
            'code_128',
            'code_39',
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'data_matrix',
            'aztec',
            'itf'
          ]
        });

        setActiveEngine('barcode_detector');

        const detectFrame = async () => {
          if (!isScanningRef.current || !videoElem) return;

          if (videoElem.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              // Draw to mirror canvas for reliable display & brightness check
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx && videoElem.videoWidth > 0 && videoElem.videoHeight > 0) {
                  canvasRef.current.width = videoElem.videoWidth;
                  canvasRef.current.height = videoElem.videoHeight;
                  ctx.drawImage(videoElem, 0, 0);
                }
              }

              const barcodes = await detector.detect(videoElem);
              if (barcodes && barcodes.length > 0) {
                const first = barcodes[0];
                if (first.rawValue) {
                  addLog(`BarcodeDetector detectó [${first.format}]: ${first.rawValue}`);
                  handleDecodedContent(first.rawValue);
                  return;
                }
              }
            } catch {
              // Frame decoding error, continue loop
            }
          }

          if (isScanningRef.current) {
            scanLoopRef.current = requestAnimationFrame(detectFrame);
          }
        };

        detectFrame();
        return;
      } catch (e) {
        addLog(`Aviso BarcodeDetector: ${e instanceof Error ? e.message : String(e)}. Usando ZXing...`);
      }
    }

    // ZXing Universal Engine Fallback
    try {
      addLog('Iniciando decodificador ZXing Multi-Format (PDF417 / 128 / 39 / QR)...');
      setActiveEngine('zxing');

      const hints = new Map();
      const formats = [
        BarcodeFormat.PDF_417,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.ITF
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      zxingReaderRef.current = codeReader;

      const anyReader = codeReader as unknown as {
        decodeFromVideoElement: (
          v: HTMLVideoElement,
          cb: (res: { getText?: () => string; text?: string } | null, err: unknown) => void
        ) => void;
      };

      anyReader.decodeFromVideoElement(videoElem, (result, _err) => {
        if (!isScanningRef.current) return;
        if (result) {
          const text = typeof result.getText === 'function' ? result.getText() : result.text;
          if (text) {
            addLog(`ZXing decodificó: ${text}`);
            handleDecodedContent(text);
          }
        }
      });
    } catch (zxErr) {
      addLog(`Error al iniciar ZXing: ${zxErr instanceof Error ? zxErr.message : String(zxErr)}`);
    }
  }, [handleDecodedContent]);

  // Main Camera Starter with Smart Android Multi-Lens Selection
  const startCamera = async (targetDeviceId?: string) => {
    try {
      setIsStartingCamera(true);
      setShowPermHelp(false);
      stopCamera();

      addLog('Solicitando sensor de cámara al dispositivo...');
      setStatusMsg('Iniciando cámara en vivo...');
      setStatusType('info');

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('La API getUserMedia no está disponible en este navegador.');
      }

      // 1. Enumerate available devices first to find genuine rear color cameras
      let videoDevices: MediaDeviceInfo[] = [];
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        addLog(`Dispositivos de video encontrados: ${videoDevices.length}`);
      } catch (enumErr) {
        addLog(`Aviso enumerateDevices: ${enumErr}`);
      }

      let stream: MediaStream | null = null;
      const camIdToUse = targetDeviceId || selectedCameraId;

      // Strategy A: Specific Camera ID selected by user
      if (camIdToUse) {
        try {
          addLog(`Conectando a cámara ID: ${camIdToUse.slice(0, 12)}...`);
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: camIdToUse },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch (eId) {
          addLog(`Fallo específico ID: ${eId instanceof Error ? eId.message : String(eId)}`);
        }
      }

      // Strategy B: FacingMode Environment (Primary Back Camera)
      if (!stream) {
        try {
          addLog('Conectando a sensor principal trasero (environment)...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' }
            },
            audio: false
          });
        } catch (eEnv) {
          addLog(`Fallo environment: ${eEnv instanceof Error ? eEnv.message : String(eEnv)}`);
        }
      }

      // Strategy C: Generic Video constraint
      if (!stream) {
        try {
          addLog('Conectando con restricción genérica de video...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (eGen) {
          addLog(`Fallo genérico: ${eGen instanceof Error ? eGen.message : String(eGen)}`);
          throw eGen;
        }
      }

      if (!stream) {
        throw new Error('No se pudo inicializar ningún sensor de cámara.');
      }

      mediaStreamRef.current = stream;

      // Update current selected camera ID
      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        if (settings.deviceId) {
          setSelectedCameraId(settings.deviceId);
        }
        addLog(`Sensor activo: ${activeTrack.label || 'Cámara Principal'}`);

        // Check Torch capability
        try {
          const trackAny = activeTrack as unknown as { getCapabilities?: () => { torch?: boolean } };
          const caps = trackAny.getCapabilities ? trackAny.getCapabilities() : {};
          if (caps && caps.torch) {
            setHasTorch(true);
            addLog('Linterna / Flash disponible.');
          }
        } catch {}
      }

      // Re-enumerate to get full labels after permission granted
      try {
        const freshDevices = await navigator.mediaDevices.enumerateDevices();
        const freshVideo = freshDevices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(freshVideo);
      } catch {}

      // Attach stream to video element
      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        v.setAttribute('autoplay', 'true');
        v.setAttribute('muted', 'true');
        v.muted = true;

        await v.play().catch((playErr) => {
          addLog(`Aviso play: ${playErr.message}`);
        });

        const vw = v.videoWidth || 1280;
        const vh = v.videoHeight || 720;
        setVideoDimensions({ width: vw, height: vh });
        addLog(`Resolución obtenida: ${vw}x${vh}`);

        setCameraActive(true);
        setIsStartingCamera(false);
        setCameraTestPassed(true);
        setStatusMsg('📷 Cámara activa. Enfoque el DNI, Fotocheck o código.');
        setStatusType('info');

        // Start scan loop
        startScanningLoop(v);
      } else {
        throw new Error('Elemento de video no disponible en la interfaz.');
      }

    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      stopCamera();
      setCameraTestPassed(false);

      let msg = 'No se pudo abrir la cámara en vivo.';
      if (err instanceof Error) {
        addLog(`Error cámara: ${err.name} - ${err.message}`);
        if (err.name === 'NotAllowedError' || err.message.toLowerCase().includes('permission') || err.message.toLowerCase().includes('denied')) {
          msg = 'Permiso de cámara denegado. Toca "Tomar Foto (Nativo)" para disparar la cámara del celular.';
          setShowPermHelp(true);
        } else if (err.name === 'NotFoundError' || err.message.toLowerCase().includes('not found')) {
          msg = 'No se encontró una cámara disponible.';
        } else if (err.name === 'NotReadableError' || err.message.toLowerCase().includes('in use')) {
          msg = 'La cámara está ocupada por otra app. Ciérrala y reintenta.';
        } else {
          msg = `Aviso: ${err.message}`;
        }
      }
      setStatusMsg(msg);
      setStatusType('err');
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      const trackAny = track as unknown as { applyConstraints: (c: unknown) => Promise<void> };
      if (trackAny.applyConstraints) {
        await trackAny.applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
      }
      setTorchOn(nextTorch);
      addLog(`Linterna: ${nextTorch ? 'Encendida' : 'Apagada'}`);
    } catch (e) {
      console.warn('Torch error:', e);
      addLog('Error al conmutar linterna.');
    }
  };

  // Switch to next available camera lens (Fixes black/depth sensor issue in Xiaomi/Samsung)
  const handleSwitchToNextCamera = async () => {
    if (availableCameras.length === 0) {
      startCamera();
      return;
    }
    const curIdx = availableCameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIdx = (curIdx + 1) % availableCameras.length;
    const nextDev = availableCameras[nextIdx];
    setSelectedCameraId(nextDev.deviceId);
    addLog(`Cambiando a sensor: ${nextDev.label || `Lente ${nextIdx + 1}`}`);
    await startCamera(nextDev.deviceId);
  };

  // Native Mobile Photo Trigger (Dispatches Android / iOS Native Camera App - 100% Guaranteed)
  const handleNativePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setStatusMsg('Analizando fotografía del DNI / Fotocheck...');
    setStatusType('info');
    addLog(`Foto capturada: ${file.name} (${Math.round(file.size / 1024)} KB). Decodificando...`);

    try {
      const scanner = new Html5Qrcode('file-scanner-temp-box', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
        verbose: false
      });

      const decodedText = await scanner.scanFile(file, true);
      setIsProcessingFile(false);
      addLog(`Foto decodificada con éxito: ${decodedText.slice(0, 30)}`);
      handleDecodedContent(decodedText);
    } catch (err: unknown) {
      setIsProcessingFile(false);
      console.warn('Photo scan error:', err);
      addLog(`Fallo al leer la foto: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMsg('No se detectó un código nítido. Asegúrate de enfocar con buena luz o escribe el DNI.');
      setStatusType('err');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    }
  };

  // Run diagnostics
  const handleRunDiagnostics = async () => {
    addLog('--- TEST DE DIAGNÓSTICO DE SENSORES ---');
    addLog(`Navegador: ${navigator.userAgent.slice(0, 60)}...`);
    addLog(`Protocolo HTTPS: ${window.location.protocol === 'https:' ? 'SÍ' : 'NO'}`);
    addLog(`En iFrame: ${isInIframe ? 'SÍ' : 'NO'}`);
    
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const tracks = stream.getVideoTracks();
        addLog(`✅ Sensor accesible. Pistas activas: ${tracks.length}`);
        if (tracks[0]) {
          addLog(`Pista 0: ${tracks[0].label || 'Cámara'} (Estado: ${tracks[0].readyState})`);
        }
        tracks.forEach((t) => t.stop());
        setCameraTestPassed(true);
        setStatusMsg('✅ Prueba de cámara exitosa.');
        setStatusType('ok');
        startCamera();
      } catch (e: unknown) {
        addLog(`❌ Error en test: ${e instanceof Error ? e.message : String(e)}`);
        setCameraTestPassed(false);
      }
    } else {
      addLog('❌ getUserMedia no disponible.');
      setCameraTestPassed(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDni.trim()) return;
    confirmScannedDni(manualDni.trim());
    setManualDni('');
  };

  // Auto-init on open
  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      setStatusMsg(
        mode === 'leader'
          ? '👑 Modo Líder: Apunte la cámara al fotocheck o DNI del líder.'
          : '📷 Apunte la cámara al código de barras, DNI o QR.'
      );
      setStatusType('info');
      setShowPermHelp(false);
      setShowPwaHelp(false);
      setIsStartingCamera(false);
      setManualDni('');
      setManualSearchFilter('');
      setCameraTestPassed(null);
      setDiagnosticLog([]);
      setActiveTab('live');

      addLog('Lector de escaneo abierto.');

      const timer = setTimeout(() => {
        if (isMounted) {
          startCamera();
        }
      }, 250);

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

  if (!isOpen) return null;

  const filteredTrabajadores = trabajadores.filter((t) => {
    if (!manualSearchFilter.trim()) return true;
    const q = manualSearchFilter.toLowerCase();
    return String(t.dni).includes(q) || t.nombres.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Hidden element for file scanning */}
        <div id="file-scanner-temp-box" className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#e0e0e0] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f5e9] text-[#1b5e20] flex items-center justify-center font-bold shadow-xs">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm sm:text-base text-[#1b5e20] leading-tight">
                  {mode === 'leader' ? '👑 Escanear Líder' : '📷 Escanear DNI / Fotocheck'}
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  PDF417 · QR · 128
                </span>
              </div>
              <p className="text-[11px] text-[#757575]">Compatible con DNI Azul, DNIe y Fotochecks</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full cursor-pointer transition-all ${
                soundEnabled ? 'text-[#2e7d32] bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
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

        {/* Navigation Tabs (Cámara en Vivo / Foto Celular / Manual) */}
        <div className="flex items-center gap-1.5 pt-2.5 pb-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('live');
              if (!cameraActive) startCamera();
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'live'
                ? 'bg-[#2e7d32] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Cámara en Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('native_photo');
              stopCamera();
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'native_photo'
                ? 'bg-[#2e7d32] text-white shadow-xs'
                : 'bg-emerald-50 text-[#1b5e20] border border-[#a5d6a7] hover:bg-emerald-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Foto de Celular</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              stopCamera();
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'manual'
                ? 'bg-[#2e7d32] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar DNI</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto flex-1 py-2 space-y-2.5">

          {/* TAB 1: CÁMARA EN VIVO */}
          {activeTab === 'live' && (
            <div className="space-y-2.5">
              
              {/* Visor de Cámara */}
              <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border-2 border-emerald-600/40 shadow-inner flex items-center justify-center min-h-[220px] max-h-[300px] aspect-4/3 w-full mx-auto">
                
                {/* Elemento de Video Directo */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover transition-all ${boostBrightness ? 'brightness-125 contrast-110' : ''}`}
                  style={{ display: cameraActive ? 'block' : 'none' }}
                />

                {/* Canvas de Respaldo */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Guía Visual con Escáner */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="w-[85%] h-[60%] border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_15px_rgba(46,125,50,0.5)]">
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />
                      
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#4ade80] animate-bounce my-auto mt-[38%]" />
                    </div>
                    <span className="text-[10px] text-white font-bold bg-black/70 px-2.5 py-0.5 rounded-full mt-2 backdrop-blur-xs">
                      Enfoque el DNI o Código de Barras
                    </span>
                  </div>
                )}

                {/* Estado Inactivo */}
                {!cameraActive && (
                  <div className="p-6 text-center text-white space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/30 mx-auto flex items-center justify-center text-emerald-400">
                      {isStartingCamera ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-300" />
                      ) : (
                        <Camera className="w-6 h-6" />
                      )}
                    </div>
                    <div className="font-bold text-xs">
                      {isStartingCamera ? 'Abriendo sensor de cámara...' : 'Cámara en Pausa'}
                    </div>
                  </div>
                )}

                {/* Controles Flotantes en el Visor */}
                {cameraActive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-white/20">
                    <button
                      type="button"
                      onClick={() => setBoostBrightness(!boostBrightness)}
                      className={`p-1.5 rounded-full text-xs cursor-pointer transition-all ${
                        boostBrightness ? 'bg-amber-400 text-black shadow-xs' : 'text-white hover:bg-white/20'
                      }`}
                      title={boostBrightness ? 'Brillo aumentado' : 'Aumentar brillo'}
                    >
                      <Sun className="w-4 h-4" />
                    </button>

                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-1.5 rounded-full text-xs cursor-pointer transition-all ${
                          torchOn ? 'bg-amber-400 text-black shadow-xs' : 'text-white hover:bg-white/20'
                        }`}
                        title="Encender Linterna / Flash"
                      >
                        <Flashlight className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSwitchToNextCamera}
                      className="p-1.5 rounded-full text-white hover:bg-white/20 text-xs cursor-pointer transition-all"
                      title="Cambiar de Lente / Sensor"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Botón de Solución Si la Pantalla Sale Oscura */}
              <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
                <div className="text-[11px] text-amber-900 leading-tight">
                  <span className="font-bold">¿La cámara se ve oscura o en negro?</span>
                  <p className="text-[10px] text-amber-800">
                    Tu celular tiene múltiples lentes. Toca aquí para conmutar al lente principal con luz:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchToNextCamera}
                  className="shrink-0 bg-[#ff8f00] hover:bg-[#e65100] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span>Probar Otro Lente</span>
                </button>
              </div>

              {/* Controles de Acción de Cámara */}
              <div className="grid grid-cols-2 gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={isStartingCamera}
                    className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-60"
                  >
                    {isStartingCamera ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Conectando...</span>
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
                    className="bg-[#d32f2f] hover:bg-[#b71c1c] text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <X className="w-4 h-4 shrink-0" />
                    <span>Pausar Cámara</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSwitchToNextCamera}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-300 cursor-pointer active:scale-95 transition-all"
                >
                  <SwitchCamera className="w-4 h-4 text-emerald-700" />
                  <span>Cambiar Lente ({availableCameras.length || 1})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TOMAR FOTO CON CÁMARA NATIVA DE CELULAR (100% Infalible) */}
          {activeTab === 'native_photo' && (
            <div className="space-y-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-emerald-300 mx-auto flex items-center justify-center text-[#2e7d32]">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-[#1b5e20]">Cámara Nativa del Celular</h4>
                <p className="text-xs text-gray-600 max-w-xs mx-auto">
                  Abre directamente la aplicación de cámara de tu teléfono con autoenfoque de alta resolución y flash.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all text-center">
                  {isProcessingFile ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Analizando fotografía...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span>📸 Tomar Foto al DNI / Fotocheck</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleNativePhotoCapture}
                    disabled={isProcessingFile}
                    className="hidden"
                  />
                </label>

                <label className="w-full bg-white hover:bg-emerald-50 text-[#1b5e20] border border-emerald-400 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95 transition-all text-center">
                  <ImageIcon className="w-4 h-4" />
                  <span>Subir Foto desde la Galería</span>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleNativePhotoCapture}
                    disabled={isProcessingFile}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-[11px] text-[#1b5e20] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-[#2e7d32]" />
                  <span>Ventajas de este modo:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
                  <li>No sufre problemas de permisos ni pantallas oscuras.</li>
                  <li>Permite enfocar el código de barras con zoom y flash.</li>
                  <li>Reconoce instantáneamente el DNI de 8 dígitos.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: BÚSQUEDA Y SELECCIÓN MANUAL */}
          {activeTab === 'manual' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ingresar DNI de 8 dígitos:
                </label>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="Ej: 18143553"
                    value={manualDni}
                    onChange={(e) => setManualDni(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3 py-2 text-xs border border-[#bfcaba] rounded-xl focus:outline-none focus:border-[#2e7d32] bg-white font-medium shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={!manualDni.trim()}
                    className="bg-[#2e7d32] hover:bg-[#1b5e20] disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Asignar
                  </button>
                </form>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700">
                    O busca en la nómina registrada ({filteredTrabajadores.length}):
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Filtrar por nombre o DNI..."
                  value={manualSearchFilter}
                  onChange={(e) => setManualSearchFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl mb-2 focus:outline-none focus:border-[#2e7d32]"
                />
                
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredTrabajadores.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-400">
                      No se encontraron trabajadores.
                    </div>
                  ) : (
                    filteredTrabajadores.map((t) => (
                      <button
                        key={t.dni}
                        type="button"
                        onClick={() => confirmScannedDni(t.dni)}
                        className="w-full text-left p-2 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 border border-gray-200 flex items-center justify-between transition-all cursor-pointer text-xs"
                      >
                        <div>
                          <span className="font-bold text-gray-800">{t.nombres}</span>
                          <span className="block text-[11px] text-gray-500 font-mono">DNI: {t.dni}</span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Seleccionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Banner de Estado de Lectura */}
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
            <div className="flex-1 flex items-center justify-between">
              <span className="leading-snug">{statusMsg}</span>
              {activeEngine !== 'none' && (
                <span className="text-[9px] bg-white/80 px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0">
                  {activeEngine === 'barcode_detector' ? 'Hardware AI' : 'ZXing'}
                </span>
              )}
            </div>
          </div>

          {/* Herramienta de Diagnóstico */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-[11px] font-bold text-gray-700 hover:text-[#1b5e20] flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5 text-[#2e7d32]" />
                <span>{showDiagnostics ? 'Ocultar Diagnóstico' : '🛠️ Probar Sensores de Cámara'}</span>
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
                <div className="flex flex-wrap gap-1.5 items-center text-[10px]">
                  <span className={`px-2 py-0.5 rounded font-bold ${cameraTestPassed ? 'bg-emerald-100 text-emerald-800' : cameraTestPassed === false ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700'}`}>
                    Test: {cameraTestPassed ? '✅ Aprobado' : cameraTestPassed === false ? '❌ Error' : 'Sin Ejecutar'}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-medium">
                    Sensores detectados: {availableCameras.length}
                  </span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-medium">
                    Res: {videoDimensions.width}x{videoDimensions.height}
                  </span>
                </div>

                <div className="bg-black/90 text-emerald-400 font-mono p-2 rounded-lg text-[10px] max-h-28 overflow-y-auto space-y-0.5 leading-tight">
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

        </div>

        {/* Footer */}
        <div className="border-t border-[#e0e0e0] pt-2 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold cursor-pointer transition-all active:scale-95"
          >
            Cerrar Lector
          </button>
        </div>

      </div>
    </div>
  );
};
