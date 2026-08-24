import React, { useState, useMemo } from 'react';
import { Programa, DetalleJaba, Trabajador } from '../types';
import { exportToExcelFile, exportToCsvFile, ExportTableData } from '../utils/exportUtils';
import { getLocalToday } from '../utils/storage';
import { 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Filter, 
  FileText, 
  BarChart3, 
  Sparkles, 
  Calendar 
} from 'lucide-react';

interface ReportesTabProps {
  programas: Programa[];
  detalleJabas: DetalleJaba[];
  trabajadores: Trabajador[];
  onToast: (msg: string) => void;
}

export const ReportesTab: React.FC<ReportesTabProps> = ({
  programas,
  detalleJabas,
  trabajadores,
  onToast
}) => {
  const today = getLocalToday();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [desde, setDesde] = useState(weekAgo);
  const [hasta, setHasta] = useState(today);

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: false,
    sec3: false,
    sec4: false,
    sec5: true,
    sec6: true
  });

  const toggleSection = (secId: string) => {
    setOpenSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  // Filtered dataset
  const filteredProgramas = useMemo(() => {
    return programas.filter((p) => {
      const pDate = p.fecha ? p.fecha.slice(0, 10) : '';
      if (desde && pDate < desde) return false;
      if (hasta && pDate > hasta) return false;
      return true;
    });
  }, [programas, desde, hasta]);

  const filteredDetalleJabas = useMemo(() => {
    return detalleJabas.filter((d) => {
      const dDate = d.fecha ? d.fecha.slice(0, 10) : '';
      if (desde && dDate < desde) return false;
      if (hasta && dDate > hasta) return false;
      return true;
    });
  }, [detalleJabas, desde, hasta]);

  // Section 1: Fundo y Módulos Programados
  const sec1Data = useMemo(() => {
    const map: Record<string, { fundo: string; modulo: string; jabas: number; programas: number; lotes: number }> = {};
    let totalJabas = 0;
    let totalProgs = 0;
    let totalLotes = 0;

    filteredProgramas.forEach((p) => {
      const key = `${p.fundo}|${p.modulo}`;
      if (!map[key]) {
        map[key] = { fundo: p.fundo, modulo: p.modulo, jabas: 0, programas: 0, lotes: 0 };
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

    const sorted = Object.values(map).sort((a, b) => b.jabas - a.jabas);
    return { list: sorted, totalJabas, totalProgs, totalLotes };
  }, [filteredProgramas]);

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

  // Section 3: Trabajadores Totales
  const sec3Data = useMemo(() => {
    const map: Record<string, { dni: string; nombres: string; fundo: string; modulo: string; supervisor: string; count: number }> = {};
    filteredProgramas.forEach((p) => {
      if (p.avance) {
        Object.keys(p.avance).forEach((dni) => {
          if (!map[dni]) {
            const t = trabajadores.find((x) => x.dni === dni);
            map[dni] = {
              dni,
              nombres: t ? t.nombres : dni,
              fundo: t ? t.fundo : p.fundo,
              modulo: t ? t.modulo : p.modulo,
              supervisor: t ? t.supervisor : (p.supervisor || 'General'),
              count: 0
            };
          }
          map[dni].count += 1;
        });
      }
    });

    filteredDetalleJabas.forEach((d) => {
      if (!map[d.dni]) {
        map[d.dni] = {
          dni: d.dni,
          nombres: d.trabajador || d.dni,
          fundo: d.fundo,
          modulo: d.modulo,
          supervisor: d.supervisor,
          count: 1
        };
      }
    });

    return Object.values(map).sort((a, b) => a.nombres.localeCompare(b.nombres));
  }, [filteredProgramas, filteredDetalleJabas, trabajadores]);

  // Section 4: Jabas Totales Breakdown
  const sec4Data = useMemo(() => {
    let jabasPrograma = 0;
    let jabasAvance = 0;

    filteredProgramas.forEach((p) => {
      jabasPrograma += Number(p.jabas) || 0;
      if (p.avance) {
        Object.values(p.avance).forEach((v) => (jabasAvance += Number(v) || 0));
      }
    });

    filteredDetalleJabas.forEach((d) => {
      jabasAvance += Number(d.jabas) || 0;
    });

    return {
      jabasPrograma,
      jabasAvance,
      granTotal: jabasPrograma + jabasAvance
    };
  }, [filteredProgramas, filteredDetalleJabas]);

  // Section 5: Ranking Trabajadores por Jabas
  const sec5Data = useMemo(() => {
    const map: Record<string, { dni: string; nombres: string; fundo: string; modulo: string; supervisor: string; jabas: number }> = {};

    filteredProgramas.forEach((p) => {
      if (p.avance) {
        Object.entries(p.avance).forEach(([dni, count]) => {
          if (!map[dni]) {
            const t = trabajadores.find((x) => x.dni === dni);
            map[dni] = {
              dni,
              nombres: t ? t.nombres : dni,
              fundo: t ? t.fundo : p.fundo,
              modulo: t ? t.modulo : p.modulo,
              supervisor: t ? t.supervisor : (p.supervisor || 'General'),
              jabas: 0
            };
          }
          map[dni].jabas += Number(count) || 0;
        });
      }
    });

    filteredDetalleJabas.forEach((d) => {
      if (!map[d.dni]) {
        map[d.dni] = {
          dni: d.dni,
          nombres: d.trabajador || d.dni,
          fundo: d.fundo,
          modulo: d.modulo,
          supervisor: d.supervisor,
          jabas: 0
        };
      }
      map[d.dni].jabas += Number(d.jabas) || 0;
    });

    const sorted = Object.values(map).sort((a, b) => b.jabas - a.jabas);
    const total = sorted.reduce((sum, r) => sum + r.jabas, 0);
    return { list: sorted, total };
  }, [filteredProgramas, filteredDetalleJabas, trabajadores]);

  // Section 6: Jabas por Fecha Detalle
  const sec6Data = useMemo(() => {
    const list = [...filteredDetalleJabas].sort((a, b) =>
      b.fecha.localeCompare(a.fecha) || a.trabajador.localeCompare(b.trabajador)
    );
    const total = list.reduce((sum, d) => sum + Number(d.jabas || 0), 0);
    return { list, total };
  }, [filteredDetalleJabas]);

  // Export handlers
  const handleExport = (sectionId: string, format: 'xlsx' | 'csv') => {
    let data: ExportTableData;

    switch (sectionId) {
      case 'sec1':
        data = {
          headers: ['Fundo', 'Módulo', 'Jabas', 'Programas', 'Lotes'],
          rows: sec1Data.list.map((r) => [r.fundo, r.modulo, r.jabas, r.programas, r.lotes])
        };
        data.rows.push(['TOTAL', '', sec1Data.totalJabas, sec1Data.totalProgs, sec1Data.totalLotes]);
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
          headers: ['DNI', 'Nombre Trabajador', 'Fundo', 'Módulo', 'Supervisor', 'Actividades'],
          rows: sec3Data.map((r) => [r.dni, r.nombres, r.fundo, r.modulo, r.supervisor, r.count])
        };
        data.rows.push(['TOTAL PERSONAL', `${sec3Data.length} trabajadores`, '', '', '', '']);
        break;

      case 'sec4':
        data = {
          headers: ['Concepto', 'Total Jabas'],
          rows: [
            ['Jabas de Programa', sec4Data.jabasPrograma],
            ['Jabas de Avance', sec4Data.jabasAvance],
            ['GRAN TOTAL', sec4Data.granTotal]
          ]
        };
        break;

      case 'sec5':
        data = {
          headers: ['Ranking', 'DNI', 'Nombre Trabajador', 'Fundo', 'Módulo', 'Supervisor', 'Jabas Totales'],
          rows: sec5Data.list.map((r, i) => [i + 1, r.dni, r.nombres, r.fundo, r.modulo, r.supervisor, r.jabas])
        };
        data.rows.push(['TOTAL', '', '', '', '', '', sec5Data.total]);
        break;

      case 'sec6':
        data = {
          headers: ['Fecha', 'DNI', 'Trabajador', 'Fundo', 'Módulo', 'Jabas', 'Supervisor'],
          rows: sec6Data.list.map((d) => [d.fecha, d.dni, d.trabajador, d.fundo, d.modulo, d.jabas, d.supervisor])
        };
        data.rows.push(['TOTAL', '', '', '', '', sec6Data.total, '']);
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

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#2e7d32]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
              Módulo de Reportes y Exportación
            </h2>
          </div>
          <span className="text-xs text-[#757575] font-medium">Exportación en vivo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#40493d] mb-1">
              Fecha Desde
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
              Fecha Hasta
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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#1b5e20]">
            {filteredProgramas.length}
          </div>
          <div className="text-[11px] font-semibold text-[#40493d] mt-0.5">Programas</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#ff8f00]">
            {sec4Data.granTotal.toLocaleString()}
          </div>
          <div className="text-[11px] font-semibold text-[#40493d] mt-0.5">Total Jabas</div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e0e0e0] text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#2e7d32]">
            {sec1Data.totalLotes}
          </div>
          <div className="text-[11px] font-semibold text-[#40493d] mt-0.5">Lotes</div>
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
              🏢 1. Fundo y Módulos Programados
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              ({sec1Data.list.length} registros)
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
                  {sec1Data.list.map((r) => (
                    <tr key={`${r.fundo}_${r.modulo}`} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold text-[#1b5e20]">{r.fundo}</td>
                      <td className="p-2.5 font-semibold">{r.modulo}</td>
                      <td className="p-2.5 text-right font-extrabold text-[#ff8f00]">{r.jabas}</td>
                      <td className="p-2.5 text-right">{r.programas}</td>
                      <td className="p-2.5 text-right">{r.lotes}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#e8f5e9] font-bold text-[#1b5e20]">
                    <td className="p-2.5">TOTAL</td>
                    <td className="p-2.5">—</td>
                    <td className="p-2.5 text-right">{sec1Data.totalJabas}</td>
                    <td className="p-2.5 text-right">{sec1Data.totalProgs}</td>
                    <td className="p-2.5 text-right">{sec1Data.totalLotes}</td>
                  </tr>
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
                    <th className="p-2.5 text-right">Veces</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec2Data.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2.5 font-semibold text-[#1b5e20]">{r.fundo}</td>
                      <td className="p-2.5">{r.modulo}</td>
                      <td className="p-2.5">{r.turno}</td>
                      <td className="p-2.5 font-bold">{r.lote}</td>
                      <td className="p-2.5 text-right font-semibold">{r.count}</td>
                    </tr>
                  ))}
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
                    <th className="p-2.5">Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec3Data.map((r) => (
                    <tr key={r.dni} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold text-[#1b5e20]">{r.dni}</td>
                      <td className="p-2.5 font-semibold">{r.nombres}</td>
                      <td className="p-2.5">{r.fundo}</td>
                      <td className="p-2.5">{r.modulo}</td>
                      <td className="p-2.5">{r.supervisor}</td>
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

      {/* Accordion 4: Jabas Totales (Programa vs Avance) */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] overflow-hidden">
        <div
          onClick={() => toggleSection('sec4')}
          className="bg-[#f9fbe7] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#f1f8e9] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
              📦 4. Jabas Totales (Programa vs Avance)
            </span>
            <span className="text-[11px] text-[#ff8f00] font-bold">
              ({sec4Data.granTotal} jabas)
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3.5 rounded-xl bg-[#e8f5e9] text-center border border-[#a5d6a7]">
                <div className="text-xl font-bold text-[#1b5e20]">{sec4Data.jabasPrograma}</div>
                <div className="text-xs text-[#2e7d32] font-semibold mt-0.5">Jabas Programa</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#fff8e1] text-center border border-[#ffe082]">
                <div className="text-xl font-bold text-[#e65100]">{sec4Data.jabasAvance}</div>
                <div className="text-xs text-[#ff8f00] font-semibold mt-0.5">Jabas Avance</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#c8e6c9] text-center border border-[#81c784]">
                <div className="text-2xl font-extrabold text-[#1b5e20]">{sec4Data.granTotal}</div>
                <div className="text-xs text-[#1b5e20] font-bold mt-0.5">Gran Total Jabas</div>
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
              📋 5. Ranking de Trabajadores por Jabas
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
                    <th className="p-2.5">Supervisor</th>
                    <th className="p-2.5 text-right">Jabas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec5Data.list.map((r, idx) => (
                    <tr key={r.dni} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold text-gray-500">#{idx + 1}</td>
                      <td className="p-2.5 font-mono text-[#1b5e20]">{r.dni}</td>
                      <td className="p-2.5 font-bold text-[#212121]">{r.nombres}</td>
                      <td className="p-2.5">{r.fundo}</td>
                      <td className="p-2.5">{r.modulo}</td>
                      <td className="p-2.5 text-gray-600">{r.supervisor}</td>
                      <td className="p-2.5 text-right font-extrabold text-sm text-[#e65100]">
                        {r.jabas}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#e8f5e9] font-bold text-[#1b5e20]">
                    <td colSpan={6} className="p-2.5">TOTAL ACUMULADO</td>
                    <td className="p-2.5 text-right text-base text-[#e65100]">{sec5Data.total}</td>
                  </tr>
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
              🗓️ 6. Jabas por Fecha (Detalle diario por trabajador)
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              ({sec6Data.list.length} registros)
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
                    <th className="p-2.5 text-right">Jabas</th>
                    <th className="p-2.5">Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {sec6Data.list.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-400">
                        No hay registros diarios en el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    sec6Data.list.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="p-2.5 whitespace-nowrap text-gray-600">{d.fecha}</td>
                        <td className="p-2.5 font-mono text-[#1b5e20]">{d.dni}</td>
                        <td className="p-2.5 font-bold text-[#212121]">{d.trabajador}</td>
                        <td className="p-2.5">{d.fundo}</td>
                        <td className="p-2.5 font-semibold">{d.modulo}</td>
                        <td className="p-2.5 text-right font-extrabold text-sm text-[#e65100]">
                          {d.jabas}
                        </td>
                        <td className="p-2.5 text-gray-600">{d.supervisor}</td>
                      </tr>
                    ))
                  )}
                  {sec6Data.list.length > 0 && (
                    <tr className="bg-[#e8f5e9] font-bold text-[#1b5e20]">
                      <td colSpan={5} className="p-2.5">TOTAL JABAS DIARIAS</td>
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
    </div>
  );
};
