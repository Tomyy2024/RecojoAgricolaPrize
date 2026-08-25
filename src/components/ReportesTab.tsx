import React, { useState, useMemo } from 'react';
import { Programa, ProgramaGeneral, DetalleJaba, Trabajador, ValidacionSupervisor } from '../types';
import { exportToExcelFile, exportToCsvFile, ExportTableData } from '../utils/exportUtils';
import { getLocalToday, normalizeDateString } from '../utils/storage';
import { 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Filter, 
  FileText, 
  BarChart3, 
  Sparkles, 
  Calendar,
  RefreshCw,
  Award,
  Package,
  Layers,
  Users,
  ShieldCheck
} from 'lucide-react';

interface ReportesTabProps {
  programas: Programa[];
  programaGeneral?: ProgramaGeneral[];
  detalleJabas: DetalleJaba[];
  trabajadores: Trabajador[];
  validaciones?: ValidacionSupervisor[];
  onRefresh?: () => void;
  onToast: (msg: string) => void;
}

export const ReportesTab: React.FC<ReportesTabProps> = ({
  programas = [],
  programaGeneral = [],
  detalleJabas = [],
  trabajadores = [],
  validaciones = [],
  onRefresh,
  onToast
}) => {
  const today = getLocalToday();

  const [periodo, setPeriodo] = useState<'todo' | 'hoy' | 'semana' | 'mes'>('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: false,
    sec3: false,
    sec4: true,
    sec5: true,
    sec6: true,
    sec7: false
  });

  const toggleSection = (secId: string) => {
    setOpenSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  // Helper date filter
  const isDateInPeriod = (rawDate?: string) => {
    if (!rawDate) return periodo === 'todo' && !desde && !hasta;
    const itemDate = normalizeDateString(rawDate);
    if (!itemDate) return periodo === 'todo' && !desde && !hasta;

    const currDate = new Date();

    if (periodo === 'hoy') {
      if (itemDate !== today) return false;
    } else if (periodo === 'semana') {
      const weekAgo = new Date(currDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (itemDate < weekAgo) return false;
    } else if (periodo === 'mes') {
      const monthStart = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, '0')}-01`;
      if (itemDate < monthStart) return false;
    }

    if (desde && itemDate < normalizeDateString(desde)) return false;
    if (hasta && itemDate > normalizeDateString(hasta)) return false;

    return true;
  };

  // Filtered datasets
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

  // Section 1: Fundo y Módulos Programados y Ejecutados
  const sec1Data = useMemo(() => {
    const map: Record<string, { fundo: string; modulo: string; jabas: number; programas: number; lotes: number; personal: number }> = {};
    let totalJabas = 0;
    let totalProgs = 0;
    let totalLotes = 0;

    // From Programas (Execution parts)
    filteredProgramas.forEach((p) => {
      const f = p.fundo ? p.fundo.trim() : 'Sin Fundo';
      const m = p.modulo ? p.modulo.trim() : 'Sin Módulo';
      const key = `${f}|${m}`;
      if (!map[key]) {
        map[key] = { fundo: f, modulo: m, jabas: 0, programas: 0, lotes: 0, personal: 0 };
      }
      const j = Number(p.jabas) || 0;
      const l = p.totalLotes || (p.lotes ? p.lotes.length : 0);
      map[key].jabas += j;
      map[key].programas += 1;
      map[key].lotes += l;

      totalJabas += j;
      totalProgs += 1;
      totalLotes += l;
    });

    // From DetalleJabas (Field harvest tareo)
    filteredDetalleJabas.forEach((d) => {
      const f = d.fundo ? d.fundo.trim() : 'Sin Fundo';
      const m = d.modulo ? d.modulo.trim() : 'Sin Módulo';
      const key = `${f}|${m}`;
      if (!map[key]) {
        map[key] = { fundo: f, modulo: m, jabas: 0, programas: 0, lotes: 0, personal: 0 };
      }
      // If no execution parts exist for this fundo/modulo, add field jabas
      if (map[key].programas === 0) {
        map[key].jabas += Number(d.jabas) || 0;
        totalJabas += Number(d.jabas) || 0;
      }
      map[key].personal += 1;
    });

    const sorted = Object.values(map).sort((a, b) => b.jabas - a.jabas || a.fundo.localeCompare(b.fundo));
    return { list: sorted, totalJabas, totalProgs, totalLotes };
  }, [filteredProgramas, filteredDetalleJabas]);

  // Section 2: Fundo y Módulos Turnos y Lotes Ejecutados
  const sec2Data = useMemo(() => {
    const map: Record<string, { fundo: string; modulo: string; turno: string; lote: string; count: number }> = {};
    filteredProgramas.forEach((p) => {
      if (p.lotes) {
        p.lotes.forEach((l) => {
          const key = `${p.fundo}|${p.modulo}|${l.turno}|${l.lote}`;
          if (!map[key]) {
            map[key] = { fundo: p.fundo, modulo: p.modulo, turno: l.turno, lote: l.lote, count: 0 };
          }
          map[key].count += 1;
        });
      }
    });

    return Object.values(map).sort(
      (a, b) =>
        a.fundo.localeCompare(b.fundo) ||
        a.modulo.localeCompare(b.modulo) ||
        a.turno.localeCompare(b.turno) ||
        a.lote.localeCompare(b.lote)
    );
  }, [filteredProgramas]);

  // Section 3: Trabajadores Totales en Nómina Activa
  const sec3Data = useMemo(() => {
    const map: Record<string, { dni: string; nombres: string; fundo: string; modulo: string; supervisor: string; grupo?: string; jabasTotales: number; actividades: number }> = {};

    // DetalleJabas records
    filteredDetalleJabas.forEach((d) => {
      const dni = d.dni ? d.dni.trim() : '';
      if (!dni) return;
      if (!map[dni]) {
        map[dni] = {
          dni,
          nombres: d.trabajador || dni,
          fundo: d.fundo,
          modulo: d.modulo,
          supervisor: d.supervisor,
          grupo: d.grupo,
          jabasTotales: 0,
          actividades: 0
        };
      }
      map[dni].jabasTotales += Number(d.jabas) || 0;
      map[dni].actividades += 1;
    });

    // Existing master workers
    trabajadores.forEach((t) => {
      const dni = t.dni ? t.dni.trim() : '';
      if (!dni) return;
      if (!map[dni]) {
        map[dni] = {
          dni,
          nombres: t.nombres || dni,
          fundo: t.fundo || 'Arena Azul',
          modulo: t.modulo || 'M01',
          supervisor: t.supervisor || 'General',
          grupo: t.grupo || 'Grupo 01',
          jabasTotales: Number(t.jabas) || 0,
          actividades: 1
        };
      }
    });

    return Object.values(map).sort((a, b) => b.jabasTotales - a.jabasTotales || a.nombres.localeCompare(b.nombres));
  }, [filteredDetalleJabas, trabajadores]);

  // Section 4: Jabas Totales Breakdown
  const sec4Data = useMemo(() => {
    let jabasEjecucion = 0;
    let jabasTareo = 0;
    let jabasValidadas = 0;

    filteredProgramas.forEach((p) => {
      jabasEjecucion += Number(p.jabas) || 0;
    });

    filteredDetalleJabas.forEach((d) => {
      jabasTareo += Number(d.jabas) || 0;
    });

    filteredValidaciones.forEach((v) => {
      jabasValidadas += Number(v.jabasConformes) || Number(v.totalJabas) || 0;
    });

    const granTotal = jabasTareo > 0 ? jabasTareo : jabasEjecucion;

    return {
      jabasEjecucion,
      jabasTareo,
      jabasValidadas,
      granTotal
    };
  }, [filteredProgramas, filteredDetalleJabas, filteredValidaciones]);

  // Section 5: Ranking Trabajadores por Jabas
  const sec5Data = useMemo(() => {
    const map: Record<string, { dni: string; nombres: string; fundo: string; modulo: string; grupo?: string; supervisor: string; jabas: number }> = {};

    filteredDetalleJabas.forEach((d) => {
      const dni = d.dni ? d.dni.trim() : '';
      if (!dni) return;
      if (!map[dni]) {
        map[dni] = {
          dni,
          nombres: d.trabajador || dni,
          fundo: d.fundo,
          modulo: d.modulo,
          grupo: d.grupo,
          supervisor: d.supervisor,
          jabas: 0
        };
      }
      map[dni].jabas += Number(d.jabas) || 0;
    });

    const sorted = Object.values(map).sort((a, b) => b.jabas - a.jabas);
    const total = sorted.reduce((sum, r) => sum + r.jabas, 0);
    return { list: sorted, total };
  }, [filteredDetalleJabas]);

  // Section 6: Jabas por Fecha Detalle (Kardex)
  const sec6Data = useMemo(() => {
    const list = [...filteredDetalleJabas].sort((a, b) =>
      (b.fecha || '').localeCompare(a.fecha || '') || (a.trabajador || '').localeCompare(b.trabajador || '')
    );
    const total = list.reduce((sum, d) => sum + Number(d.jabas || 0), 0);
    return { list, total };
  }, [filteredDetalleJabas]);

  // Section 7: Validaciones de Supervisores
  const sec7Data = useMemo(() => {
    const list = [...filteredValidaciones].sort((a, b) =>
      (b.fecha || '').localeCompare(a.fecha || '')
    );
    const totalJabas = list.reduce((sum, v) => sum + Number(v.jabasConformes || v.totalJabas || 0), 0);
    return { list, totalJabas };
  }, [filteredValidaciones]);

  // Export handlers
  const handleExport = (sectionId: string, format: 'xlsx' | 'csv') => {
    let data: ExportTableData;

    switch (sectionId) {
      case 'sec1':
        data = {
          headers: ['Fundo', 'Módulo', 'Jabas', 'Programas', 'Lotes', 'Registros Tareo'],
          rows: sec1Data.list.map((r) => [r.fundo, r.modulo, r.jabas, r.programas, r.lotes, r.personal])
        };
        data.rows.push(['TOTAL', '', sec1Data.totalJabas, sec1Data.totalProgs, sec1Data.totalLotes, '']);
        break;

      case 'sec2':
        data = {
          headers: ['Fundo', 'Módulo', 'Turno', 'Lote', 'Veces Ejecutado'],
          rows: sec2Data.map((r) => [r.fundo, r.modulo, r.turno, r.lote, r.count])
        };
        data.rows.push(['TOTAL LOTES', '', '', '', sec2Data.length]);
        break;

      case 'sec3':
        data = {
          headers: ['DNI', 'Nombre Trabajador', 'Fundo', 'Módulo', 'Grupo', 'Supervisor', 'Jabas', 'Actividades'],
          rows: sec3Data.map((r) => [r.dni, r.nombres, r.fundo, r.modulo, r.grupo || '', r.supervisor, r.jabasTotales, r.actividades])
        };
        data.rows.push(['TOTAL PERSONAL', `${sec3Data.length} trabajadores`, '', '', '', '', '', '']);
        break;

      case 'sec4':
        data = {
          headers: ['Concepto', 'Total Jabas'],
          rows: [
            ['Jabas Tareo de Personal', sec4Data.jabasTareo],
            ['Jabas Partes de Ejecución', sec4Data.jabasEjecucion],
            ['Jabas Validadas por Supervisor', sec4Data.jabasValidadas],
            ['GRAN TOTAL COSECHADO', sec4Data.granTotal]
          ]
        };
        break;

      case 'sec5':
        data = {
          headers: ['Ranking', 'DNI', 'Nombre Trabajador', 'Fundo', 'Módulo', 'Grupo', 'Supervisor', 'Jabas Totales'],
          rows: sec5Data.list.map((r, i) => [i + 1, r.dni, r.nombres, r.fundo, r.modulo, r.grupo || '', r.supervisor, r.jabas])
        };
        data.rows.push(['TOTAL', '', '', '', '', '', '', sec5Data.total]);
        break;

      case 'sec6':
        data = {
          headers: ['Fecha', 'DNI', 'Trabajador', 'Fundo', 'Módulo', 'Grupo', 'Líder', 'Jabas', 'Supervisor'],
          rows: sec6Data.list.map((d) => [d.fecha, d.dni, d.trabajador, d.fundo, d.modulo, d.grupo || '', d.lider || '', d.jabas, d.supervisor])
        };
        data.rows.push(['TOTAL', '', '', '', '', '', '', sec6Data.total, '']);
        break;

      case 'sec7':
        data = {
          headers: ['Fecha', 'Supervisor', 'Fundo', 'Módulo', 'Grupo', 'Líder', 'Trabajadores', 'Jabas Conformes', 'Estado'],
          rows: sec7Data.list.map((v) => [v.fecha, v.supervisor, v.fundo, v.modulo, v.grupo, v.lider || '', v.totalTrabajadores, v.jabasConformes, v.estado])
        };
        data.rows.push(['TOTAL', '', '', '', '', '', '', sec7Data.totalJabas, '']);
        break;

      default:
        return;
    }

    const title = `Reporte_${sectionId}`;
    if (format === 'xlsx') {
      exportToExcelFile(title, data);
      onToast(`📥 Archivo Excel (${title}.xlsx) generado`);
    } else {
      exportToCsvFile(title, data);
      onToast(`📥 Archivo CSV (${title}.csv) generado`);
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
      onToast('🔄 Reportes actualizados con datos en vivo');
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-[#f0f0f0] mb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#1b5e20] border border-[#a5d6a7]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                Módulo de Reportes y Exportación
              </h2>
              <span className="text-xs text-[#757575] font-medium">Exportación consolidada a Excel (.xlsx) y CSV</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3 py-1.5 rounded-xl border border-[#bfcaba] hover:bg-gray-50 text-xs font-bold text-[#2e7d32] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 self-stretch sm:self-auto justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar Reportes</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#40493d] mb-1">
              Filtro de Período
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as 'todo' | 'hoy' | 'semana' | 'mes')}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
            >
              <option value="todo">Todo el histórico (Sin restricción)</option>
              <option value="hoy">Hoy ({today})</option>
              <option value="semana">Últimos 7 días</option>
              <option value="mes">Este mes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#40493d] mb-1">
              Fecha Desde (Opcional)
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#40493d] mb-1">
              Fecha Hasta (Opcional)
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#1b5e20]">
            {filteredProgramas.length + filteredProgramaGeneral.length}
          </div>
          <div className="text-[11px] font-semibold text-[#40493d] mt-0.5">Programas</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#ff8f00]">
            {sec4Data.granTotal.toLocaleString()}
          </div>
          <div className="text-[11px] font-semibold text-[#40493d] mt-0.5">Jabas Cosechadas</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#2e7d32]">
            {sec1Data.totalLotes}
          </div>
          <div className="text-[11px] font-semibold text-[#40493d] mt-0.5">Lotes Atendidos</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#1565c0]">
            {sec3Data.length}
          </div>
          <div className="text-[11px] font-semibold text-[#40493d] mt-0.5">Personal Activo</div>
        </div>
      </div>

      {/* Accordion 1: Fundo y Módulos Programados */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div
          onClick={() => toggleSection('sec1')}
          className="bg-[#f9fbe7] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#f1f8e9] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
              🏢 1. Fundo y Módulos Programados y Ejecutados
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              ({sec1Data.list.length} sectores)
            </span>
          </div>
          {openSections.sec1 ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {openSections.sec1 && (
          <div className="p-4 border-t border-[#e0e0e0] animate-in fade-in">
            <div className="overflow-x-auto rounded-xl border border-[#e0e0e0] mb-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#2e7d32] text-white">
                  <tr>
                    <th className="p-2.5">Fundo</th>
                    <th className="p-2.5">Módulo</th>
                    <th className="p-2.5 text-right">Jabas</th>
                    <th className="p-2.5 text-right">Programas</th>
                    <th className="p-2.5 text-right">Lotes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec1Data.list.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-400">Sin datos para el período seleccionado.</td>
                    </tr>
                  ) : (
                    sec1Data.list.map((r) => (
                      <tr key={`${r.fundo}_${r.modulo}`} className="hover:bg-gray-50">
                        <td className="p-2.5 font-bold text-[#1b5e20]">{r.fundo}</td>
                        <td className="p-2.5 font-semibold">{r.modulo}</td>
                        <td className="p-2.5 text-right font-extrabold text-[#ff8f00]">{r.jabas}</td>
                        <td className="p-2.5 text-right">{r.programas}</td>
                        <td className="p-2.5 text-right">{r.lotes}</td>
                      </tr>
                    ))
                  )}
                  {sec1Data.list.length > 0 && (
                    <tr className="bg-[#e8f5e9] font-bold text-[#1b5e20]">
                      <td className="p-2.5">TOTAL</td>
                      <td className="p-2.5">—</td>
                      <td className="p-2.5 text-right">{sec1Data.totalJabas}</td>
                      <td className="p-2.5 text-right">{sec1Data.totalProgs}</td>
                      <td className="p-2.5 text-right">{sec1Data.totalLotes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('sec1', 'xlsx')}
                className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Exportar Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('sec1', 'csv')}
                className="flex-1 border border-[#2e7d32] text-[#2e7d32] hover:bg-[#e8f5e9] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📥 Exportar CSV (.csv)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Fundo y Módulos Turnos y Lotes Ejecutados */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div
          onClick={() => toggleSection('sec2')}
          className="bg-[#f9fbe7] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#f1f8e9] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
              🌱 2. Fundo y Módulos Turnos y Lotes Ejecutados
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              ({sec2Data.length} lotes)
            </span>
          </div>
          {openSections.sec2 ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {openSections.sec2 && (
          <div className="p-4 border-t border-[#e0e0e0] animate-in fade-in">
            <div className="max-h-60 overflow-y-auto rounded-xl border border-[#e0e0e0] mb-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#2e7d32] text-white sticky top-0">
                  <tr>
                    <th className="p-2.5">Fundo</th>
                    <th className="p-2.5">Módulo</th>
                    <th className="p-2.5">Turno</th>
                    <th className="p-2.5">Lote</th>
                    <th className="p-2.5 text-right">Veces Ejecutado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec2Data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-400">Sin lotes ejecutados en este rango.</td>
                    </tr>
                  ) : (
                    sec2Data.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2.5 font-semibold text-[#1b5e20]">{r.fundo}</td>
                        <td className="p-2.5">{r.modulo}</td>
                        <td className="p-2.5">{r.turno}</td>
                        <td className="p-2.5 font-bold">{r.lote}</td>
                        <td className="p-2.5 text-right font-semibold">{r.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('sec2', 'xlsx')}
                className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Exportar Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('sec2', 'csv')}
                className="flex-1 border border-[#2e7d32] text-[#2e7d32] hover:bg-[#e8f5e9] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📥 Exportar CSV (.csv)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 3: Trabajadores Totales */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div
          onClick={() => toggleSection('sec3')}
          className="bg-[#f9fbe7] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#f1f8e9] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
              👷 3. Trabajadores Totales en Nómina Activa
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              ({sec3Data.length} trabajadores)
            </span>
          </div>
          {openSections.sec3 ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {openSections.sec3 && (
          <div className="p-4 border-t border-[#e0e0e0] animate-in fade-in">
            <div className="max-h-60 overflow-y-auto rounded-xl border border-[#e0e0e0] mb-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#2e7d32] text-white sticky top-0">
                  <tr>
                    <th className="p-2.5">DNI</th>
                    <th className="p-2.5">Nombre</th>
                    <th className="p-2.5">Fundo</th>
                    <th className="p-2.5">Módulo</th>
                    <th className="p-2.5">Grupo</th>
                    <th className="p-2.5">Supervisor</th>
                    <th className="p-2.5 text-right">Jabas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec3Data.map((r) => (
                    <tr key={r.dni} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold text-[#1b5e20] font-mono">{r.dni}</td>
                      <td className="p-2.5 font-semibold">{r.nombres}</td>
                      <td className="p-2.5">{r.fundo}</td>
                      <td className="p-2.5">{r.modulo}</td>
                      <td className="p-2.5 text-gray-600">{r.grupo || '—'}</td>
                      <td className="p-2.5">{r.supervisor}</td>
                      <td className="p-2.5 text-right font-extrabold text-[#e65100]">{r.jabasTotales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('sec3', 'xlsx')}
                className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Exportar Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('sec3', 'csv')}
                className="flex-1 border border-[#2e7d32] text-[#2e7d32] hover:bg-[#e8f5e9] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📥 Exportar CSV (.csv)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 4: Jabas Totales (Tareo vs Ejecución) */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div
          onClick={() => toggleSection('sec4')}
          className="bg-[#f9fbe7] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#f1f8e9] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
              📦 4. Jabas Totales (Resumen Consolidado)
            </span>
            <span className="text-[11px] text-[#ff8f00] font-bold">
              ({sec4Data.granTotal} jabas recolectadas)
            </span>
          </div>
          {openSections.sec4 ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {openSections.sec4 && (
          <div className="p-4 border-t border-[#e0e0e0] animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3.5 rounded-xl bg-[#e8f5e9] text-center border border-[#a5d6a7]">
                <div className="text-xl font-bold text-[#1b5e20]">{sec4Data.jabasTareo}</div>
                <div className="text-xs text-[#2e7d32] font-semibold mt-0.5">Tareo de Campo</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#fff8e1] text-center border border-[#ffe082]">
                <div className="text-xl font-bold text-[#e65100]">{sec4Data.jabasEjecucion}</div>
                <div className="text-xs text-[#ff8f00] font-semibold mt-0.5">Partes de Ejecución</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#e3f2fd] text-center border border-[#90caf9]">
                <div className="text-xl font-bold text-[#1565c0]">{sec4Data.jabasValidadas}</div>
                <div className="text-xs text-[#1565c0] font-semibold mt-0.5">Jabas Validadas</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#c8e6c9] text-center border border-[#81c784]">
                <div className="text-2xl font-extrabold text-[#1b5e20]">{sec4Data.granTotal}</div>
                <div className="text-xs text-[#1b5e20] font-bold mt-0.5">Gran Total Cosechado</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('sec4', 'xlsx')}
                className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Exportar Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('sec4', 'csv')}
                className="flex-1 border border-[#2e7d32] text-[#2e7d32] hover:bg-[#e8f5e9] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📥 Exportar CSV (.csv)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 5: Trabajadores por Jabas Ranking */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div
          onClick={() => toggleSection('sec5')}
          className="bg-[#f9fbe7] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#f1f8e9] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
              🏆 5. Ranking de Trabajadores por Jabas Cosechadas
            </span>
            <span className="text-[11px] text-[#ff8f00] font-bold">
              ({sec5Data.total} jabas totales)
            </span>
          </div>
          {openSections.sec5 ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {openSections.sec5 && (
          <div className="p-4 border-t border-[#e0e0e0] animate-in fade-in">
            <div className="max-h-72 overflow-y-auto rounded-xl border border-[#e0e0e0] mb-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#2e7d32] text-white sticky top-0">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">DNI</th>
                    <th className="p-2.5">Nombre</th>
                    <th className="p-2.5">Fundo</th>
                    <th className="p-2.5">Módulo</th>
                    <th className="p-2.5">Grupo</th>
                    <th className="p-2.5">Supervisor</th>
                    <th className="p-2.5 text-right">Jabas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec5Data.list.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-gray-400">Sin datos de ranking para el rango seleccionado.</td>
                    </tr>
                  ) : (
                    sec5Data.list.map((r, idx) => (
                      <tr key={r.dni} className="hover:bg-gray-50">
                        <td className="p-2.5 font-bold text-gray-500">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td className="p-2.5 font-mono text-[#1b5e20]">{r.dni}</td>
                        <td className="p-2.5 font-bold text-[#212121]">{r.nombres}</td>
                        <td className="p-2.5">{r.fundo}</td>
                        <td className="p-2.5">{r.modulo}</td>
                        <td className="p-2.5 text-gray-600">{r.grupo || '—'}</td>
                        <td className="p-2.5 text-gray-600">{r.supervisor}</td>
                        <td className="p-2.5 text-right font-extrabold text-sm text-[#e65100]">
                          {r.jabas}
                        </td>
                      </tr>
                    ))
                  )}
                  {sec5Data.list.length > 0 && (
                    <tr className="bg-[#e8f5e9] font-bold text-[#1b5e20]">
                      <td colSpan={7} className="p-2.5">TOTAL ACUMULADO</td>
                      <td className="p-2.5 text-right text-base text-[#e65100]">{sec5Data.total}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('sec5', 'xlsx')}
                className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Exportar Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('sec5', 'csv')}
                className="flex-1 border border-[#2e7d32] text-[#2e7d32] hover:bg-[#e8f5e9] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📥 Exportar CSV (.csv)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 6: Jabas por Fecha (Detalle Diario) */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div
          onClick={() => toggleSection('sec6')}
          className="bg-[#f9fbe7] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#f1f8e9] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
              🗓️ 6. Kardex Diario de Jabas Cosechadas por Trabajador
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              ({sec6Data.list.length} registros individuales)
            </span>
          </div>
          {openSections.sec6 ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {openSections.sec6 && (
          <div className="p-4 border-t border-[#e0e0e0] animate-in fade-in">
            <div className="max-h-72 overflow-y-auto rounded-xl border border-[#e0e0e0] mb-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#2e7d32] text-white sticky top-0">
                  <tr>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">DNI</th>
                    <th className="p-2.5">Trabajador</th>
                    <th className="p-2.5">Fundo</th>
                    <th className="p-2.5">Módulo</th>
                    <th className="p-2.5">Grupo</th>
                    <th className="p-2.5">Líder</th>
                    <th className="p-2.5 text-right">Jabas</th>
                    <th className="p-2.5">Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec6Data.list.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-gray-400">
                        No hay registros diarios en el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    sec6Data.list.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="p-2.5 whitespace-nowrap text-gray-600 font-medium">{d.fecha}</td>
                        <td className="p-2.5 font-mono text-[#1b5e20]">{d.dni}</td>
                        <td className="p-2.5 font-bold text-[#212121]">{d.trabajador}</td>
                        <td className="p-2.5">{d.fundo}</td>
                        <td className="p-2.5 font-semibold">{d.modulo}</td>
                        <td className="p-2.5 text-gray-600">{d.grupo || '—'}</td>
                        <td className="p-2.5 text-gray-600">{d.lider || '—'}</td>
                        <td className="p-2.5 text-right font-extrabold text-sm text-[#e65100]">
                          {d.jabas}
                        </td>
                        <td className="p-2.5 text-gray-600">{d.supervisor}</td>
                      </tr>
                    ))
                  )}
                  {sec6Data.list.length > 0 && (
                    <tr className="bg-[#e8f5e9] font-bold text-[#1b5e20]">
                      <td colSpan={7} className="p-2.5">TOTAL JABAS DIARIAS</td>
                      <td className="p-2.5 text-right text-base text-[#e65100]">{sec6Data.total}</td>
                      <td className="p-2.5"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('sec6', 'xlsx')}
                className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Exportar Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('sec6', 'csv')}
                className="flex-1 border border-[#2e7d32] text-[#2e7d32] hover:bg-[#e8f5e9] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📥 Exportar CSV (.csv)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 7: Validaciones de Supervisores */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div
          onClick={() => toggleSection('sec7')}
          className="bg-[#f9fbe7] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#f1f8e9] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
              🛡️ 7. Validaciones Registradas por Supervisores
            </span>
            <span className="text-[11px] text-[#1b5e20] font-bold">
              ({sec7Data.list.length} actas de supervisión)
            </span>
          </div>
          {openSections.sec7 ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {openSections.sec7 && (
          <div className="p-4 border-t border-[#e0e0e0] animate-in fade-in">
            <div className="max-h-72 overflow-y-auto rounded-xl border border-[#e0e0e0] mb-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#2e7d32] text-white sticky top-0">
                  <tr>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Supervisor</th>
                    <th className="p-2.5">Fundo</th>
                    <th className="p-2.5">Módulo</th>
                    <th className="p-2.5">Grupo</th>
                    <th className="p-2.5">Líder</th>
                    <th className="p-2.5 text-center">Trabajadores</th>
                    <th className="p-2.5 text-right">Jabas Conformes</th>
                    <th className="p-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec7Data.list.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-gray-400">
                        No hay validaciones registradas en el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    sec7Data.list.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="p-2.5 whitespace-nowrap text-gray-600 font-medium">{v.fecha}</td>
                        <td className="p-2.5 font-bold text-[#1b5e20]">{v.supervisor}</td>
                        <td className="p-2.5">{v.fundo}</td>
                        <td className="p-2.5 font-semibold">{v.modulo}</td>
                        <td className="p-2.5 text-gray-600">{v.grupo}</td>
                        <td className="p-2.5 text-gray-600">{v.lider || '—'}</td>
                        <td className="p-2.5 text-center font-bold text-gray-700">{v.totalTrabajadores}</td>
                        <td className="p-2.5 text-right font-extrabold text-[#2e7d32]">{v.jabasConformes}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f5e9] text-[#1b5e20] border border-[#a5d6a7]">
                            {v.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                  {sec7Data.list.length > 0 && (
                    <tr className="bg-[#e8f5e9] font-bold text-[#1b5e20]">
                      <td colSpan={7} className="p-2.5">TOTAL JABAS VALIDADAS</td>
                      <td className="p-2.5 text-right text-base text-[#2e7d32]">{sec7Data.totalJabas}</td>
                      <td className="p-2.5"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleExport('sec7', 'xlsx')}
                className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Exportar Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExport('sec7', 'csv')}
                className="flex-1 border border-[#2e7d32] text-[#2e7d32] hover:bg-[#e8f5e9] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📥 Exportar CSV (.csv)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
