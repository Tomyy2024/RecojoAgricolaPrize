import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Copy, 
  Check, 
  MessageSquare, 
  Globe, 
  X,
  Share,
  Cloud,
  Layers,
  Sparkles,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { getGsheetUrl } from '../utils/storage';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  onToast
}) => {
  const [copied, setCopied] = useState(false);
  const [includeCloudParam, setIncludeCloudParam] = useState(true);
  const [activeInstructionTab, setActiveInstructionTab] = useState<'netlify' | 'publicar' | 'android' | 'ios' | 'credenciales'>('netlify');

  const gUrl = getGsheetUrl();

  const getEffectiveShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (includeCloudParam && gUrl) {
      params.set('cloud', gUrl);
    }
    // Forzar login obligatorio al abrir desde enlace compartido
    params.set('shared', '1');
    params.set('login', '1');
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  };

  const currentShareUrl = getEffectiveShareUrl();

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentShareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentShareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      onToast('✅ Enlace con Sincronización en la Nube copiado', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast('⚠️ No se pudo copiar automáticamente. Copia el enlace manualmente.', 'warning');
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🚜 *Recojo de Fruta - App Móvil de Cosecha*\n\nAccede al sistema desde tu celular para registrar tus cuadrillas, avance de jabas y validación en campo (Sincronizado en tiempo real):\n👉 ${currentShareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    onToast('📲 Abriendo WhatsApp para compartir enlace...', 'info');
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    currentShareUrl
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1b5e20] to-[#2e7d32] px-5 py-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Compartir App y Sincronizar Móviles</h3>
              <p className="text-xs text-emerald-100">Enlace con auto-conexión a la Nube (Netlify, PC y Celular)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">

          {/* Banner de Sincronización en Netlify / Móvil */}
          <div className="bg-emerald-50 border-2 border-emerald-300/80 p-3.5 rounded-2xl text-emerald-950 space-y-2 shadow-xs">
            <div className="flex items-start gap-2.5">
              <Cloud className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-emerald-900 block">
                  ☁️ Sincronización en Netlify y Dispositivos Móviles
                </span>
                <p className="text-[11px] text-emerald-900/90 mt-1 leading-relaxed">
                  Al publicar en <strong>Netlify</strong>, la app sincroniza en tiempo real a través de <strong>Google Sheets</strong>. Al compartir este enlace con el parámetro de nube activado, el celular del trabajador se conectará automáticamente a la base de datos central sin que ellos tengan que configurar nada.
                </p>
              </div>
            </div>

            {/* Checkbox auto-conectar */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-emerald-900 font-bold text-[11px] bg-white/80 p-2 rounded-xl border border-emerald-200">
              <input
                type="checkbox"
                checked={includeCloudParam}
                onChange={(e) => setIncludeCloudParam(e.target.checked)}
                className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500 accent-[#2e7d32]"
              />
              <span>Auto-conectar a la Base de Datos Cloud en celulares que abran el enlace</span>
            </label>
          </div>

          {/* Card: Código QR y Enlace Directo */}
          <div className="bg-[#fcf9f8] p-4 rounded-2xl border border-[#e0e0e0] flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-xs shrink-0 flex flex-col items-center">
              <img
                src={qrImageUrl}
                alt="Código QR para abrir App Móvil"
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-lg object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] text-gray-500 font-bold mt-1.5">Escanear con la cámara</span>
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              <div>
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider block">
                  Enlace para compartir (con Nube):
                </span>
                <div className="mt-1 flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2.5 py-2 overflow-hidden shadow-2xs">
                  <Globe className="w-4 h-4 text-emerald-700 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={currentShareUrl}
                    className="w-full text-[11px] font-mono text-gray-800 bg-transparent focus:outline-none select-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-white hover:bg-gray-50 text-gray-800 border border-[#bfcaba] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#2e7d32]" /> : <Copy className="w-3.5 h-3.5 text-gray-600" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar Enlace'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="bg-[#25D366] hover:bg-[#1ebd5a] text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guía de Instalación en Celular */}
          <div className="border border-[#e0e0e0] rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="flex border-b border-[#e0e0e0] bg-[#fafafa] overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveInstructionTab('netlify')}
                className={`py-2.5 px-3 text-center font-bold text-xs transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  activeInstructionTab === 'netlify'
                    ? 'border-[#2e7d32] text-[#1b5e20] bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                ☁️ Netlify / Nube
              </button>
              <button
                type="button"
                onClick={() => setActiveInstructionTab('android')}
                className={`py-2.5 px-3 text-center font-bold text-xs transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  activeInstructionTab === 'android'
                    ? 'border-[#2e7d32] text-[#1b5e20] bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                🤖 Android
              </button>
              <button
                type="button"
                onClick={() => setActiveInstructionTab('ios')}
                className={`py-2.5 px-3 text-center font-bold text-xs transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  activeInstructionTab === 'ios'
                    ? 'border-[#2e7d32] text-[#1b5e20] bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                🍏 iPhone
              </button>
              <button
                type="button"
                onClick={() => setActiveInstructionTab('credenciales')}
                className={`py-2.5 px-3 text-center font-bold text-xs transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  activeInstructionTab === 'credenciales'
                    ? 'border-[#2e7d32] text-[#1b5e20] bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                🔑 Cuentas
              </button>
            </div>

            <div className="p-3.5">
              {activeInstructionTab === 'netlify' && (
                <div className="space-y-2.5 text-gray-700 text-xs">
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 space-y-1.5">
                    <span className="font-bold block text-emerald-950">🚀 ¿Cómo funciona en Netlify?</span>
                    <p className="text-[11px] leading-relaxed">
                      1. Cuando creas usuarios, programas o registras jabas en tu computadora, la app envía los datos a <strong>Google Sheets</strong>.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      2. Cuando tus trabajadores abren el link de Netlify en su celular, la app lee automáticamente los datos actualizados de Google Sheets.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      3. En la pestaña <strong>Conexión</strong>, asegúrate de haber pegado el código actualizado en tu Google Sheets (Extensiones &gt; Apps Script &gt; Implementar como Aplicación Web con acceso "Cualquier persona").
                    </p>
                  </div>
                </div>
              )}

              {activeInstructionTab === 'android' && (
                <div className="space-y-2 text-gray-700">
                  <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-[10px] flex items-center justify-center font-bold">1</span>
                    Abre el enlace en Google Chrome desde el celular.
                  </div>
                  <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-[10px] flex items-center justify-center font-bold">2</span>
                    Toca los tres puntos <span className="font-mono bg-gray-100 px-1 rounded">⋮</span> en la esquina superior derecha.
                  </div>
                  <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-[10px] flex items-center justify-center font-bold">3</span>
                    Selecciona <span className="font-bold text-[#1b5e20]">"Instalar aplicación"</span> o <span className="font-bold text-[#1b5e20]">"Agregar a la pantalla principal"</span>.
                  </div>
                  <div className="text-[11px] text-gray-500 bg-[#f5f5f5] p-2 rounded-lg mt-2">
                    💡 La aplicación funcionará a pantalla completa como una App nativa e incluso guardará datos sin conexión en campo.
                  </div>
                </div>
              )}

              {activeInstructionTab === 'ios' && (
                <div className="space-y-2 text-gray-700">
                  <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-[10px] flex items-center justify-center font-bold">1</span>
                    Abre el enlace en el navegador <span className="font-bold">Safari</span> de tu iPhone.
                  </div>
                  <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-[10px] flex items-center justify-center font-bold">2</span>
                    Toca el botón central de <span className="font-bold">Compartir</span> (icono del cuadrado con flecha hacia arriba ⎙).
                  </div>
                  <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-[10px] flex items-center justify-center font-bold">3</span>
                    Desliza hacia abajo y pulsa <span className="font-bold text-[#1b5e20]">"Agregar al inicio"</span>.
                  </div>
                  <div className="text-[11px] text-gray-500 bg-[#f5f5f5] p-2 rounded-lg mt-2">
                    💡 Se creará el acceso directo con el icono de Recojo de Fruta en la pantalla de inicio del iPhone.
                  </div>
                </div>
              )}

              {activeInstructionTab === 'credenciales' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-gray-600">
                    Los usuarios ingresan con sus credenciales creadas en la pestaña <strong>Usuarios</strong>:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-[#f5f5f5] p-2 rounded-lg border border-gray-200">
                      <span className="font-bold text-[#1b5e20] block">👷 Trabajador</span>
                      <span className="text-[10px] text-gray-600 block">Usuario: <code className="font-bold">trabajador1</code></span>
                      <span className="text-[10px] text-gray-600 block">Clave: <code className="font-bold">campo123</code></span>
                      <span className="text-[9px] text-[#2e7d32] mt-1 block">Acceso: Solo Personal</span>
                    </div>
                    <div className="bg-[#f5f5f5] p-2 rounded-lg border border-gray-200">
                      <span className="font-bold text-[#1b5e20] block">📋 Supervisor</span>
                      <span className="text-[10px] text-gray-600 block">Usuario: <code className="font-bold">supervisor1</code></span>
                      <span className="text-[10px] text-gray-600 block">Clave: <code className="font-bold">super123</code></span>
                      <span className="text-[9px] text-[#2e7d32] mt-1 block">Acceso: General, Ejecución, Val</span>
                    </div>
                    <div className="bg-[#f5f5f5] p-2 rounded-lg border border-gray-200">
                      <span className="font-bold text-[#1b5e20] block">👑 Admin</span>
                      <span className="text-[10px] text-gray-600 block">Usuario: <code className="font-bold">admin</code></span>
                      <span className="text-[10px] text-gray-600 block">Clave: <code className="font-bold">admin123</code></span>
                      <span className="text-[9px] text-[#2e7d32] mt-1 block">Acceso: Todo el sistema</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
