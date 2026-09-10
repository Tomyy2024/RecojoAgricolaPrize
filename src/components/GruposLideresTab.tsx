import React, { useState, useMemo } from 'react';
import { Trabajador, Lider, UserSession } from '../types';
import { 
  Users, 
  UserCheck, 
  Crown, 
  Plus, 
  Trash2, 
  Search, 
  CheckSquare, 
  Square, 
  Upload, 
  FileSpreadsheet, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Filter,
  Layers,
  ChevronDown
} from 'lucide-react';
import { getLocalToday } from '../utils/storage';

interface GruposLideresTabProps {
  session?: UserSession | null;
  trabajadores: Trabajador[];
  grupos: string[];
  lideres: Lider[];
  onSaveGrupo: (grupo: string) => void;
  onDeleteGrupo?: (grupo: string) => void;
  onSaveLider: (lider: Lider) => void;
  onDeleteLider: (nameOrDni: string) => void;
  onUpdateTrabajadores: (trabajadores: Trabajador[]) => void;
  onToast: (msg: string, tipo?: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateToCargaNomina?: () => void;
}

export const GruposLideresTab: React.FC<GruposLideresTabProps> = ({
  session,
  trabajadores,
  grupos,
  lideres,
  onSaveGrupo,
  onDeleteGrupo,
  onSaveLider,
  onDeleteLider,
  onUpdateTrabajadores,
  onToast,
  onNavigateToCargaNomina
}) => {
  const isAdmin = session?.rol === 'Administrador';

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'sin_grupo' | 'con_grupo'>('todos');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos');
  const [filtroLider, setFiltroLider] = useState<string>('todos');

  // Selected workers for bulk actions
  const [selectedDnis, setSelectedDnis] = useState<Set<string>>(new Set());

  // Bulk assignment dropdowns
  const [bulkGrupo, setBulkGrupo] = useState<string>('');
  const [bulkLider, setBulkLider] = useState<string>('');

  // Modals
  const [showNuevoGrupoModal, setShowNuevoGrupoModal] = useState(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');

  const [showNuevoLiderModal, setShowNuevoLiderModal] = useState(false);
  const [nuevoLiderDni, setNuevoLiderDni] = useState('');
  const [nuevoLiderNombre, setNuevoLiderNombre] = useState('');
  const [nuevoLiderGrupo, setNuevoLiderGrupo] = useState('');

  const [showImportarAsignacionesModal, setShowImportarAsignacionesModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Counts & Metrics
  const metrics = useMemo(() => {
    const total = trabajadores.length;
    let conGrupo = 0;
    let sinGrupo = 0;
    const countPorGrupo: Record<string, number> = {};

    grupos.forEach((g) => {
      countPorGrupo[g] = 0;
    });

    trabajadores.forEach((t) => {
      const g = (t.grupo || '').trim();
      if (g) {
        conGrupo++;
        countPorGrupo[g] = (countPorGrupo[g] || 0) + 1;
      } else {
        sinGrupo++;
      }
    });

    return { total, conGrupo, sinGrupo, countPorGrupo };
  }, [trabajadores, grupos]);

  // Filtered workers list
  const filteredTrabajadores = useMemo(() => {
    return trabajadores.filter((t) => {
      const dni = String(t.dni || '').toLowerCase();
      const nombres = String(t.nombres || '').toLowerCase();
      const s = searchTerm.toLowerCase().trim();

      // Search match
      if (s && !dni.includes(s) && !nombres.includes(s)) {
        return false;
      }

      // Estado filter
      const hasGroup = Boolean((t.grupo || '').trim());
      if (filtroEstado === 'sin_grupo' && hasGroup) return false;
      if (filtroEstado === 'con_grupo' && !hasGroup) return false;

      // Grupo filter
      if (filtroGrupo !== 'todos' && (t.grupo || '').trim() !== filtroGrupo) {
        return false;
      }

      // Líder filter
      if (filtroLider !== 'todos') {
        const tLider = (t.lider || '').trim().toLowerCase();
        if (tLider !== filtroLider.toLowerCase()) return false;
      }

      return true;
    });
  }, [trabajadores, searchTerm, filtroEstado, filtroGrupo, filtroLider]);

  // Handle Select All / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedDnis.size === filteredTrabajadores.length && filteredTrabajadores.length > 0) {
      setSelectedDnis(new Set());
    } else {
      const allDnis = new Set<string>();
      filteredTrabajadores.forEach((t) => {
        const cleanDni = String(t.dni || '').trim();
        if (cleanDni) allDnis.add(cleanDni);
      });
      setSelectedDnis(allDnis);
    }
  };

  const handleToggleSelectWorker = (dni: string) => {
    const cleanDni = String(dni || '').trim();
    if (!cleanDni) return;
    setSelectedDnis((prev) => {
      const next = new Set(prev);
      if (next.has(cleanDni)) {
        next.delete(cleanDni);
      } else {
        next.add(cleanDni);
      }
      return next;
    });
  };

  // Bulk Apply
  const handleApplyBulkAssignment = () => {
    if (selectedDnis.size === 0) {
      onToast('Selecciona al menos un trabajador para asignar', 'warning');
      return;
    }
    if (!bulkGrupo && !bulkLider) {
      onToast('Selecciona un Grupo o un Líder para asignar', 'warning');
      return;
    }

    const updated = trabajadores.map((t) => {
      const cleanDni = String(t.dni || '').trim();
      if (selectedDnis.has(cleanDni)) {
        return {
          ...t,
          grupo: bulkGrupo !== '' ? bulkGrupo : t.grupo,
          lider: bulkLider !== '' ? bulkLider : t.lider
        };
      }
      return t;
    });

    onUpdateTrabajadores(updated);
    onToast(`✅ Asignación completada a ${selectedDnis.size} trabajadores sin alterar la nómina`, 'success');
    setSelectedDnis(new Set());
    setBulkGrupo('');
    setBulkLider('');
  };

  // Bulk Clear
  const handleClearBulkAssignment = () => {
    if (selectedDnis.size === 0) return;
    if (!window.confirm(`¿Quitar grupo y líder a los ${selectedDnis.size} trabajadores seleccionados?`)) {
      return;
    }

    const updated = trabajadores.map((t) => {
      const cleanDni = String(t.dni || '').trim();
      if (selectedDnis.has(cleanDni)) {
        return {
          ...t,
          grupo: '',
          lider: ''
        };
      }
      return t;
    });

    onUpdateTrabajadores(updated);
    onToast(`🧹 Se retiró grupo y líder a ${selectedDnis.size} trabajadores`, 'info');
    setSelectedDnis(new Set());
  };

  // Single Worker Assignment update
  const handleSingleWorkerChange = (dni: string, field: 'grupo' | 'lider', value: string) => {
    const cleanDni = String(dni || '').trim();
    const updated = trabajadores.map((t) => {
      if (String(t.dni || '').trim() === cleanDni) {
        return {
          ...t,
          [field]: value
        };
      }
      return t;
    });
    onUpdateTrabajadores(updated);
  };

  // Create Grupo
  const handleCrearGrupo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nuevoGrupoNombre.trim();
    if (!clean) {
      onToast('Ingresa un nombre válido para el grupo', 'warning');
      return;
    }
    if (grupos.some((g) => g.toLowerCase() === clean.toLowerCase())) {
      onToast('Este grupo ya existe', 'warning');
      return;
    }
    onSaveGrupo(clean);
    setNuevoGrupoNombre('');
    setShowNuevoGrupoModal(false);
    onToast(`✅ Grupo "${clean}" agregado exitosamente`, 'success');
  };

