import React, { useState } from 'react';
import { Trabajador } from '../types';
import { Trash2, Package, AlertTriangle, ShieldCheck, Check, X, Loader2, Calendar } from 'lucide-react';

interface EliminarPersonalConJabasModalProps {
  isOpen: boolean;
  onClose: () => void;
  modo: 'individual' | 'masivo' | 'seleccionados';
  worker?: Trabajador;
  targetWorkersCount: number;
  jabasTotalCount: number;
  fechaPersonal: string;
  loading: boolean;
  onConfirm: (tipoAccion: 'solo_jabas' | 'eliminar_nomina_y_jabas', todasFechas: boolean) => Promise<void>;
}

export const EliminarPersonalConJabasModal: React.FC<EliminarPersonalConJabasModalProps> = ({
  isOpen,
  onClose,
  modo,
  worker,
  targetWorkersCount,
  jabasTotalCount,
  fechaPersonal,
  loading,
  onConfirm
}) => {
  const [tipoAccion, setTipoAccion] = useState<'solo_jabas' | 'eliminar_nomina_y_jabas'>('solo_jabas');
  const [todasFechas, setTodasFechas] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExecute = async () => {
    await onConfirm(tipoAccion, todasFechas);
  };

  return (
    <div
      id="modal-eliminar-personal-con-jabas"
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-rose-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner shrink-0">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">
                  {modo === 'individual'
                    ? 'Eliminar Personal con Jabas'
                    : modo === 'seleccionados'
                    ? 'Eliminar Jabas de Personal Seleccionado'
                    : 'Eliminar Personal con Jabas (Masivo)'}
                </h3>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-red-100">
                Opción de control exclusivo para Administrador General
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition-colors disabled:opacity-50"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Resumen del Personal / Casos a procesar */}
          {modo === 'individual' && worker ? (
            <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-red-700 block tracking-wider">
                    Trabajador Seleccionado
                  </span>
                  <div className="font-extrabold text-sm sm:text-base text-gray-900 leading-snug">
                    {worker.nombres}
                  </div>
                  <div className="text-xs text-gray-600 font-mono mt-0.5">
                    DNI / Fotocheck: <b className="text-gray-900">{worker.dni}</b>
                  </div>
                </div>
                <div className="bg-white border border-red-300 rounded-xl px-3 py-1.5 text-center shadow-xs shrink-0">
                  <div className="text-base sm:text-lg font-black text-red-700 leading-none">
                    {jabasTotalCount}
                  </div>
                  <div className="text-[9px] uppercase font-bold text-gray-500 mt-0.5">
                    {jabasTotalCount === 1 ? 'Jaba' : 'Jabas'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-red-200/80 text-[11px] text-gray-700">
                <div>
                  <span className="text-gray-500 block">Supervisor:</span>
                  <b className="text-gray-800">{worker.supervisor || 'No especificado'}</b>
                </div>
                <div>
                  <span className="text-gray-500 block">Fundo / Módulo:</span>
                  <b className="text-gray-800">
                    {worker.fundo || 'Arena Azul'} · {worker.modulo || 'M01'}
                  </b>
                </div>
                {worker.grupo && (
                  <div>
                    <span className="text-gray-500 block">Grupo:</span>
                    <b className="text-gray-800">{worker.grupo}</b>
                  </div>
                )}
                {worker.lider && (
                  <div>
                    <span className="text-gray-500 block">Líder:</span>
                    <b className="text-gray-800">{worker.lider}</b>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-red-700 block tracking-wider">
                  {modo === 'seleccionados' ? 'Selección Múltiple' : 'Total con Jabas en el Sistema'}
                </span>
                <div className="text-sm sm:text-base font-extrabold text-gray-900">
                  {targetWorkersCount} {targetWorkersCount === 1 ? 'trabajador con jabas' : 'trabajadores con jabas'}
                </div>
                <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>Fecha activa: <b>{fechaPersonal}</b></span>
                </div>
              </div>
              <div className="bg-white border border-red-300 rounded-xl px-3.5 py-1.5 text-center shadow-xs shrink-0">
                <div className="text-lg sm:text-xl font-black text-red-700 leading-none">
                  {jabasTotalCount}
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-500 mt-0.5">
                  Total Jabas
                </div>
              </div>
            </div>
          )}

          {/* Opciones de Eliminación */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
              ¿Qué acción deseas ejecutar?
            </label>

            {/* Opción 1: Solo Eliminar Jabas */}
            <div
              onClick={() => !loading && setTipoAccion('solo_jabas')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                tipoAccion === 'solo_jabas'
                  ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  tipoAccion === 'solo_jabas' ? 'border-amber-600 bg-amber-600 text-white' : 'border-gray-300'
                }`}
              >
                {tipoAccion === 'solo_jabas' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-xs sm:text-sm text-gray-900">
                    Solo eliminar registros de jabas asignadas
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 leading-normal">
                  Borra el avance de jabas en <b>Registro_Avance</b> y resetea las jabas del trabajador a 0.
                  El trabajador <b>permanecerá en la nómina</b> como disponible / pendiente para que pueda
                  continuar trabajando o ser reasignado.
                </p>
              </div>
            </div>

            {/* Opción 2: Eliminar Trabajador de Nómina y Jabas */}
            <div
              onClick={() => !loading && setTipoAccion('eliminar_nomina_y_jabas')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                tipoAccion === 'eliminar_nomina_y_jabas'
                  ? 'border-red-600 bg-red-50/70 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  tipoAccion === 'eliminar_nomina_y_jabas' ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300'
                }`}
              >
                {tipoAccion === 'eliminar_nomina_y_jabas' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span className="font-bold text-xs sm:text-sm text-red-950">
                    Eliminar personal de la nómina y todas sus jabas
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 leading-normal">
                  Elimina al trabajador de forma <b>definitiva de la nómina activa</b> del sistema, borra todas
                  sus reservas y todos sus registros de jabas asignadas.
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Alcance de Fechas */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={todasFechas}
                onChange={(e) => setTodasFechas(e.target.checked)}
                disabled={loading}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
              />
              <div className="text-xs text-gray-700">
                <span className="font-bold block text-gray-900">
                  Aplicar a todas las fechas históricas
                </span>
                <span className="text-[11px] text-gray-500">
                  Por defecto sólo se procesan registros de la fecha activa: <b>{fechaPersonal}</b>.
                </span>
              </div>
            </label>
          </div>

          {/* Advertencia */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <b>Sincronización en tiempo real:</b> La eliminación se actualizará en la base de datos central,
              se sincronizará en Google Sheets (hoja Registro_Avance / Nómina) y en Cloud Firestore.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading || targetWorkersCount === 0}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando eliminación...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>
                  {tipoAccion === 'eliminar_nomina_y_jabas'
                    ? 'Confirmar Eliminación Completa'
                    : 'Confirmar Eliminación de Jabas'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
