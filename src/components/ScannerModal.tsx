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
  Sparkles
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

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX
];

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanDni,
  trabajadores,
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

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerContainerId = 'html5-qr-reader-container';

  // Initialize and load camera devices when modal opens
  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      setStatusMsg(
        mode === 'leader'
          ? '👑 Modo Líder: Apunta la cámara al fotocheck o DNI del líder.'
          : '📷 Apunta la cámara o toma una foto del código de barras / QR del DNI.'
      );
      setStatusType('info');
      setShowPermHelp(false);
      setIsStartingCamera(false);
      setManualDni('');

      // Auto-query camera devices
      Html5Qrcode.getCameras()
        .then((cameras) => {
          if (!isMounted) return;
          if (cameras && cameras.length > 0) {
            setAvailableCameras(cameras);
            // Look for rear/environment camera
            const backCam = cameras.find(
              (c) =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('trasera') ||
                c.label.toLowerCase().includes('posterior') ||
                c.label.toLowerCase().includes('environment') ||
                c.label.toLowerCase().includes('0, facing back')
            );
            setSelectedCameraId(backCam ? backCam.id : cameras[cameras.length - 1].id);
          }
        })
        .catch(() => {
          // Normal on some mobile browsers before permission prompt
        });

      // Small delay to ensure modal DOM is mounted, then attempt auto-start
      const timer = setTimeout(() => {
        if (isMounted) {
          startCamera();
        }
      }, 350);

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
      await stopCamera();

      // Check if container element is ready in DOM
      const elem = document.getElementById(readerContainerId);
      if (!elem) {
        setIsStartingCamera(false);
        return;
      }

      setStatusMsg('Accediendo a la cámara del dispositivo...');
      setStatusType('info');

      const scanner = new Html5Qrcode(readerContainerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false
      });
      html5QrCodeRef.current = scanner;

      // Determine camera configuration
      const targetCamId = overrideCameraId || selectedCameraId;
      const cameraConfig = targetCamId ? targetCamId : { facingMode: 'environment' };

      const qrBoxDimensions = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        return {
          width: Math.floor(minEdge * 0.88),
          height: Math.floor(minEdge * 0.58)
        };
      };

      try {
        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: qrBoxDimensions,
            aspectRatio: 1.333333
          },
          (decodedText) => {
            handleDecodedContent(decodedText);
          },
          () => {
            // Ignored frame failures
          }
        );
      } catch (firstErr: unknown) {
        console.warn('First camera start attempt failed, retrying with flexible constraints:', firstErr);
        // Fallback: retry with simple facingMode 'user' or fallback constraint
        await scanner.start(
          { facingMode: 'user' },
          {
            fps: 15,
            qrbox: qrBoxDimensions,
            aspectRatio: 1.333333
          },
          (decodedText) => {
            handleDecodedContent(decodedText);
          },
          () => {}
        );
      }

      setCameraActive(true);
      setIsStartingCamera(false);
      setStatusMsg('📷 Cámara activa. Apunta hacia el código del DNI.');
      setStatusType('info');

      // Update camera devices list
      Html5Qrcode.getCameras()
        .then((cams) => {
          if (cams && cams.length > 0) {
            setAvailableCameras(cams);
          }
        })
        .catch(() => {});

      // Check if torch/flashlight is supported
      try {
        const capabilities = scanner.getRunningTrackCapabilities();
        if (capabilities && (capabilities as unknown as { torch?: boolean }).torch) {
          setHasTorch(true);
        }
      } catch {}

    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      setCameraActive(false);
      setIsStartingCamera(false);

      let msg = 'No se pudo abrir la cámara en vivo.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.toLowerCase().includes('permission') || err.message.toLowerCase().includes('denied')) {
          msg = 'Permiso de cámara bloqueado. Actívalo en los ajustes de tu navegador o usa "Tomar Foto".';
          setShowPermHelp(true);
        } else if (err.name === 'NotFoundError' || err.message.toLowerCase().includes('not found')) {
          msg = 'No se detectó cámara física. Usa "Tomar / Subir Foto" o ingresa el DNI.';
        } else if (err.name === 'NotReadableError' || err.message.toLowerCase().includes('in use')) {
          msg = 'La cámara está ocupada por otra app. Ciérrala y reintenta o usa "Tomar Foto".';
        } else {
          msg = `Aviso de cámara: ${err.message}. Puedes usar "Tomar Foto".`;
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
    } catch (err) {
      console.warn('Flashlight not available:', err);
    }
  };

  const handleSwitchCamera = async () => {
    if (availableCameras.length < 2) {
      startCamera(selectedCameraId ? undefined : 'environment');
      return;
    }

    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    setSelectedCameraId(nextCamera.id);
    await startCamera(nextCamera.id);
  };

  const handleDecodedContent = (rawCode: string) => {
    if (!rawCode) return;
    const clean = rawCode.trim();

    // Haptic feedback if supported on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }

    // Look for standard 8-digit DNI number pattern
    const dniMatch = clean.match(/\b\d{8}\b/) || clean.match(/\d{8}/);
    const extractedDni = dniMatch ? dniMatch[0] : clean.replace(/\D/g, '').slice(0, 8);

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
      onScanDni(cleanDni);
    } else {
      setStatusMsg(`⚠️ DNI ${cleanDni} leído (No está en la nómina cargada).`);
      setStatusType('warn');
      onScanDni(cleanDni);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDni.trim()) return;
    confirmScannedDni(manualDni.trim());
    setManualDni('');
  };

  // Direct Mobile Photo Trigger (Opens Native Android/iOS Camera with 100% Reliability)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setStatusMsg('Analizando fotografía del DNI...');
    setStatusType('info');

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
      handleDecodedContent(decodedText);
    } catch (err: unknown) {
      setIsProcessingFile(false);
      console.warn('Photo scan error:', err);
      setStatusMsg('No se detectó un código nítido en la imagen. Intenta con mejor luz o escribe el DNI.');
      setStatusType('err');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
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
                  Móvil & PC
                </span>
              </div>
              <p className="text-[11px] text-[#757575]">Lector óptico de códigos de barras, QR y DNI peruano</p>
            </div>
          </div>
          <button
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

        {/* Body */}
        <div className="overflow-y-auto flex-1 py-3 space-y-3">
          
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
                  {isStartingCamera ? 'Iniciando cámara del celular...' : 'Visor de Cámara Listo'}
                </div>
                <p className="text-[11px] text-white/70 max-w-xs mx-auto">
                  Toca <strong className="text-emerald-300">"Iniciar Cámara"</strong> para escanear en tiempo real o <strong className="text-emerald-300">"Tomar Foto"</strong> para abrir la app de cámara de tu teléfono.
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
                <span>¿Cómo permitir la cámara en tu celular?</span>
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-amber-900/90">
                <li>Toca el icono de <strong>Candado 🔒 o Ajustes</strong> en la barra superior de Chrome o Safari.</li>
                <li>Selecciona <strong>"Permisos del sitio"</strong> y activa <strong>Cámara</strong>.</li>
                <li>O utiliza el botón verde <strong>"Tomar Foto con Cámara"</strong> que funciona en cualquier dispositivo.</li>
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

            {/* Disparador de Cámara Nativa del Celular (100% compatible con iOS y Android) */}
            <label className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm border border-emerald-400 transition-all cursor-pointer text-center ${
              isProcessingFile
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : 'bg-[#e8f5e9] text-[#1b5e20] hover:bg-[#c8e6c9] active:scale-95'
            }`}>
              {isProcessingFile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Leyendo foto...</span>
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
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="bg-transparent flex-1 text-xs text-gray-700 outline-none cursor-pointer"
              >
                {availableCameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Cámara ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ingreso Manual de DNI y Acceso Rápido */}
          <div className="border-t border-[#e0e0e0] pt-3">
            <label className="block text-xs font-bold text-[#40493d] mb-1.5">
              O escribe el número de DNI directamente:
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
