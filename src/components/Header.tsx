import React, { useState } from 'react';
import { UserSession, DeviceViewMode } from '../types';
import { LogOut, User, Sprout, Cloud, RefreshCw, QrCode, Smartphone, Monitor, Clock } from 'lucide-react';

interface HeaderProps {
  session: UserSession;
  onLogout: () => void;
  lastSync?: string | null;
  firebaseConnected?: boolean;
  autoSyncActive?: boolean;
  onRefresh?: () => Promise<void> | void;
  onOpenShareModal?: () => void;
  deviceMode?: DeviceViewMode;
  onChangeDeviceMode?: (mode: DeviceViewMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  lastSync,
  firebaseConnected,
  autoSyncActive,
  onRefresh,
  onOpenShareModal,
  deviceMode = 'pc',
  onChangeDeviceMode
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  };

  return (
    <header className="sticky top-0 z-40 shadow-md bg-gradient-to-r from-[#1b5e20] via-[#2e7d32] to-[#388e3c] text-white">
      {/* Top Session & Status Bar */}
      <div className="bg-black/25 border-b border-white/15 px-3 sm:px-4 py-1.5 flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#a5d6a7]" />
            <span className="font-semibold">{session.nombre}</span>
            <span className="text-white/60">|</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider text-[#cbffc2]">
              {session.rol}
            </span>
          </div>

          {(session.horaLogin || session.horaIngreso) && (
            <div
              className="bg-black/35 border border-white/25 px-2.5 py-0.5 rounded-lg text-[11px] font-mono text-[#cbffc2] flex items-center gap-1.5 shadow-inner"
              title={`Hora de Login al sistema: ${session.horaLogin || session.horaIngreso}`}
            >
              <Clock className="w-3.5 h-3.5 text-[#a5d6a7]" />
              <span>Login: <strong>{session.horaLogin || session.horaIngreso}</strong></span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
          {/* Selector de Modo: PC / Celular */}
          {onChangeDeviceMode && (
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/25 shadow-inner">
              <button
                type="button"
                onClick={() => onChangeDeviceMode('pc')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  deviceMode === 'pc'
                    ? 'bg-white text-[#1b5e20] shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Vista de Computadora / Escritorio (Pantalla Completa)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Modo PC</span>
                <span className="xs:hidden">PC</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeDeviceMode('celular')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  deviceMode === 'celular'
                    ? 'bg-white text-[#1b5e20] shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Vista de Teléfono Celular (Pantalla Compacta)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Modo Celular</span>
                <span className="xs:hidden">Móvil</span>
              </button>
            </div>
          )}

          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 text-[11px] bg-white/20 hover:bg-white/30 text-[#cbffc2] px-2.5 py-0.5 rounded-full transition-all active:scale-95 font-bold cursor-pointer"
              title="Compartir QR y enlace para celular"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compartir App</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={handleRefreshClick}
              disabled={refreshing}
              className="flex items-center gap-1 text-[11px] bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded-full transition-all active:scale-95 text-white font-medium cursor-pointer"
              title="Descargar y actualizar desde Google Sheets"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-[#cbffc2]' : ''}`} />
              <span className="hidden md:inline">Actualizar</span>
            </button>
          )}

          {firebaseConnected && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff8f00] text-black text-[10px] font-bold">
              🔥 Firebase
            </span>
          )}

          {autoSyncActive && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-800 text-white text-[10px] font-medium border border-emerald-500/30">
              ⚡ Auto-Sync
            </span>
          )}

          {lastSync && (
            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-white/80">
              <Cloud className="w-3 h-3 text-[#a5d6a7]" />
              {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {/* Botón de Salir Altamente Visible */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-md border border-red-300/40 transition-all active:scale-95 cursor-pointer ml-1"
            title="Cerrar sesión y salir del sistema"
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
            <span className="font-extrabold tracking-wide">Salir</span>
          </button>
        </div>
      </div>

      {/* Main Brand Title & Subtitle */}
      <div className={`px-4 py-3 sm:py-4 flex items-center justify-between mx-auto ${
        deviceMode === 'celular' ? 'max-w-md' : 'max-w-6xl'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-white/40 overflow-hidden shrink-0">
            <Sprout className="w-7 h-7 text-[#2e7d32]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-none">
                Recojo de Fruta
              </h1>
              <span className="bg-[#ff8f00] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider uppercase shadow-sm">
                v23
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/85 mt-0.5 font-medium">
              Aqu anqa Prize S.A.C. · AgroField
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-right">
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="bg-white text-[#1b5e20] hover:bg-emerald-50 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden xs:inline">Ver QR Celular</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

