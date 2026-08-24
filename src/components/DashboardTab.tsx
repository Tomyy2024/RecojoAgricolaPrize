import React, { useState, useMemo } from 'react';
import { Programa, DetalleJaba, Trabajador, ValidacionSupervisor } from '../types';
import { getLocalToday } from '../utils/storage';
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
  Activity
} from 'lucide-react';

interface DashboardTabProps {
  programas: Programa[];
  detalleJabas: DetalleJaba[];
  trabajadores?: Trabajador[];
  validaciones?: ValidacionSupervisor[];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  programas,
  detalleJabas,
  trabajadores = [],
  validaciones = []
}) => {
  const [viewMode, setViewMode] = useState<'metricas' | 'verificacion'>('metricas');
  const [periodo, setPeriodo] = useState<'todo' | 'hoy' | 'semana' | 'mes' | 'año'>('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const todayStr = getLocalToday();

  // Filter programs based on date/period
  const filteredProgramas = useMemo(() => {
    const today = new Date();
    return programas.filter((p) => {
      const pDate = p.fecha ? p.fecha.slice(0, 10) : '';

      if (periodo === 'hoy' && pDate !== todayStr) return false;
      if (periodo === 'semana') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (pDate < weekAgo || pDate > todayStr) return false;
      }
      if (periodo === 'mes') {
        const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        if (pDate < monthStart || pDate > todayStr) return false;
      }
      if (periodo === 'año') {
        const yearStart = `${today.getFullYear()}-01-01`;
        if (pDate < yearStart || pDate > todayStr) return false;
      }

      if (desde && pDate < desde) return false;
      if (hasta && pDate > hasta) return false;

      return true;
    });
  }, [programas, periodo, desde, hasta, todayStr]);

  // Aggregate metrics
  const { totalProgramas, totalLotes, totalJabas, uniqueTrabajadores, jabasByFundo } = useMemo(() => {
    let progs = filteredProgramas.length;
    let lotes = 0;
    let jabas = 0;
    const trabSet = new Set<string>();
    const fundoMap: Record<string, number> = {};

    filteredProgramas.forEach((p) => {
      lotes += p.totalLotes || (p.lotes ? p.lotes.length : 0);
      const progJabas = Number(p.jabas) || 0;
      jabas += progJabas;

      const f = p.fundo || 'Sin fundo';
      fundoMap[f] = (fundoMap[f] || 0) + progJabas;

      if (p.avance) {
        Object.entries(p.avance).forEach(([dni, count]) => {
          trabSet.add(dni);
          jabas += Number(count) || 0;
          fundoMap[f] = (fundoMap[f] || 0) + (Number(count) || 0);
        });
      }
    });

    // Also factor in standalone DetalleJabas within period
    detalleJabas.forEach((d) => {
      const dDate = d.fecha ? d.fecha.slice(0, 10) : '';
      let include = true;
      if (desde && dDate < desde) include = false;
      if (hasta && dDate > hasta) include = false;

      if (include) {
        trabSet.add(d.dni);
        const f = d.fundo || 'Arena Azul';
        // avoid double counting if already in p.avance
      }
    });

    const sortedFundos = Object.entries(fundoMap)
      .map(([fundo, count]) => ({ fundo, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalProgramas: progs,
      totalLotes: lotes,
      totalJabas: jabas,
      uniqueTrabajadores: trabSet.size,
      jabasByFundo: sortedFundos
    };
  }, [filteredProgramas, detalleJabas, desde, hasta]);

  const maxFundoJabas = useMemo(() => {
    if (jabasByFundo.length === 0) return 1;
    return Math.max(...jabasByFundo.map((d) => d.count), 1);
  }, [jabasByFundo]);

  const barColors = ['#2e7d32', '#43a047', '#66bb6a', '#81c784', '#a5d6a7', '#1b5e20', '#388e3c', '#ff8f00'];

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
              <span className="text-[10px] bg-[#e8f5e9] text-[#1b5e20] font-bold px-2 py-0.5 rounded-full border border-[#a5d6a7]">
                Control Integral
              </span>
            </div>
            <p className="text-xs text-[#757575]">
              Métricas consolidadas, avance de cosecha y verificación de registros en vivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#f5f5f5] p-1 rounded-xl border border-[#e0e0e0] self-stretch sm:self-auto">
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
            <span>Métricas y Gráficos</span>
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
            <span>Verificación en Vivo</span>
          </button>
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
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2e7d32]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#1b5e20] uppercase tracking-wider">
              Filtros del Panel
            </h3>
          </div>
          <span className="text-[11px] text-[#757575]">
            Datos consolidados de campo
          </span>
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
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="año">Este año</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
              Desde
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
              Hasta
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center hover:shadow-md transition-shadow">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1b5e20] leading-none mb-1">
            {totalProgramas}
          </div>
          <div className="text-xs font-semibold text-[#40493d]">Programas</div>
          <div className="text-[10px] text-[#757575] mt-0.5">Ejecutados</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center hover:shadow-md transition-shadow">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#2e7d32] leading-none mb-1">
            {totalLotes}
          </div>
          <div className="text-xs font-semibold text-[#40493d]">Lotes</div>
          <div className="text-[10px] text-[#757575] mt-0.5">Cosechados</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center hover:shadow-md transition-shadow">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#ff8f00] leading-none mb-1">
            {uniqueTrabajadores}
          </div>
          <div className="text-xs font-semibold text-[#40493d]">Personal Activo</div>
          <div className="text-[10px] text-[#757575] mt-0.5">En tareo</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center hover:shadow-md transition-shadow">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#e65100] leading-none mb-1">
            {totalJabas.toLocaleString()}
          </div>
          <div className="text-xs font-semibold text-[#40493d]">Jabas Totales</div>
          <div className="text-[10px] text-[#757575] mt-0.5">Recolectadas</div>
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
          <span className="text-xs text-[#ff8f00] font-bold">
            Total: {totalJabas} jabas
          </span>
        </div>

        {jabasByFundo.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            Sin datos de cosecha para el período seleccionado.
          </div>
        ) : (
          <div className="bg-[#f9fbe7] rounded-xl p-4 border border-[#e8f5e9]">
            {/* Custom Interactive HTML Bar Chart */}
            <div className="flex items-end gap-3 sm:gap-6 h-48 px-2 pt-6 pb-2">
              {jabasByFundo.map((item, idx) => {
                const pct = Math.max((item.count / maxFundoJabas) * 100, 6);
                const color = barColors[idx % barColors.length];
                return (
                  <div
                    key={item.fundo}
                    className="flex-1 flex flex-col items-center h-full justify-end group"
                  >
                    {/* Bar */}
                    <div
                      style={{ height: `${pct}%`, backgroundColor: color }}
                      className="w-full max-w-[48px] rounded-t-lg transition-all duration-500 relative flex items-start justify-center group-hover:opacity-85 shadow-sm"
                      title={`${item.fundo}: ${item.count} jabas`}
                    >
                      <span className="absolute -top-5 text-[11px] font-extrabold text-[#1b5e20] whitespace-nowrap">
                        {item.count}
                      </span>
                    </div>

                    {/* Label */}
                    <div className="text-[11px] font-semibold text-[#40493d] mt-2 text-center truncate max-w-full">
                      {item.fundo.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Programs Log */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
        <h3 className="text-xs sm:text-sm font-bold text-[#1b5e20] uppercase tracking-wider mb-3">
          Últimos Programas Registrados
        </h3>

        {filteredProgramas.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            No hay programas registrados aún.
          </p>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {filteredProgramas.slice(0, 5).map((p, idx) => (
              <div
                key={p.id || idx}
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
