import React, { useState, useMemo } from 'react';
import { Trabajador, DetalleJaba, ValidacionSupervisor, Programa } from '../types';
import { getLocalToday, formatDateDDMMAAAA, normalizeDateString } from '../utils/storage';
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
  ArrowUpDown,
  CheckCheck
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
  const [filterStatus, setFilterStatus] = useState<'todos' | 'validados' | 'registrados' | 'pendientes'>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFundo, setSelectedFundo] = useState<string>('');
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');

  // Get distinct fundos and groups
  const fundos = useMemo(() => {
    const set = new Set<string>();
    trabajadores.forEach((t) => {
      if (t.fundo) set.add(t.fundo);
    });
    detalleJabas.forEach((d) => {
      if (d.fundo) set.add(d.fundo);
    });
    return Array.from(set).sort();
  }, [trabajadores, detalleJabas]);

  const grupos = useMemo(() => {
    const set = new Set<string>();
    trabajadores.forEach((t) => {
      if (t.grupo) set.add(t.grupo);
    });
    detalleJabas.forEach((d) => {
      if (d.grupo) set.add(d.grupo);
    });
    return Array.from(set).sort();
  }, [trabajadores, detalleJabas]);

  // Normalized selected date
  const normSelectedFecha = normalizeDateString(selectedFecha);

  // Group DetalleJabas for selected date
  const registrosDelDia = useMemo(() => {
    return detalleJabas.filter((d) => normalizeDateString(d.fecha) === normSelectedFecha);
  }, [detalleJabas, normSelectedFecha]);

  // Validaciones del día
  const validacionesDelDia = useMemo(() => {
    return validaciones.filter((v) => normalizeDateString(v.fecha) === normSelectedFecha);
  }, [validaciones, normSelectedFecha]);

  // Map of validated DNIs for this date: dni -> validation details
  const validatedDniMap = useMemo(() => {
    const map = new Map<string, { validacionId: string; supervisor: string; conforme: boolean; jabas: number }>();
    validacionesDelDia.forEach((val) => {
      if (val.items && Array.isArray(val.items)) {
        val.items.forEach((it) => {
          if (it.dni) {
            map.set(it.dni, {
              validacionId: val.id,
              supervisor: val.supervisor,
              conforme: it.conforme !== false,
              jabas: it.jabas
            });
          }
        });
      }
    });
    return map;
  }, [validacionesDelDia]);

  // Map dni -> latest registration detail for this date
  const registrosMap = useMemo(() => {
    const map = new Map<string, DetalleJaba>();
    registrosDelDia.forEach((r) => {
      if (r.dni) {
        const existing = map.get(r.dni);
        if (existing) {
          map.set(r.dni, {
            ...r,
            jabas: Number(existing.jabas || 0) + Number(r.jabas || 0)
          });
        } else {
          map.set(r.dni, { ...r, jabas: Number(r.jabas || 0) });
        }
      }
    });
    return map;
  }, [registrosDelDia]);

  // List of all workers with their status on selected date
  const workerStatusList = useMemo(() => {
    // Combine master workers and any dynamic workers in detalleJabas
    const allWorkersMap = new Map<string, Trabajador>();
    trabajadores.forEach((t) => {
      if (t.dni) allWorkersMap.set(t.dni, t);
    });
    registrosDelDia.forEach((d) => {
      if (d.dni && !allWorkersMap.has(d.dni)) {
        allWorkersMap.set(d.dni, {
          id: `T_MON_${d.dni}`,
          fecha: d.fecha || selectedFecha,
          dni: d.dni,
          nombres: d.trabajador || d.dni,
          fundo: d.fundo,
          modulo: d.modulo,
          grupo: d.grupo,
          supervisor: d.supervisor,
          lider: d.lider || 'Antony Cerron',
          tipo: 'Cosechador'
        });
      }
    });

    return Array.from(allWorkersMap.values())
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
        const val = validatedDniMap.get(t.dni);
        const isValidado = !!val;
        const isRegistrado = !isValidado && !!reg && reg.jabas > 0;
        const isPendiente = !isValidado && !isRegistrado;
        const currentJabas = val ? val.jabas : reg ? reg.jabas : 0;

        return {
          dni: t.dni,
          nombres: t.nombres,
          fundo: t.fundo || 'Santa Teresa',
          modulo: t.modulo || 'M01',
          grupo: t.grupo || 'Grupo01',
          supervisor: val?.supervisor || t.supervisor || 'Carlos Solar',
          lider: t.lider || 'Antony Cerron',
          isValidado,
          isRegistrado,
          isPendiente,
          jabas: currentJabas,
          validatedInfo: val,
          horaRegistro: reg?.timestamp
            ? new Date(reg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined
        };
      })
      .filter((item) => {
        if (filterStatus === 'validados') return item.isValidado;
        if (filterStatus === 'registrados') return item.isRegistrado;
        if (filterStatus === 'pendientes') return item.isPendiente;
        return true;
      })
      .sort((a, b) => {
        // Priority order: Validados -> Registrados -> Pendientes
        if (a.isValidado !== b.isValidado) return a.isValidado ? -1 : 1;
        if (a.isRegistrado !== b.isRegistrado) return a.isRegistrado ? -1 : 1;
        return a.nombres.localeCompare(b.nombres);
      });
  }, [trabajadores, registrosDelDia, registrosMap, validatedDniMap, selectedFundo, selectedGrupo, searchTerm, filterStatus]);

  // General counts
  const totalFiltrados = workerStatusList.length;
  const totalValidados = workerStatusList.filter((w) => w.isValidado).length;
  const totalRegistradosPendientes = workerStatusList.filter((w) => w.isRegistrado).length;
  const totalSinRegistro = workerStatusList.filter((w) => w.isPendiente).length;
  const totalJabasReportadas = workerStatusList.reduce((acc, curr) => acc + curr.jabas, 0);
  const porcentajeAvance = totalFiltrados > 0 
    ? Math.round(((totalValidados + totalRegistradosPendientes) / totalFiltrados) * 100) 
    : 0;

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
              Monitor de Estado y Validación de Registros en Vivo
            </h2>
          </div>
          <p className="text-xs text-emerald-100 max-w-xl">
            Monitorea en tiempo real qué trabajadores ya fueron validados oficialmente por supervisor, quiénes registraron jabas y quiénes faltan en campo.
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
          <span className="text-[11px] text-[#cbffc2] font-semibold">
            ({formatDateDDMMAAAA(selectedFecha)})
          </span>
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
          <div className="text-[10px] text-gray-500 mt-0.5">En cuadrilla / nómina</div>
        </div>

        <div className="bg-[#e8f5e9]/80 p-3.5 rounded-xl border border-[#a5d6a7] shadow-2xs">
          <div className="flex items-center justify-between text-[#1b5e20] mb-1">
            <span className="text-[11px] font-bold uppercase">Validados Oficial</span>
            <ShieldCheck className="w-4 h-4 text-[#2e7d32]" />
          </div>
          <div className="text-2xl font-black text-[#1b5e20]">{totalValidados}</div>
          <div className="text-[10px] text-[#2e7d32] font-semibold mt-0.5">
            Aprobados por supervisor
          </div>
        </div>

        <div className="bg-[#e3f2fd]/80 p-3.5 rounded-xl border border-[#90caf9] shadow-2xs">
          <div className="flex items-center justify-between text-[#1565c0] mb-1">
            <span className="text-[11px] font-bold uppercase">Registrados (Pendientes)</span>
            <Package className="w-4 h-4 text-[#1565c0]" />
          </div>
          <div className="text-2xl font-black text-[#1565c0]">{totalRegistradosPendientes}</div>
          <div className="text-[10px] text-[#1565c0] font-semibold mt-0.5">
            Jabas listas para validar
          </div>
        </div>

        <div className="bg-[#fff8e1]/80 p-3.5 rounded-xl border border-[#ffe082] shadow-2xs">
          <div className="flex items-center justify-between text-[#e65100] mb-1">
            <span className="text-[11px] font-bold uppercase">Sin Registro</span>
            <Clock className="w-4 h-4 text-[#ff8f00]" />
          </div>
          <div className="text-2xl font-black text-[#e65100]">{totalSinRegistro}</div>
          <div className="text-[10px] text-[#e65100] font-semibold mt-0.5">
            0 jabas cosechadas
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#e0e0e0] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex bg-[#f5f5f5] p-1 rounded-xl w-full sm:w-auto border border-gray-200 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setFilterStatus('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filterStatus === 'todos'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({totalFiltrados})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('validados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                filterStatus === 'validados'
                  ? 'bg-[#1b5e20] text-white shadow-2xs'
                  : 'text-[#1b5e20] hover:bg-emerald-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Validados ({totalValidados})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('registrados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                filterStatus === 'registrados'
                  ? 'bg-[#1565c0] text-white shadow-2xs'
                  : 'text-[#1565c0] hover:bg-blue-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Por Validar ({totalRegistradosPendientes})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pendientes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                filterStatus === 'pendientes'
                  ? 'bg-[#ff8f00] text-white shadow-2xs'
                  : 'text-[#e65100] hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Sin Registro ({totalSinRegistro})</span>
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
            Fecha: <strong className="text-gray-800">{formatDateDDMMAAAA(selectedFecha)}</strong>
          </span>
        </div>

        {workerStatusList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No se encontraron trabajadores con los filtros aplicados para la fecha seleccionada.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
            {workerStatusList.map((worker) => (
              <div
                key={worker.dni}
                className={`p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:bg-[#fcfcfc] transition-colors ${
                  worker.isValidado
                    ? 'bg-[#f4fbf5]'
                    : worker.isRegistrado
                    ? 'bg-white'
                    : 'bg-[#fffdf9]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {worker.isValidado ? (
                      <div className="w-7 h-7 rounded-full bg-[#e8f5e9] text-[#1b5e20] border border-[#a5d6a7] flex items-center justify-center font-bold" title="Validado oficialmente">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    ) : worker.isRegistrado ? (
                      <div className="w-7 h-7 rounded-full bg-[#e3f2fd] text-[#1565c0] border border-[#90caf9] flex items-center justify-center font-bold" title="Registrado en campo (Pendiente de validar)">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#fff8e1] text-[#ff8f00] border border-[#ffe082] flex items-center justify-center font-bold" title="Sin registro">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-xs sm:text-sm text-gray-900 flex items-center gap-2 flex-wrap">
                      <span>{worker.nombres}</span>
                      <span className="font-mono text-[11px] text-gray-500 font-normal">
                        DNI: {worker.dni}
                      </span>
                      {worker.isValidado && (
                        <span className="text-[10px] bg-[#e8f5e9] text-[#1b5e20] border border-[#a5d6a7] px-2 py-0.5 rounded-full font-bold">
                          ✅ Validado Oficial
                        </span>
                      )}
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
                  {worker.isValidado ? (
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] rounded-xl text-xs font-extrabold">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#2e7d32]" />
                        <span>{worker.jabas} jabas validadas</span>
                      </div>
                      <div className="text-[10px] text-[#2e7d32] mt-0.5 font-medium">
                        Por: {worker.validatedInfo?.supervisor}
                      </div>
                    </div>
                  ) : worker.isRegistrado ? (
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e3f2fd] border border-[#90caf9] text-[#1565c0] rounded-xl text-xs font-bold">
                        <Package className="w-3.5 h-3.5 text-[#1565c0]" />
                        <span>{worker.jabas} jabas</span>
                      </div>
                      <div className="text-[10px] text-amber-600 mt-0.5 font-semibold">
                        ⏳ Pendiente de validación
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#fff3e0] border border-[#ffe082] text-[#e65100] rounded-xl text-[11px] font-bold">
                      <AlertTriangle className="w-3 h-3 text-[#ff8f00]" />
                      <span>Sin registro</span>
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
            <span>Cuadrillas Validadas Oficialmente ({validacionesDelDia.length}) - {formatDateDDMMAAAA(selectedFecha)}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {validacionesDelDia.map((val) => (
              <div
                key={val.id}
                className="p-3 bg-[#f9fbf9] border border-[#c8e6c9] rounded-xl text-xs space-y-1"
              >
                <div className="flex justify-between font-bold text-gray-900">
                  <span>{val.fundo} - {val.modulo} ({val.grupo})</span>
                  <span className="text-[#2e7d32] font-extrabold">{val.jabasConformes} jabas validadas</span>
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
