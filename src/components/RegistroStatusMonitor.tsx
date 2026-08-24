import React, { useState, useMemo } from 'react';
import { Trabajador, DetalleJaba, ValidacionSupervisor, Programa } from '../types';
import { getLocalToday } from '../utils/storage';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  Search, 
  Filter, 
  Calendar, 
  Package, 
  Bell, 
  Radio, 
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

interface RegistroStatusMonitorProps {
  trabajadores: Trabajador[];
  detalleJabas: DetalleJaba[];
  validaciones: ValidacionSupervisor[];
  programas?: Programa[];
  onSelectTrabajador?: (dni: string) => void;
}

export const RegistroStatusMonitor: React.FC<RegistroStatusMonitorProps> = ({
  trabajadores,
  detalleJabas,
  validaciones,
  programas = [],
  onSelectTrabajador
}) => {
  const [selectedFecha, setSelectedFecha] = useState<string>(getLocalToday());
  const [filterStatus, setFilterStatus] = useState<'todos' | 'registrados' | 'pendientes'>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFundo, setSelectedFundo] = useState<string>('');
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');

  // Get distinct fundos and groups
  const fundos = useMemo(() => {
    const set = new Set<string>();
    trabajadores.forEach((t) => {
      if (t.fundo) set.add(t.fundo);
    });
    return Array.from(set).sort();
  }, [trabajadores]);

  const grupos = useMemo(() => {
    const set = new Set<string>();
    trabajadores.forEach((t) => {
      if (t.grupo) set.add(t.grupo);
    });
    return Array.from(set).sort();
  }, [trabajadores]);

  // Group DetalleJabas for selected date
  const registrosDelDia = useMemo(() => {
    return detalleJabas.filter((d) => d.fecha === selectedFecha);
  }, [detalleJabas, selectedFecha]);

  // Map dni -> latest registration detail
  const registrosMap = useMemo(() => {
    const map = new Map<string, DetalleJaba>();
    registrosDelDia.forEach((r) => {
      map.set(r.dni, r);
    });
    return map;
  }, [registrosDelDia]);

  // List of all workers with their status
  const workerStatusList = useMemo(() => {
    return trabajadores
      .filter((t) => {
        if (selectedFundo && t.fundo !== selectedFundo) return false;
        if (selectedGrupo && t.grupo !== selectedGrupo) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matchDni = t.dni.includes(s);
          const matchNombre = t.nombres.toLowerCase().includes(s);
          const matchSupervisor = (t.supervisor || '').toLowerCase().includes(s);
          if (!matchDni && !matchNombre && !matchSupervisor) return false;
        }
        return true;
      })
      .map((t) => {
        const reg = registrosMap.get(t.dni);
        const isRegistrado = !!reg && reg.jabas > 0;
        return {
          dni: t.dni,
          nombres: t.nombres,
          fundo: t.fundo || 'Santa Teresa',
          modulo: t.modulo || 'M01',
          grupo: t.grupo || 'Grupo01',
          supervisor: t.supervisor || 'Carlos Solar',
          lider: t.lider || 'Antony Cerron',
          isRegistrado,
          jabas: reg ? reg.jabas : 0,
          horaRegistro: reg?.timestamp
            ? new Date(reg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined
        };
      })
      .filter((item) => {
        if (filterStatus === 'registrados') return item.isRegistrado;
        if (filterStatus === 'pendientes') return !item.isRegistrado;
        return true;
      })
      .sort((a, b) => {
        if (a.isRegistrado !== b.isRegistrado) {
          return a.isRegistrado ? -1 : 1; // Registered first
        }
        return a.nombres.localeCompare(b.nombres);
      });
  }, [trabajadores, registrosMap, selectedFundo, selectedGrupo, searchTerm, filterStatus]);

  // General counts
  const totalFiltrados = workerStatusList.length;
  const totalRegistrados = workerStatusList.filter((w) => w.isRegistrado).length;
  const totalPendientes = totalFiltrados - totalRegistrados;
  const totalJabasReportadas = workerStatusList.reduce((acc, curr) => acc + curr.jabas, 0);
  const porcentajeCumplimiento = totalFiltrados > 0 ? Math.round((totalRegistrados / totalFiltrados) * 100) : 0;

  // Validaciones del día
  const validacionesDelDia = useMemo(() => {
    return validaciones.filter((v) => v.fecha === selectedFecha);
  }, [validaciones, selectedFecha]);

  return (
    <div className="space-y-4">
      {/* Top Notification Banner / Live Status Header */}
      <div className="bg-gradient-to-r from-[#1b5e20] to-[#2e7d32] rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 text-white">
              <Radio className="w-4 h-4 animate-pulse text-[#cbffc2]" />
            </span>
            <h2 className="text-base sm:text-lg font-bold">
              Monitor de Verificación de Registros en Vivo
            </h2>
          </div>
          <p className="text-xs text-emerald-100 max-w-xl">
            Verifica al instante qué trabajadores ya registraron sus jabas y quiénes siguen pendientes en campo para la fecha seleccionada.
          </p>
        </div>

        {/* Date Quick Selector */}
        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-emerald-200 ml-1" />
          <input
            type="date"
            value={selectedFecha}
            onChange={(e) => setSelectedFecha(e.target.value)}
            className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
          />
          {selectedFecha !== getLocalToday() && (
            <button
              onClick={() => setSelectedFecha(getLocalToday())}
              className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md font-bold text-[#cbffc2] cursor-pointer"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-xl border border-[#e0e0e0] shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Personal Total</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-black text-[#212121]">{totalFiltrados}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">En la cuadrilla/filtro</div>
        </div>

        <div className="bg-[#e8f5e9]/70 p-3.5 rounded-xl border border-[#a5d6a7] shadow-2xs">
          <div className="flex items-center justify-between text-[#1b5e20] mb-1">
            <span className="text-[11px] font-bold uppercase">Registrados Hoy</span>
            <CheckCircle2 className="w-4 h-4 text-[#2e7d32]" />
          </div>
          <div className="text-2xl font-black text-[#1b5e20]">{totalRegistrados}</div>
          <div className="text-[10px] text-[#2e7d32] font-semibold mt-0.5">
            {porcentajeCumplimiento}% del total
          </div>
        </div>

        <div className="bg-[#fff8e1]/70 p-3.5 rounded-xl border border-[#ffe082] shadow-2xs">
          <div className="flex items-center justify-between text-[#e65100] mb-1">
            <span className="text-[11px] font-bold uppercase">Pendientes</span>
            <Clock className="w-4 h-4 text-[#ff8f00]" />
          </div>
          <div className="text-2xl font-black text-[#e65100]">{totalPendientes}</div>
          <div className="text-[10px] text-[#e65100] font-semibold mt-0.5">
            Falta registrar avance
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e0e0e0] shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Jabas Reportadas</span>
            <Package className="w-4 h-4 text-[#2e7d32]" />
          </div>
          <div className="text-2xl font-black text-[#1b5e20]">{totalJabasReportadas}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {validacionesDelDia.length > 0 ? `${validacionesDelDia.length} cuadrilla(s) validada(s)` : 'Sin validar'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex bg-[#f5f5f5] p-1 rounded-xl w-full sm:w-auto border border-gray-200">
            <button
              type="button"
              onClick={() => setFilterStatus('todos')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filterStatus === 'todos'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({totalFiltrados})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('registrados')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                filterStatus === 'registrados'
                  ? 'bg-[#2e7d32] text-white shadow-2xs'
                  : 'text-[#1b5e20] hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Registrados ({totalRegistrados})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pendientes')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                filterStatus === 'pendientes'
                  ? 'bg-[#ff8f00] text-white shadow-2xs'
                  : 'text-[#e65100] hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendientes ({totalPendientes})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por DNI o Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#2e7d32]"
            />
          </div>
        </div>

        {/* Secondary dropdown filters */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 text-xs">
          <select
            value={selectedFundo}
            onChange={(e) => setSelectedFundo(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="">Todos los Fundos</option>
            {fundos.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={selectedGrupo}
            onChange={(e) => setSelectedGrupo(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="">Todos los Grupos</option>
            {grupos.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Worker Status Verification Table */}
      <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-[#fafafa] border-b border-gray-200 flex justify-between items-center text-xs">
          <span className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
            Listado de Personal ({workerStatusList.length} trabajadores)
          </span>
          <span className="text-gray-500 text-[11px]">
            Fecha: <strong className="text-gray-800">{selectedFecha}</strong>
          </span>
        </div>

        {workerStatusList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No se encontraron trabajadores con los filtros aplicados.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
            {workerStatusList.map((worker) => (
              <div
                key={worker.dni}
                className={`p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:bg-[#fcfcfc] transition-colors ${
                  worker.isRegistrado ? 'bg-white' : 'bg-[#fffdf9]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {worker.isRegistrado ? (
                      <div className="w-7 h-7 rounded-full bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#fff8e1] text-[#ff8f00] flex items-center justify-center font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-2">
                      <span>{worker.nombres}</span>
                      <span className="font-mono text-[11px] text-gray-500 font-normal">
                        DNI: {worker.dni}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                      <span>Fundo: <strong className="text-gray-700">{worker.fundo}</strong></span>
                      <span>·</span>
                      <span>Mód: <strong className="text-gray-700">{worker.modulo}</strong></span>
                      <span>·</span>
                      <span>Grupo: <strong className="text-gray-700">{worker.grupo}</strong></span>
                      <span>·</span>
                      <span>Sup: {worker.supervisor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {worker.isRegistrado ? (
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] rounded-xl text-xs font-bold">
                        <Package className="w-3.5 h-3.5 text-[#2e7d32]" />
                        <span>{worker.jabas} jabas</span>
                      </div>
                      {worker.horaRegistro && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Hora: {worker.horaRegistro}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#fff3e0] border border-[#ffe082] text-[#e65100] rounded-xl text-[11px] font-bold">
                      <AlertTriangle className="w-3 h-3 text-[#ff8f00]" />
                      <span>Pendiente</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity / Validation Timeline */}
      {validacionesDelDia.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0] shadow-2xs space-y-2.5">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2e7d32]" />
            <span>Cuadrillas Validadas Oficialmente Hoy ({validacionesDelDia.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {validacionesDelDia.map((val) => (
              <div
                key={val.id}
                className="p-3 bg-[#f9fbf9] border border-[#c8e6c9] rounded-xl text-xs space-y-1"
              >
                <div className="flex justify-between font-bold text-gray-900">
                  <span>{val.fundo} - {val.modulo} ({val.grupo})</span>
                  <span className="text-[#2e7d32]">{val.jabasConformes} jabas</span>
                </div>
                <div className="text-[11px] text-gray-600 flex justify-between">
                  <span>Supervisor: {val.supervisor}</span>
                  <span className="text-emerald-700 font-semibold">{val.trabajadoresConformes}/{val.totalTrabajadores} conformes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
