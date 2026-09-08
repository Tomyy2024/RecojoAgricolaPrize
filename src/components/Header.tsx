import React, { useState } from 'react';
import { UserSession, DeviceViewMode } from '../types';
import { LogOut, User, Sprout, Cloud, RefreshCw, QrCode, Smartphone, Monitor } from 'lucide-react';

interface HeaderProps {
  session: UserSession;
  onLogout: () => void;
  lastSync?: string | null;
  autoSyncActive?: boolean;
  onRefresh?: () => Promise<void> | void;
  onOpenShareModal?: () => void;
  deviceMode?: DeviceViewMode;
  onChangeDeviceMode?: (mode: DeviceViewMode) => void;
  modoOfflineNomina?: boolean;
  totalTrabajadores?: number;
  isOnline?: boolean;
  onToggleModoOfflineNomina?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  lastSync,
  autoSyncActive,
  onRefresh,
  onOpenShareModal,
  deviceMode = 'pc',
  onChangeDeviceMode,
  modoOfflineNomina = false,
  totalTrabajadores = 0,
  isOnline = true,
  onToggleModoOfflineNomina
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
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-[#a5d6a7]" />
          <span className="font-semibold">{session.nombre}</span>
          <span className="text-white/60">|</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider text-[#cbffc2]">
            {session.rol}
          </span>
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

          {/* Estado de Señal / Conexión */}
          {isOnline ? (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 text-[#cbffc2] text-[10px] font-bold border border-emerald-400/30"
              title="Dispositivo conectado a internet"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Online</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold shadow-sm animate-bounce border border-red-300"
              title="Dispositivo sin conexión a internet - Operando en modo fuera de línea"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>Sin Señal</span>
            </span>
          )}

          {/* Control interactivo de Modo Offline para Trabajadores */}
          {onToggleModoOfflineNomina && (
            <button
              type="button"
              onClick={onToggleModoOfflineNomina}
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer shadow-xs ${
                modoOfflineNomina
                  ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 ring-1 ring-amber-200'
                  : 'bg-white/15 hover:bg-white/25 text-white/90'
              }`}
              title={
                modoOfflineNomina
                  ? `🔒 Modo Offline Nómina Activo: ${totalTrabajadores} trabajadores asegurados en el dispositivo contra cortes de señal. Clic para desbloquear.`
                  : `🔓 Modo Online Nómina: Sincronización abierta. Clic para activar Modo Offline y blindar la lista de trabajadores.`
              }
            >
              <span>{modoOfflineNomina ? '🔒 Nómina Offline' : '🔓 Nómina Online'}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  modoOfflineNomina ? 'bg-amber-950 text-white' : 'bg-white/25 text-white'
                }`}
              >
                {totalTrabajadores}
              </span>
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

