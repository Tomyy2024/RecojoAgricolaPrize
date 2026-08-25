import React, { useState, useMemo } from 'react';
import { Programa, ProgramaGeneral, DetalleJaba, Trabajador, ValidacionSupervisor } from '../types';
import { getLocalToday, normalizeDateString } from '../utils/storage';
import { RegistroStatusMonitor } from './RegistroStatusMonitor';
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  Package, 
  BarChart3, 
  Calendar, 
  Filter, 
  TrendingUp, 
  Sparkles,
  Radio,
  Activity,
  CheckCircle2,
  RefreshCw,
  Award,
  TreePine,
  ShieldCheck
} from 'lucide-react';

interface DashboardTabProps {
  programas: Programa[];
  programaGeneral?: ProgramaGeneral[];
  detalleJabas: DetalleJaba[];
  trabajadores?: Trabajador[];
  validaciones?: ValidacionSupervisor[];
  onRefresh?: () => void;
  onToast?: (msg: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  programas = [],
  programaGeneral = [],
  detalleJabas = [],
  trabajadores = [],
  validaciones = [],
  onRefresh,
  onToast
}) => {
  const [viewMode, setViewMode] = useState<'metricas' | 'verificacion'>('metricas');
  const [periodo, setPeriodo] = useState<'todo' | 'hoy' | 'semana' | 'mes' | 'año'>('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const todayStr = getLocalToday();

  // Helper date checker
  const isDateInPeriod = (rawDate?: string) => {
    if (!rawDate) return periodo === 'todo' && !desde && !hasta;
    const itemDate = normalizeDateString(rawDate);
    if (!itemDate) return periodo === 'todo' && !desde && !hasta;

    const today = new Date();

    if (periodo === 'hoy') {
      if (itemDate !== todayStr) return false;
    } else if (periodo === 'semana') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (itemDate < weekAgo) return false;
    } else if (periodo === 'mes') {
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      if (itemDate < monthStart) return false;
    } else if (periodo === 'año') {
      const yearStart = `${today.getFullYear()}-01-01`;
      if (itemDate < yearStart) return false;
    }

    if (desde && itemDate < normalizeDateString(desde)) return false;
    if (hasta && itemDate > normalizeDateString(hasta)) return false;

    return true;
  };

  // Filtered collections
  const filteredProgramas = useMemo(() => {
    return programas.filter((p) => isDateInPeriod(p.fecha || p.fechaRegistro));
  }, [programas, periodo, desde, hasta]);

  const filteredProgramaGeneral = useMemo(() => {
    return programaGeneral.filter((pg) => isDateInPeriod(pg.fechaRegistro || pg.createdAt));
  }, [programaGeneral, periodo, desde, hasta]);

  const filteredDetalleJabas = useMemo(() => {
    return detalleJabas.filter((d) => isDateInPeriod(d.fecha || d.timestamp));
  }, [detalleJabas, periodo, desde, hasta]);

  const filteredValidaciones = useMemo(() => {
    return validaciones.filter((v) => isDateInPeriod(v.fecha || v.fechaRegistro));
  }, [validaciones, periodo, desde, hasta]);

  // Comprehensive Aggregations
  const metrics = useMemo(() => {
    // 1. Programas & Lotes
    let totalProgs = filteredProgramas.length + filteredProgramaGeneral.length;
    let lotesCount = 0;
    filteredProgramas.forEach((p) => {
      lotesCount += p.totalLotes || (p.lotes ? p.lotes.length : 0);
    });

    // 2. Worker Jabas vs Execution Jabas
    let jabasTareo = 0;
    let jabasEjecucionPartes = 0;
    const trabSet = new Set<string>();
    const fundoMap: Record<string, { jabas: number; tareo: number; ejecucion: number }> = {};
    const moduloMap: Record<string, number> = {};
    const grupoMap: Record<string, number> = {};

    // DetalleJabas (Field harvest tareo records)
    filteredDetalleJabas.forEach((d) => {
      const j = Number(d.jabas) || 0;
      jabasTareo += j;
      if (d.dni) trabSet.add(d.dni);

      const f = d.fundo ? d.fundo.trim() : 'Sin Fundo';
      if (!fundoMap[f]) fundoMap[f] = { jabas: 0, tareo: 0, ejecucion: 0 };
      fundoMap[f].jabas += j;
      fundoMap[f].tareo += j;

      const m = d.modulo ? d.modulo.trim() : 'Sin Módulo';
      moduloMap[m] = (moduloMap[m] || 0) + j;

      const g = d.grupo ? d.grupo.trim() : 'Sin Grupo';
      grupoMap[g] = (grupoMap[g] || 0) + j;
    });

    // Programas (Execution parts)
    filteredProgramas.forEach((p) => {
      const j = Number(p.jabas) || 0;
      jabasEjecucionPartes += j;

      const f = p.fundo ? p.fundo.trim() : 'Sin Fundo';
      if (!fundoMap[f]) fundoMap[f] = { jabas: 0, tareo: 0, ejecucion: 0 };
      fundoMap[f].ejecucion += j;

      // If no tareo was registered yet, count execution jabas for fundo chart
      if (fundoMap[f].tareo === 0) {
        fundoMap[f].jabas += j;
      }

      if (p.avance) {
        Object.entries(p.avance).forEach(([dni, count]) => {
          trabSet.add(dni);
        });
      }
    });

    // Validaciones
    let jabasValidadas = 0;
    filteredValidaciones.forEach((v) => {
      jabasValidadas += Number(v.jabasConformes) || Number(v.totalJabas) || 0;
    });

    // Grand total: if tareo records exist use jabasTareo, otherwise use jabasEjecucionPartes, or their sum if distinct
    const totalJabas = jabasTareo > 0 ? jabasTareo : jabasEjecucionPartes;

    // Fundo list sorted
    const sortedFundos = Object.entries(fundoMap)
      .map(([fundo, data]) => ({ fundo, count: data.jabas, tareo: data.tareo, ejecucion: data.ejecucion }))
      .sort((a, b) => b.count - a.count);

    // Group list sorted
    const sortedGrupos = Object.entries(grupoMap)
      .map(([grupo, count]) => ({ grupo, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalProgramas: totalProgs,
      totalLotes: lotesCount,
      totalJabas,
      jabasTareo,
      jabasEjecucionPartes,
      jabasValidadas,
      uniqueTrabajadores: trabSet.size || trabajadores.length,
      jabasByFundo: sortedFundos,
      jabasByGrupo: sortedGrupos
    };
  }, [filteredProgramas, filteredProgramaGeneral, filteredDetalleJabas, filteredValidaciones, trabajadores]);

  const maxFundoJabas = useMemo(() => {
    if (metrics.jabasByFundo.length === 0) return 1;
    return Math.max(...metrics.jabasByFundo.map((d) => d.count), 1);
  }, [metrics.jabasByFundo]);

  const barColors = ['#2e7d32', '#43a047', '#66bb6a', '#81c784', '#a5d6a7', '#1b5e20', '#388e3c', '#ff8f00'];

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
      if (onToast) onToast('🔄 Métricas del Panel actualizadas en vivo');
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & View Mode Switcher */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1b5e20] to-[#2e7d32] flex items-center justify-center text-white shadow-sm">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                Dashboard Ejecutivo
              </h1>
              <span className="text-[10px] bg-[#e8f5e9] text-[#1b5e20] font-bold px-2 py-0.5 rounded-full border border-[#a5d6a7] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d32] animate-pulse"></span>
                En Vivo
              </span>
            </div>
            <p className="text-xs text-[#757575]">
              Métricas consolidadas de ejecución, personal tareado y validaciones de campo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3 py-1.5 rounded-xl border border-[#bfcaba] hover:bg-gray-50 text-xs font-bold text-[#2e7d32] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Refrescar datos en vivo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <div className="flex items-center gap-1 bg-[#f5f5f5] p-1 rounded-xl border border-[#e0e0e0] flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setViewMode('metricas')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'metricas'
                  ? 'bg-[#2e7d32] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#1b5e20]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Métricas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('verificacion')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'verificacion'
                  ? 'bg-[#2e7d32] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#1b5e20]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Monitor Vivo</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'verificacion' ? (
        <div className="animate-in fade-in">
          <RegistroStatusMonitor
            trabajadores={trabajadores}
            detalleJabas={detalleJabas}
            validaciones={validaciones}
          />
        </div>
      ) : (
        <>
          {/* Filters Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f0f0f0] mb-3 gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#2e7d32]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#1b5e20] uppercase tracking-wider">
                  Filtros del Panel
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#757575]">
                <span>Mostrando:</span>
                <strong className="text-[#1b5e20]">
                  {periodo === 'todo' ? 'Todo el histórico' : periodo === 'hoy' ? 'Hoy' : periodo}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                  Período de Tiempo
                </label>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as 'todo' | 'hoy' | 'semana' | 'mes' | 'año')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                >
                  <option value="todo">Todo el histórico</option>
                  <option value="hoy">Hoy</option>
                  <option value="semana">Esta semana (Últimos 7 días)</option>
                  <option value="mes">Este mes</option>
                  <option value="año">Este año</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                  Desde (Opcional)
                </label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                  Hasta (Opcional)
                </label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                />
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Jabas Totales */}
            <div className="bg-gradient-to-br from-[#1b5e20] to-[#2e7d32] rounded-2xl p-4 text-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between opacity-80 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider">Jabas Cosechadas</span>
                <Package className="w-4 h-4" />
              </div>
              <div className="text-3xl sm:text-4xl font-black leading-none mb-1">
                {metrics.totalJabas.toLocaleString()}
              </div>
              <div className="text-[11px] text-green-100 flex items-center justify-between pt-1 border-t border-green-700/40">
                <span>Tareo: {metrics.jabasTareo}</span>
                <span>Partes: {metrics.jabasEjecucionPartes}</span>
              </div>
            </div>

            {/* Personal Activo */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                <span className="font-semibold text-[#40493d] uppercase tracking-wider">Personal Activo</span>
                <Users className="w-4 h-4 text-[#ff8f00]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1b5e20] leading-none mb-1">
                {metrics.uniqueTrabajadores}
              </div>
              <div className="text-[10px] text-[#757575] mt-1">
                {metrics.uniqueTrabajadores > 0 && metrics.totalJabas > 0
                  ? `Promedio: ${(metrics.totalJabas / metrics.uniqueTrabajadores).toFixed(1)} jabas/persona`
                  : 'En cuadrillas activas'}
              </div>
            </div>

            {/* Programas y Lotes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                <span className="font-semibold text-[#40493d] uppercase tracking-wider">Lotes Atendidos</span>
                <Layers className="w-4 h-4 text-[#2e7d32]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#2e7d32] leading-none mb-1">
                {metrics.totalLotes}
              </div>
              <div className="text-[10px] text-[#757575] mt-1">
                En {metrics.totalProgramas} programas de campo
              </div>
            </div>

            {/* Validaciones de Supervisores */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
                <span className="font-semibold text-[#40493d] uppercase tracking-wider">Jabas Validadas</span>
                <ShieldCheck className="w-4 h-4 text-[#2e7d32]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#ff8f00] leading-none mb-1">
                {metrics.jabasValidadas.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#757575] mt-1">
                {metrics.totalJabas > 0
                  ? `${Math.min(100, Math.round((metrics.jabasValidadas / metrics.totalJabas) * 100))}% de avance validado`
                  : 'Control de supervisión'}
              </div>
            </div>
          </div>

          {/* Jabas por Fundo Visual Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#2e7d32]" />
                <h3 className="text-sm sm:text-base font-bold text-[#1b5e20]">
                  Jabas Recolectadas por Fundo
                </h3>
              </div>
              <span className="text-xs text-[#2e7d32] font-extrabold bg-[#e8f5e9] px-2.5 py-1 rounded-full border border-[#a5d6a7]">
                Total: {metrics.totalJabas.toLocaleString()} jabas
              </span>
            </div>

            {metrics.jabasByFundo.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <TreePine className="w-8 h-8 text-gray-300" />
                <span>Sin datos de cosecha para el período seleccionado.</span>
                <span className="text-[11px] text-gray-400">Registra jabas en la pestaña de Personal o Ejecución para visualizarlas aquí.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#f9fbe7] rounded-xl p-4 border border-[#e8f5e9]">
                  <div className="flex items-end gap-3 sm:gap-6 h-48 px-2 pt-6 pb-2">
                    {metrics.jabasByFundo.map((item, idx) => {
                      const pct = Math.max((item.count / maxFundoJabas) * 100, 8);
                      const color = barColors[idx % barColors.length];
                      return (
                        <div
                          key={item.fundo}
                          className="flex-1 flex flex-col items-center h-full justify-end group"
                        >
                          {/* Bar */}
                          <div
                            style={{ height: `${pct}%`, backgroundColor: color }}
                            className="w-full max-w-[54px] rounded-t-lg transition-all duration-500 relative flex items-start justify-center group-hover:opacity-85 shadow-sm"
                            title={`${item.fundo}: ${item.count} jabas`}
                          >
                            <span className="absolute -top-5 text-[11px] font-extrabold text-[#1b5e20] whitespace-nowrap">
                              {item.count}
                            </span>
                          </div>

                          {/* Label */}
                          <div className="text-[11px] font-bold text-[#40493d] mt-2 text-center truncate max-w-full">
                            {item.fundo}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Fundos Detail Breakdown Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                  {metrics.jabasByFundo.map((f, i) => (
                    <div key={f.fundo} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: barColors[i % barColors.length] }}></span>
                        <span className="font-bold text-[#212121]">{f.fundo}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#1b5e20] text-sm">{f.count}</span>
                        <span className="text-[10px] text-gray-500 ml-1">jabas</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Group Performance Breakdown */}
          {metrics.jabasByGrupo.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#ff8f00]" />
                  <h3 className="text-xs sm:text-sm font-bold text-[#1b5e20] uppercase tracking-wider">
                    Rendimiento por Grupo / Cuadrilla
                  </h3>
                </div>
                <span className="text-[11px] text-[#757575]">
                  {metrics.jabasByGrupo.length} grupos activos
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {metrics.jabasByGrupo.map((g, idx) => (
                  <div key={g.grupo} className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
                    <span className="text-[11px] font-bold text-gray-700 block truncate">{g.grupo}</span>
                    <span className="text-xl font-extrabold text-[#1b5e20] block mt-0.5">{g.count}</span>
                    <span className="text-[10px] text-gray-500">jabas cosechadas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Programs & Field Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-[#1b5e20] uppercase tracking-wider">
                Últimos Registros de Campo
              </h3>
              <span className="text-[11px] text-[#757575]">
                Programas y partes de ejecución
              </span>
            </div>

            {filteredProgramas.length === 0 && filteredDetalleJabas.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                No hay registros aún para el período seleccionado.
              </p>
            ) : (
              <div className="divide-y divide-[#f0f0f0]">
                {filteredProgramas.slice(0, 5).map((p, idx) => (
                  <div
                    key={p.id || `prog_${idx}`}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-gray-50 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <div className="font-bold text-[#212121]">
                        {p.fundo} · Módulo {p.modulo}
                      </div>
                      <div className="text-[11px] text-[#757575]">
                        Fecha: {p.fecha} · Supervisor: {p.supervisor || 'General'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-[#e8f5e9] text-[#1b5e20] font-extrabold px-2.5 py-0.5 rounded-full border border-[#a5d6a7]">
                        {p.totalLotes || p.lotes?.length || 0} lotes
                      </span>
                      <div className="text-[10px] text-[#ff8f00] font-bold mt-0.5">
                        {p.jabas || 0} jabas
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