  // Create Líder
  const handleCrearLider = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreClean = nuevoLiderNombre.trim();
    const dniClean = nuevoLiderDni.replace(/\D/g, '').trim();

    if (!nombreClean) {
      onToast('Ingresa el nombre del líder', 'warning');
      return;
    }

    const newLider: Lider = {
      lider: nombreClean,
      nombres: nombreClean,
      dni: dniClean,
      grupo: nuevoLiderGrupo || undefined,
      fechaAlta: getLocalToday()
    };

    onSaveLider(newLider);
    setNuevoLiderNombre('');
    setNuevoLiderDni('');
    setNuevoLiderGrupo('');
    setShowNuevoLiderModal(false);
    onToast(`👑 Líder "${nombreClean}" registrado con éxito`, 'success');
  };

  // Parse & Apply Asignaciones (DNI + Grupo + Líder)
  const handleProcesarImportAsignaciones = () => {
    if (!importText.trim()) {
      onToast('El texto de asignaciones está vacío', 'warning');
      return;
    }

    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Check header
    const firstLower = lines[0].toLowerCase();
    const hasHeader = firstLower.includes('dni') || firstLower.includes('grupo');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const asignacionesMap = new Map<string, { grupo?: string; lider?: string }>();

    dataLines.forEach((line) => {
      const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      const cols = line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 2) {
        const dni = cols[0].replace(/\D/g, '');
        const grupo = cols[1] || '';
        const lider = cols[2] || '';
        if (dni) {
          asignacionesMap.set(dni, { grupo, lider });
        }
      }
    });

    if (asignacionesMap.size === 0) {
      onToast('No se detectaron DNI y Grupos válidos en el texto', 'warning');
      return;
    }

    let actualizados = 0;
    const updated = trabajadores.map((t) => {
      const cleanDni = String(t.dni || '').replace(/\D/g, '').trim();
      const asig = asignacionesMap.get(cleanDni);
      if (asig) {
        actualizados++;
        return {
          ...t,
          grupo: asig.grupo || t.grupo,
          lider: asig.lider || t.lider
        };
      }
      return t;
    });

    onUpdateTrabajadores(updated);
    setShowImportarAsignacionesModal(false);
    setImportText('');
    onToast(`✅ Se actualizaron Grupo y Líder para ${actualizados} trabajadores coincidentes`, 'success');
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in">
      {/* ========================================================================= */}
      {/* CABECERA DE LA HOJA 2: ASIGNACIÓN DE GRUPO Y LÍDER */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 uppercase tracking-wider">
                  Hoja 2
                </span>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  Asignación de Grupo y Líder
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Organiza cuadrillas sin mover ni modificar la nómina base de trabajadores.
              </p>
            </div>
          </div>

          {/* Quick Actions & Navigation Link */}
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToCargaNomina && (
              <button
                type="button"
                onClick={onNavigateToCargaNomina}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Ir a la Hoja 1 para cargar o revisar la nómina base de trabajadores"
              >
                <span>📋 Ir a Hoja 1: Carga Nómina</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNuevoGrupoModal(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Grupo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNuevoLiderModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Nuevo Líder</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportarAsignacionesModal(true)}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Importar solo asignaciones por DNI, Grupo y Líder"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar Asignaciones</span>
              <span className="sm:hidden">Importar</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TARJETAS DE MÉTRICAS RÁPIDAS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
              Personal Nómina
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-gray-900">{metrics.total}</span>
              <span className="text-xs text-gray-500">trabajadores</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Con Grupo
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-emerald-900">{metrics.conGrupo}</span>
              <span className="text-xs text-emerald-700">asignados</span>
            </div>
          </div>

          <div className={`rounded-xl p-3 border ${metrics.sinGrupo > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider block ${metrics.sinGrupo > 0 ? 'text-amber-800' : 'text-gray-500'}`}>
              Sin Grupo
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-xl font-extrabold ${metrics.sinGrupo > 0 ? 'text-amber-900' : 'text-gray-600'}`}>
                {metrics.sinGrupo}
              </span>
              <span className={`text-xs ${metrics.sinGrupo > 0 ? 'text-amber-700 font-bold' : 'text-gray-500'}`}>
                {metrics.sinGrupo > 0 ? 'pendientes' : 'al día'}
              </span>
            </div>
          </div>

          <div className="bg-purple-50/70 rounded-xl p-3 border border-purple-100">
            <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">
              Grupos Creados
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-purple-900">{grupos.length}</span>
              <span className="text-xs text-purple-700">grupos</span>
            </div>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
              Líderes Activos
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold text-amber-900">{lideres.length}</span>
              <span className="text-xs text-amber-700">líderes</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN EXPANDIBLE: RESUMEN DE GRUPOS Y LÍDERES DISPONIBLES */}
        {/* ========================================================================= */}
        <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grupos chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                Grupos Disponibles ({grupos.length})
              </span>
              <button
                type="button"
                onClick={() => setShowNuevoGrupoModal(true)}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                + Añadir grupo
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {grupos.length === 0 ? (
                <span className="text-xs text-gray-400 italic">No hay grupos registrados</span>
              ) : (
                grupos.map((g) => {
                  const count = metrics.countPorGrupo[g] || 0;
                  return (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200"
                    >
                      <span>{g}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-white text-gray-700 font-bold text-[10px] shadow-2xs">
                        {count}
                      </span>
                      {isAdmin && onDeleteGrupo && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar el grupo "${g}"?`)) {
                              onDeleteGrupo(g);
                            }
                          }}
                          className="hover:text-red-600 ml-0.5 cursor-pointer"
                          title={`Eliminar ${g}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Líderes chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                Líderes Activos ({lideres.length})
              </span>
              <button
                type="button"
                onClick={() => setShowNuevoLiderModal(true)}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-900 hover:underline cursor-pointer"
              >
                + Añadir líder
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {lideres.length === 0 ? (
                <span className="text-xs text-gray-400 italic">No hay líderes registrados</span>
              ) : (
                lideres.map((l) => {
                  const nombre = l.lider || l.nombres;
                  return (
                    <span
                      key={l.dni || nombre}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs font-medium border border-amber-200"
                    >
                      <Crown className="w-3 h-3 text-amber-600" />
                      <span>{nombre}</span>
                      {l.dni && <span className="text-[10px] text-amber-700 font-mono">({l.dni})</span>}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar al líder "${nombre}"?`)) {
                              onDeleteLider(l.dni || nombre);
                            }
                          }}
                          className="hover:text-red-600 ml-0.5 cursor-pointer"
                          title={`Eliminar líder ${nombre}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE ASIGNACIÓN MASIVA FLOTANTE / DESTACADA (SI HAY SELECCIONADOS) */}
      {/* ========================================================================= */}
      {selectedDnis.size > 0 && (
        <div className="bg-emerald-900 text-white rounded-2xl p-4 shadow-lg border border-emerald-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center font-bold text-sm">
              {selectedDnis.size}
            </div>
            <div>
              <p className="text-sm font-bold">
                {selectedDnis.size} {selectedDnis.size === 1 ? 'trabajador seleccionado' : 'trabajadores seleccionados'}
              </p>
              <p className="text-[11px] text-emerald-200">
                Aplica Grupo y Líder en lote a los seleccionados sin afectar la nómina
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown Grupo */}
            <select
              value={bulkGrupo}
              onChange={(e) => setBulkGrupo(e.target.value)}
              className="bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white"
            >
              <option value="">Seleccionar Grupo...</option>
              {grupos.map((g) => (
                <option key={g} value={g} className="text-gray-900 bg-white">
                  Grupo: {g}
                </option>
              ))}
            </select>

            {/* Dropdown Líder */}
            <select
              value={bulkLider}
              onChange={(e) => setBulkLider(e.target.value)}
              className="bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white"
            >
              <option value="">Seleccionar Líder...</option>
              {lideres.map((l) => {
                const name = l.lider || l.nombres;
                return (
                  <option key={l.dni || name} value={name} className="text-gray-900 bg-white">
                    Líder: {name} {l.dni ? `(${l.dni})` : ''}
                  </option>
                );
              })}
            </select>

            {/* Botón Aplicar */}
            <button
              type="button"
              onClick={handleApplyBulkAssignment}
              className="bg-white hover:bg-emerald-50 text-emerald-900 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Aplicar Asignación</span>
            </button>

            {/* Botón Limpiar */}
            <button
              type="button"
              onClick={handleClearBulkAssignment}
              className="bg-emerald-800 hover:bg-red-800 text-emerald-100 hover:text-white border border-emerald-700 font-medium px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
              title="Quitar grupo y líder a los seleccionados"
            >
              <span>Quitar</span>
            </button>

            {/* Botón Deseleccionar */}
            <button
              type="button"
              onClick={() => setSelectedDnis(new Set())}
              className="text-xs text-emerald-300 hover:text-white px-2 py-1 underline cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLA PRINCIPAL DE ASIGNACIÓN CON BUSCADOR Y FILTROS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por DNI o Apellidos y Nombres..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros de Estado */}
            <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setFiltroEstado('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filtroEstado === 'todos'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Todos ({metrics.total})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('sin_grupo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filtroEstado === 'sin_grupo'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                ⚠️ Sin Grupo ({metrics.sinGrupo})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('con_grupo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filtroEstado === 'con_grupo'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                ✅ Con Grupo ({metrics.conGrupo})
              </button>
            </div>
          </div>

          {/* Filtros secundarios: Grupo y Líder */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrar por:</span>
            </div>

            <select
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="todos">Todos los Grupos</option>
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              value={filtroLider}
              onChange={(e) => setFiltroLider(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="todos">Todos los Líderes</option>
              {lideres.map((l) => {
                const name = l.lider || l.nombres;
                return (
                  <option key={l.dni || name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>

            {(searchTerm || filtroEstado !== 'todos' || filtroGrupo !== 'todos' || filtroLider !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFiltroEstado('todos');
                  setFiltroGrupo('todos');
                  setFiltroLider('todos');
                }}
                className="text-xs text-red-600 hover:underline ml-auto cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="cursor-pointer text-gray-600 hover:text-emerald-800"
                    title={
                      selectedDnis.size === filteredTrabajadores.length && filteredTrabajadores.length > 0
                        ? 'Deseleccionar todos'
                        : 'Seleccionar todos'
                    }
                  >
                    {selectedDnis.size === filteredTrabajadores.length && filteredTrabajadores.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-700" />
                    ) : selectedDnis.size > 0 ? (
                      <div className="w-4 h-4 rounded-xs bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px]">
                        -
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="p-3 w-12 text-gray-400">#</th>
                <th className="p-3 w-28">DNI</th>
                <th className="p-3">Apellidos y Nombres</th>
                <th className="p-3 w-48">Grupo Asignado</th>
                <th className="p-3 w-48">Líder Asignado</th>
                <th className="p-3 w-28 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrabajadores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-600">No se encontraron trabajadores</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {trabajadores.length === 0
                        ? 'Aún no se ha cargado ninguna nómina de personal en la Hoja 1.'
                        : 'Prueba ajustando los filtros o el término de búsqueda.'}
                    </p>
                    {trabajadores.length === 0 && onNavigateToCargaNomina && (
                      <button
                        type="button"
                        onClick={onNavigateToCargaNomina}
                        className="mt-3 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>Cargar Nómina en Hoja 1</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTrabajadores.map((t, idx) => {
                  const cleanDni = String(t.dni || '').trim();
                  const isSelected = selectedDnis.has(cleanDni);
                  const hasGroup = Boolean((t.grupo || '').trim());

                  return (
                    <tr
                      key={t.id || cleanDni || idx}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectWorker(cleanDni)}
                          className="cursor-pointer text-gray-500 hover:text-emerald-800"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 hover:text-gray-400" />
                          )}
                        </button>
                      </td>

                      {/* Index */}
                      <td className="p-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>

                      {/* DNI */}
                      <td className="p-3 font-mono font-bold text-gray-800">
                        {cleanDni || '---'}
                      </td>

                      {/* Nombres */}
                      <td className="p-3 font-semibold text-gray-900">
                        {t.nombres || 'SIN NOMBRE'}
                      </td>

                      {/* Dropdown Grupo en línea */}
                      <td className="p-2">
                        <select
                          value={t.grupo || ''}
                          onChange={(e) => handleSingleWorkerChange(cleanDni, 'grupo', e.target.value)}
                          className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-all ${
                            hasGroup
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <option value="">-- Sin Grupo --</option>
                          {grupos.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Dropdown Líder en línea */}
                      <td className="p-2">
                        <select
                          value={t.lider || ''}
                          onChange={(e) => handleSingleWorkerChange(cleanDni, 'lider', e.target.value)}
                          className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-all ${
                            t.lider
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <option value="">-- Sin Líder --</option>
                          {lideres.map((l) => {
                            const name = l.lider || l.nombres;
                            return (
                              <option key={l.dni || name} value={name}>
                                {name} {l.dni ? `(${l.dni})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>

                      {/* Badge Estado */}
                      <td className="p-3 text-center">
                        {hasGroup ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Asignado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            Sin Grupo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de la Tabla */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <div>
            Mostrando <span className="font-bold text-gray-800">{filteredTrabajadores.length}</span> de{' '}
            <span className="font-bold text-gray-800">{trabajadores.length}</span> trabajadores en nómina
          </div>
          {selectedDnis.size > 0 && (
            <div className="font-semibold text-emerald-800">
              {selectedDnis.size} seleccionados para asignación en lote
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NUEVO GRUPO */}
      {/* ========================================================================= */}
      {showNuevoGrupoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Crear Nuevo Grupo</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNuevoGrupoModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearGrupo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Grupo 01, Grupo 02, Cuadrilla Este..."
                  value={nuevoGrupoNombre}
                  onChange={(e) => setNuevoGrupoNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Este grupo estará disponible inmediatamente para asignarse a cualquier trabajador.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNuevoGrupoModal(false)}
                  className="px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-all active:scale-95"
                >
                  Guardar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVO LÍDER */}
      {/* ========================================================================= */}
      {showNuevoLiderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Registrar Nuevo Líder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNuevoLiderModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearLider} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombres y Apellidos del Líder *
                </label>
                <input
                  type="text"
                  placeholder="Ej: CARLOS MENDOZA"
                  value={nuevoLiderNombre}
                  onChange={(e) => setNuevoLiderNombre(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  DNI del Líder (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="8 dígitos"
                  maxLength={8}
                  value={nuevoLiderDni}
                  onChange={(e) => setNuevoLiderDni(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Grupo Sugerido (Opcional)
                </label>
                <select
                  value={nuevoLiderGrupo}
                  onChange={(e) => setNuevoLiderGrupo(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Sin Grupo Predeterminado --</option>
                  {grupos.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNuevoLiderModal(false)}
                  className="px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-all active:scale-95"
                >
                  Guardar Líder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPORTAR ASIGNACIONES POR TEXTO/CSV (DNI + GRUPO + LÍDER) */}
      {/* ========================================================================= */}
      {showImportarAsignacionesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Importar Asignaciones</h3>
                  <p className="text-[11px] text-gray-500">
                    Actualiza Grupo y Líder cruzando por DNI sin mover la nómina de trabajadores
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportarAsignacionesModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-700" />
                  Formato Aceptado (separado por tabulaciones o comas):
                </p>
                <p className="font-mono text-[11px] bg-white p-2 rounded-md border border-blue-200 text-gray-700">
                  DNI, GRUPO, LIDER<br />
                  12345678, Grupo 01, CARLOS MENDOZA<br />
                  87654321, Grupo 02, MARÍA LÓPEZ
                </p>
                <p className="text-[10px] text-blue-700">
                  💡 Puedes copiar directamente desde Excel las columnas <b>DNI</b>, <b>Grupo</b> y <b>Líder</b> y pegarlas aquí.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Pega aquí el texto copiado de Excel:
                </label>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="12345678&#9;Grupo 01&#9;CARLOS MENDOZA&#10;87654321&#9;Grupo 02&#9;MARÍA LÓPEZ"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowImportarAsignacionesModal(false)}
                  className="px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProcesarImportAsignaciones}
                  disabled={!importText.trim()}
                  className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Procesar Asignaciones</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
