import React, { useState } from 'react';
import { UserSession, DeviceViewMode } from '../types';
import { LogOut, User, Sprout, Cloud, RefreshCw, QrCode, Smartphone, Monitor, Clock, ShieldCheck, Lock, Wifi, WifiOff } from 'lucide-react';

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
  offlineNomina?: boolean;
  onToggleOfflineNomina?: () => void;
  isOnline?: boolean;
  trabajadoresCount?: number;
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
  onChangeDeviceMode,
  offlineNomina,
  onToggleOfflineNomina,
  isOnline = true,
  trabajadoresCount
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const isAdmin = session?.rol === 'Administrador';

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

          {/* Botón / Indicador de Bloquear Nómina (Disponible para Administrador y Trabajador) */}
          {onToggleOfflineNomina && (
            <button
              type="button"
              onClick={onToggleOfflineNomina}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                offlineNomina
                  ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 border border-amber-300 ring-1 ring-amber-400/40'
                  : 'bg-white/15 text-white/90 hover:bg-white/25 border border-white/20'
              }`}
              title={
                offlineNomina
                  ? 'Modo Offline Nómina ACTIVO (Nómina Bloqueada): Los trabajadores no se reinician ni re-sincronizan ante cortes de señal. Click para desbloquear.'
                  : 'Nómina Desbloqueada: Click para Bloquear Nómina en este dispositivo y evitar alteraciones de red.'
              }
            >
              {offlineNomina ? (
                <Lock className="w-3.5 h-3.5 text-amber-950" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-[#cbffc2]" />
              )}
              <span>{offlineNomina ? '🔒 Nómina Bloqueada' : 'Bloquear Nómina'}</span>
              {typeof trabajadoresCount === 'number' && trabajadoresCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                  offlineNomina ? 'bg-amber-900/30 text-amber-950' : 'bg-black/30 text-white'
                }`}>
                  {trabajadoresCount}
                </span>
              )}
            </button>
          )}

          {/* Indicador de Señal de Red */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                : 'bg-rose-500/30 text-rose-200 border border-rose-400/40 animate-pulse'
            }`}
            title={isOnline ? 'Conexión a Internet activa' : 'Sin señal de internet (Modo Offline activo)'}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-300" /> : <WifiOff className="w-3 h-3 text-rose-300" />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Sin Señal'}</span>
          </span>

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

          {isAdmin && onRefresh && (
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

