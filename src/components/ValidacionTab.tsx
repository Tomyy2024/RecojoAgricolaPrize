import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trabajador, 
  DetalleJaba, 
  UserSession, 
  ValidacionSupervisor, 
  ValidacionTrabajadorItem 
} from '../types';
import { getLocalToday, getLocalISO } from '../utils/storage';
import { RegistroStatusMonitor } from './RegistroStatusMonitor';
import { ScannerModal } from './ScannerModal';
import { 
  CheckCheck, 
  Calendar, 
  UserCheck, 
  Building2, 
  MapPin, 
  Users, 
  CheckSquare, 
  XSquare, 
  Check, 
  X, 
  Send, 
  Save, 
  History, 
  AlertTriangle, 
  Sparkles, 
  RotateCcw,
  Search,
  Filter,
  FileCheck,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Radio,
  Camera
} from 'lucide-react';

interface ValidacionTabProps {
  session: UserSession;
  trabajadores: Trabajador[];
  detalleJabas: DetalleJaba[];
  validaciones: ValidacionSupervisor[];
  grupos: string[];
  onSaveValidacion: (validacion: ValidacionSupervisor) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ValidacionTab: React.FC<ValidacionTabProps> = ({
  session,
  trabajadores,
  detalleJabas,
  validaciones,
  grupos,
  onSaveValidacion,
  onToast
}) => {
  // Supervisor verification
  const isSupervisor = session.rol === 'Supervisor';
  const sessionSupervisorName = session.nombre;

  // Active sub-tab: 'nueva' (Formulario 4 Pasos), 'monitor' (Verificación de Estado) o 'historial'
  const [activeSubTab, setActiveSubTab] = useState<'nueva' | 'monitor' | 'historial'>('nueva');

  // Paso 1: Filtros de Validación
  const [filtroFecha, setFiltroFecha] = useState<string>(getLocalToday());
  const [filtroSupervisor, setFiltroSupervisor] = useState<string>(
    isSupervisor ? sessionSupervisorName : 'Carlos Solar'
  );
  const [filtroFundo, setFiltroFundo] = useState<string>('Santa Teresa');
  const [filtroModulo, setFiltroModulo] = useState<string>('M01');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('Grupo01');

  // Búsqueda rápida dentro de la lista de trabajadores
  const [searchWorker, setSearchWorker] = useState<string>('');

  // Paso 2 y 3: Lista de trabajadores filtrados con estado de conformidad e items
  // Keyed by DNI: { conforme: boolean, observacion: string, jabas: number }
  const [workerValidationState, setWorkerValidationState] = useState<
    Record<string, { conforme: boolean; observacion: string; jabas: number }>
  >({});

  // Observaciones Generales de la Validación (Paso 4)
  const [observacionesGenerales, setObservacionesGenerales] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);

  const handleScanWorkerDni = (scannedDni: string) => {
    setSearchWorker(scannedDni);
    setScannerOpen(false);
    onToast(`🔍 DNI ${scannedDni} escaneado y filtrado en lista`, 'info');
  };

  // Historial expand/collapse
  const [expandedHistId, setExpandedHistId] = useState<string | null>(null);

  // List of unique supervisors
  const supervisoresList = useMemo(() => {
    const set = new Set<string>();
    if (isSupervisor && sessionSupervisorName) {
      set.add(sessionSupervisorName);
    }
    set.add('Carlos Solar');
    set.add('Carlos Mendoza');
    set.add('María Quispe');
    trabajadores.forEach((t) => {
      if (t.supervisor) set.add(t.supervisor);
    });
    return Array.from(set).sort();
  }, [trabajadores, isSupervisor, sessionSupervisorName]);

  // List of fundos
  const fundosList = useMemo(() => {
    const set = new Set<string>();
    set.add('Santa Teresa');
    set.add('Arena Azul');
    set.add('Vivadis');
    set.add('Ayllu Allpa');
    set.add('Ampliacion');
    trabajadores.forEach((t) => {
      if (t.fundo) set.add(t.fundo);
    });
    return Array.from(set).sort();
  }, [trabajadores]);

  // Dynamic modules per fundo
  const modulosList = useMemo(() => {
    const set = new Set<string>();
    if (filtroFundo === 'Santa Teresa') {
      ['M01', 'M06', 'M07', 'M08', 'M09', 'M10A', 'M10B', 'M11'].forEach((m) => set.add(m));
    } else if (filtroFundo === 'Arena Azul') {
      ['M01', 'M02', 'M03', 'M04'].forEach((m) => set.add(m));
    } else if (filtroFundo === 'Vivadis') {
      ['M01', 'M02', 'M03', 'M04', 'M05'].forEach((m) => set.add(m));
    } else if (filtroFundo === 'Ayllu Allpa') {
      ['M12', 'M13', 'M14', 'M15'].forEach((m) => set.add(m));
    } else if (filtroFundo === 'Ampliacion') {
      ['M16', 'M17', 'M18'].forEach((m) => set.add(m));
    }
    trabajadores.forEach((t) => {
      if ((!filtroFundo || t.fundo === filtroFundo) && t.modulo) {
        set.add(t.modulo);
      }
    });
    return Array.from(set).sort();
  }, [trabajadores, filtroFundo]);

  // List of groups
  const allGrupos = useMemo(() => {
    const set = new Set<string>();
    set.add('Grupo01');
    set.add('Grupo 01');
    grupos.forEach((g) => set.add(g));
    trabajadores.forEach((t) => {
      if (t.grupo) set.add(t.grupo);
    });
    return Array.from(set);
  }, [grupos, trabajadores]);

  // Derive candidate workers based on selected filters
  const candidateWorkers = useMemo(() => {
    const map = new Map<string, { worker: Trabajador; jabas: number }>();

    // 1. Calculate jabas from DetalleJabas for this date, modulo, fundo, supervisor
    const dateJabas = detalleJabas.filter((dj) => {
      const matchFecha = !filtroFecha || dj.fecha === filtroFecha;
      const matchFundo = !filtroFundo || dj.fundo.toLowerCase() === filtroFundo.toLowerCase();
      const matchMod = !filtroModulo || dj.modulo.toLowerCase() === filtroModulo.toLowerCase();
      return matchFecha && matchFundo && matchMod;
    });

    const jabasByDni: Record<string, number> = {};
    dateJabas.forEach((dj) => {
      jabasByDni[dj.dni] = (jabasByDni[dj.dni] || 0) + (Number(dj.jabas) || 0);
    });

    // 2. Filter workers from master list matching the filters
    trabajadores.forEach((t) => {
      // Filter Supervisor (flexible match)
      if (filtroSupervisor) {
        const matchesSup =
          t.supervisor &&
          (t.supervisor.toLowerCase().includes(filtroSupervisor.toLowerCase()) ||
            filtroSupervisor.toLowerCase().includes(t.supervisor.toLowerCase()));
        if (!matchesSup && t.supervisor !== filtroSupervisor) {
          // If not matching, only include if they have jabas explicitly recorded under this supervisor
          const hasJabasWithSup = dateJabas.some(
            (dj) => dj.dni === t.dni && dj.supervisor.toLowerCase() === filtroSupervisor.toLowerCase()
          );
          if (!hasJabasWithSup) return;
        }
      }

      // Filter Fundo
      if (filtroFundo && t.fundo && t.fundo.toLowerCase() !== filtroFundo.toLowerCase()) {
        const hasJabasInFundo = dateJabas.some(
          (dj) => dj.dni === t.dni && dj.fundo.toLowerCase() === filtroFundo.toLowerCase()
        );
        if (!hasJabasInFundo) return;
      }

      // Filter Modulo
      if (filtroModulo && t.modulo && t.modulo.toLowerCase() !== filtroModulo.toLowerCase()) {
        const hasJabasInMod = dateJabas.some(
          (dj) => dj.dni === t.dni && dj.modulo.toLowerCase() === filtroModulo.toLowerCase()
        );
        if (!hasJabasInMod) return;
      }

      // Filter Grupo
      if (filtroGrupo && t.grupo) {
        const normGrupoFilter = filtroGrupo.replace(/\s+/g, '').toLowerCase();
        const normWorkerGrupo = t.grupo.replace(/\s+/g, '').toLowerCase();
        if (normWorkerGrupo !== normGrupoFilter) return;
      }

      // Compute total jabas for this worker
      let calculatedJabas = jabasByDni[t.dni] || 0;
      if (calculatedJabas === 0 && t.jabas && t.jabas > 0) {
        calculatedJabas = t.jabas;
      }

      // If worker belongs to this group & fundo & supervisor, include even if 0 jabas or with default
      map.set(t.dni, { worker: t, jabas: calculatedJabas });
    });

    // Also include any workers that have DetalleJabas registered under these filters even if not in master list
    dateJabas.forEach((dj) => {
      if (!map.has(dj.dni)) {
        const syntheticWorker: Trabajador = {
          id: `T_DET_${dj.dni}`,
          fecha: dj.fecha,
          dni: dj.dni,
          nombres: dj.trabajador,
          fundo: dj.fundo,
          modulo: dj.modulo,
          supervisor: dj.supervisor,
          grupo: filtroGrupo,
          jabas: dj.jabas
        };
        map.set(dj.dni, { worker: syntheticWorker, jabas: jabasByDni[dj.dni] || dj.jabas });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.worker.nombres.localeCompare(b.worker.nombres));
  }, [trabajadores, detalleJabas, filtroFecha, filtroSupervisor, filtroFundo, filtroModulo, filtroGrupo]);

  // Synchronize validation state when candidate workers list changes or filters change
  useEffect(() => {
    setWorkerValidationState((prev) => {
      const nextState: Record<string, { conforme: boolean; observacion: string; jabas: number }> = {};
      candidateWorkers.forEach(({ worker, jabas }) => {
        if (prev[worker.dni]) {
          nextState[worker.dni] = {
            ...prev[worker.dni],
            jabas: prev[worker.dni].jabas !== undefined ? prev[worker.dni].jabas : jabas
          };
        } else {
          // Default all candidates to conforme = true
          nextState[worker.dni] = {
            conforme: true,
            observacion: '',
            jabas: jabas
          };
        }
      });
      return nextState;
    });
  }, [candidateWorkers]);

  // Filtered list for search box inside list
  const filteredList = useMemo(() => {
    if (!searchWorker.trim()) return candidateWorkers;
    const term = searchWorker.toLowerCase();
    return candidateWorkers.filter(
      (c) =>
        c.worker.nombres.toLowerCase().includes(term) ||
        c.worker.dni.includes(term) ||
        (c.worker.tipo && c.worker.tipo.toLowerCase().includes(term))
    );
  }, [candidateWorkers, searchWorker]);

  // Paso 3: Actions to bulk-check or individual toggle
  const handleCheckAll = () => {
    setWorkerValidationState((prev) => {
      const next = { ...prev };
      candidateWorkers.forEach(({ worker }) => {
        if (next[worker.dni]) {
          next[worker.dni] = { ...next[worker.dni], conforme: true, observacion: '' };
        } else {
          next[worker.dni] = { conforme: true, observacion: '', jabas: 0 };
        }
      });
      return next;
    });
    onToast(`✅ Todos los trabajadores marcados como Conformes (${candidateWorkers.length})`, 'success');
  };

  const handleAnularAll = () => {
    setWorkerValidationState((prev) => {
      const next = { ...prev };
      candidateWorkers.forEach(({ worker }) => {
        if (next[worker.dni]) {
          next[worker.dni] = { ...next[worker.dni], conforme: false, observacion: 'Anulado masivamente' };
        }
      });
      return next;
    });
    onToast('⚠️ Todos los trabajadores desmarcados / anulados', 'warning');
  };

  const toggleWorkerConforme = (dni: string) => {
    setWorkerValidationState((prev) => {
      const curr = prev[dni] || { conforme: true, observacion: '', jabas: 0 };
      const nextConforme = !curr.conforme;
      return {
        ...prev,
        [dni]: {
          ...curr,
          conforme: nextConforme,
          observacion: nextConforme ? '' : curr.observacion || 'No conforme en supervisión'
        }
      };
    });
  };

  const handleWorkerObservacionChange = (dni: string, obs: string) => {
    setWorkerValidationState((prev) => ({
      ...prev,
      [dni]: {
        ...(prev[dni] || { conforme: false, jabas: 0 }),
        observacion: obs
      }
    }));
  };

  const handleWorkerJabasChange = (dni: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setWorkerValidationState((prev) => ({
      ...prev,
      [dni]: {
        ...(prev[dni] || { conforme: true, observacion: '' }),
        jabas: num
      }
    }));
  };

  // Metrics calculation
  const totalTrabajadores = candidateWorkers.length;
  const trabajadoresConformes = candidateWorkers.filter(
    (c) => workerValidationState[c.worker.dni]?.conforme !== false
  ).length;
  const trabajadoresAnulados = totalTrabajadores - trabajadoresConformes;

  const totalJabas = candidateWorkers.reduce((acc, c) => {
    const j = workerValidationState[c.worker.dni]?.jabas !== undefined
      ? workerValidationState[c.worker.dni].jabas
      : c.jabas;
    return acc + j;
  }, 0);

  const jabasConformes = candidateWorkers.reduce((acc, c) => {
    const isConf = workerValidationState[c.worker.dni]?.conforme !== false;
    if (!isConf) return acc;
    const j = workerValidationState[c.worker.dni]?.jabas !== undefined
      ? workerValidationState[c.worker.dni].jabas
      : c.jabas;
    return acc + j;
  }, 0);

  const jabasAnuladas = totalJabas - jabasConformes;

  // Paso 4: Guardar y Enviar Validación
  const handleSubmitValidacion = () => {
    if (candidateWorkers.length === 0) {
      onToast('⚠️ No hay trabajadores en los filtros seleccionados para validar', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const items: ValidacionTrabajadorItem[] = candidateWorkers.map(({ worker, jabas }) => {
        const state = workerValidationState[worker.dni] || { conforme: true, observacion: '', jabas };
        return {
          dni: worker.dni,
          nombres: worker.nombres,
          tipo: worker.tipo || 'Cosechador',
          jabas: state.jabas,
          conforme: state.conforme,
          observacion: state.observacion
        };
      });

      const nuevaValidacion: ValidacionSupervisor = {
        id: `VAL_${filtroFecha}_${filtroModulo}_${Date.now().toString().slice(-6)}`,
        fecha: filtroFecha,
        supervisor: filtroSupervisor,
        fundo: filtroFundo,
        modulo: filtroModulo,
        grupo: filtroGrupo,
        lider: candidateWorkers[0]?.worker.lider || 'Antony Cerron',
        totalTrabajadores,
        trabajadoresConformes,
        trabajadoresAnulados,
        totalJabas,
        jabasConformes,
        items,
        estado: 'Validado',
        fechaRegistro: getLocalISO(),
        observacionesGenerales: observacionesGenerales.trim(),
        creadoPor: session.nombre
      };

      onSaveValidacion(nuevaValidacion);
      onToast(
        `✅ Validación guardada y enviada con éxito (${trabajadoresConformes} conformes, ${jabasConformes} jabas validadas)`,
        'success'
      );

      // Switch to historial or reset
      setObservacionesGenerales('');
      setActiveSubTab('historial');
    } catch (err) {
      console.error(err);
      onToast('❌ Error al guardar la validación', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Sub-Tab Switcher */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1b5e20] to-[#2e7d32] flex items-center justify-center text-white shadow-sm">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                Validación por Supervisor
              </h1>
              <span className="text-[10px] bg-[#e8f5e9] text-[#1b5e20] font-bold px-2 py-0.5 rounded-full border border-[#a5d6a7]">
                Control Oficial
              </span>
            </div>
            <p className="text-xs text-[#757575]">
              Filtrado, verificación de jabas, conformidad de personal y envío de tareo validado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#f5f5f5] p-1 rounded-xl border border-[#e0e0e0] self-stretch sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('nueva')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'nueva'
                ? 'bg-[#2e7d32] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#1b5e20]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Nueva Validación</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('monitor')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'monitor'
                ? 'bg-[#2e7d32] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#1b5e20]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Verificar Registros (Hoy)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('historial')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'historial'
                ? 'bg-[#2e7d32] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#1b5e20]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial ({validaciones.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 1: NUEVA VALIDACIÓN (PASOS 1, 2, 3 Y 4) */}
      {/* ========================================================================= */}
      {activeSubTab === 'nueva' && (
        <div className="space-y-4 animate-in fade-in">
          {/* --------------------------------------------------------------------- */}
          {/* PASO 1: FILTROS (Fecha, Supervisor, Fundo, Modulo, Grupo) */}
          {/* --------------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#e8f5e9] flex items-center justify-center text-[#1b5e20] text-xs font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1b5e20]">
                    Paso 1: Filtros de Selección
                  </h2>
                  <p className="text-[11px] text-[#757575]">
                    Especifica los criterios para cargar la cuadrilla y avance correspondiente
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFiltroFecha(getLocalToday())}
                  className="text-[11px] text-[#2e7d32] bg-[#e8f5e9] hover:bg-[#c8e6c9] px-2 py-0.5 rounded-md font-semibold cursor-pointer"
                >
                  Hoy
                </button>
              </div>
            </div>

            {/* Grid de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Fecha */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Fecha *</span>
                </label>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                />
              </div>

              {/* Supervisor */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Supervisor *</span>
                </label>
                <select
                  value={filtroSupervisor}
                  onChange={(e) => setFiltroSupervisor(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                >
                  <option value="">Todos los supervisores...</option>
                  {supervisoresList.map((sup) => (
                    <option key={sup} value={sup}>
                      {sup}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fundo */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Fundo *</span>
                </label>
                <select
                  value={filtroFundo}
                  onChange={(e) => {
                    setFiltroFundo(e.target.value);
                    setFiltroModulo('M01');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                >
                  <option value="">Todos los fundos...</option>
                  {fundosList.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Módulo */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Módulo *</span>
                </label>
                <select
                  value={filtroModulo}
                  onChange={(e) => setFiltroModulo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                >
                  <option value="">Todos los módulos...</option>
                  {modulosList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grupo */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <Users className="w-3.5 h-3.5" />
                  <span>Grupo *</span>
                </label>
                <select
                  value={filtroGrupo}
                  onChange={(e) => setFiltroGrupo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                >
                  <option value="">Todos los grupos...</option>
                  {allGrupos.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* PASO 2 & 3: LISTADO DE TRABAJADORES CON SUS JABAS Y BOTONES DE CHECK */}
          {/* --------------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5">
            {/* Header de la Lista con Indicadores Clave */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 pb-3 border-b border-[#f0f0f0] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#e8f5e9] flex items-center justify-center text-[#1b5e20] text-xs font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1b5e20]">
                    Paso 2 y 3: Lista de Trabajadores y Validación Individual
                  </h2>
                  <p className="text-[11px] text-[#757575]">
                    Verifica las jabas de cada personal. Haz check masivo o anula uno por uno si no es conforme.
                  </p>
                </div>
              </div>

              {/* Métricas en Vivo */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-[#f5f5f5] px-2.5 py-1 rounded-lg border border-gray-200 text-center">
                  <span className="text-[10px] text-gray-500 font-bold block">Personal</span>
                  <span className="text-xs font-black text-gray-800">{totalTrabajadores}</span>
                </div>
                <div className="bg-[#e8f5e9] px-2.5 py-1 rounded-lg border border-[#a5d6a7] text-center">
                  <span className="text-[10px] text-[#1b5e20] font-bold block">Conformes</span>
                  <span className="text-xs font-black text-[#1b5e20]">{trabajadoresConformes}</span>
                </div>
                {trabajadoresAnulados > 0 && (
                  <div className="bg-[#ffebee] px-2.5 py-1 rounded-lg border border-[#ffcdd2] text-center">
                    <span className="text-[10px] text-[#c62828] font-bold block">Anulados</span>
                    <span className="text-xs font-black text-[#c62828]">{trabajadoresAnulados}</span>
                  </div>
                )}
                <div className="bg-[#fff8e1] px-3 py-1 rounded-lg border border-[#ffe082] text-center">
                  <span className="text-[10px] text-[#e65100] font-bold block">Jabas Conformes</span>
                  <span className="text-xs font-black text-[#e65100]">
                    {jabasConformes} <span className="text-[10px] font-normal text-gray-500">/ {totalJabas}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de Acciones Masivas y Buscador (Paso 3) */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 mb-3.5 bg-[#fcf9f8] p-3 rounded-xl border border-[#e0e0e0]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar trabajador por nombre o DNI en esta cuadrilla..."
                  value={searchWorker}
                  onChange={(e) => setSearchWorker(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#bfcaba] rounded-lg focus:outline-none focus:border-[#2e7d32] bg-white"
                />
              </div>

              {/* Botón Escanear Cámara y Acciones Masivas */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="bg-[#ff8f00] hover:bg-[#e65100] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                  title="Escanear DNI o código del fotocheck con la cámara"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Escanear DNI</span>
                </button>
                <button
                  type="button"
                  onClick={handleCheckAll}
                  className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                  title="Marcar a todos los trabajadores como conformes"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Check a Todos</span>
                </button>
                <button
                  type="button"
                  onClick={handleAnularAll}
                  className="bg-white hover:bg-gray-100 text-gray-700 border border-[#bfcaba] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                  title="Desmarcar a todos para revisión individual"
                >
                  <XSquare className="w-3.5 h-3.5 text-gray-500" />
                  <span>Desmarcar Todos</span>
                </button>
              </div>
            </div>

            {/* Listado de Trabajadores con Jabas y Botón Individual de Conformidad */}
            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-[#fafafa] rounded-xl border border-dashed border-gray-200">
                <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                No se encontraron trabajadores con los filtros actuales ({filtroFundo}, {filtroModulo}, {filtroGrupo}).
                <div className="text-[11px] text-gray-400 mt-1">
                  Intenta cambiar el grupo o módulo, o registra el avance en la pestaña Personal.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredList.map(({ worker, jabas }) => {
                  const state = workerValidationState[worker.dni] || {
                    conforme: true,
                    observacion: '',
                    jabas: jabas
                  };
                  const isConforme = state.conforme;
                  const currentJabas = state.jabas !== undefined ? state.jabas : jabas;

                  return (
                    <div
                      key={worker.dni}
                      className={`p-3 rounded-xl border transition-all ${
                        isConforme
                          ? 'bg-white border-[#e0e0e0] hover:border-[#a5d6a7]'
                          : 'bg-[#fff5f5] border-[#ffcdd2]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Info Trabajador */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-gray-900">
                              {worker.nombres}
                            </span>
                            <span className="text-[10px] bg-[#f5f5f5] text-gray-700 px-2 py-0.5 rounded-full font-semibold border border-gray-200">
                              DNI: {worker.dni}
                            </span>
                            {worker.tipo && (
                              <span className="text-[10px] bg-[#e8f5e9] text-[#1b5e20] px-2 py-0.5 rounded-full font-semibold">
                                {worker.tipo}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2">
                            <span>{worker.fundo || filtroFundo} · {worker.modulo || filtroModulo}</span>
                            <span>·</span>
                            <span>Grupo: {worker.grupo || filtroGrupo}</span>
                            {worker.supervisor && (
                              <>
                                <span>·</span>
                                <span>Sup: {worker.supervisor}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Controles: Jabas y Botón Toggle Conforme / Anular */}
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          {/* Input de Jabas */}
                          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Jabas:</span>
                            <input
                              type="number"
                              min="0"
                              value={currentJabas}
                              onChange={(e) => handleWorkerJabasChange(worker.dni, e.target.value)}
                              className="w-14 text-center font-extrabold text-xs text-[#1b5e20] bg-white border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-[#2e7d32]"
                            />
                          </div>

                          {/* Botón de Conformidad / Anular Uno por Uno (Paso 3) */}
                          <button
                            type="button"
                            onClick={() => toggleWorkerConforme(worker.dni)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs ${
                              isConforme
                                ? 'bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b5e20] border border-[#a5d6a7]'
                                : 'bg-[#d32f2f] hover:bg-[#b71c1c] text-white border border-[#b71c1c]'
                            }`}
                            title={isConforme ? 'Click para anular o marcar no conforme' : 'Click para validar conforme'}
                          >
                            {isConforme ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Conforme</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5" />
                                <span>Anulado</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Si está no conforme / anulado, mostrar campo para observación */}
                      {!isConforme && (
                        <div className="mt-2.5 pt-2 border-t border-[#ffcdd2] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#c62828] whitespace-nowrap">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Motivo de anulación / no conforme:</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Ej: Jaba con fruto inmaduro / No coincide en campo / Salida anticipada..."
                            value={state.observacion || ''}
                            onChange={(e) => handleWorkerObservacionChange(worker.dni, e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs border border-[#ffcdd2] rounded-lg bg-white text-gray-800 focus:outline-none focus:border-[#c62828]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* PASO 4: RESUMEN FINAL, OBSERVACIONES Y GUARDAR/ENVIAR */}
          {/* --------------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#f0f0f0]">
              <div className="w-7 h-7 rounded-lg bg-[#e8f5e9] flex items-center justify-center text-[#1b5e20] text-xs font-bold">
                4
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#1b5e20]">
                  Paso 4: Resumen de Validación y Envío Oficial
                </h2>
                <p className="text-[11px] text-[#757575]">
                  Revisa el consolidado y confirma el envío de la validación
                </p>
              </div>
            </div>

            {/* Tarjeta de Resumen Consolidado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Bloque Metadatos */}
              <div className="bg-[#fafafa] p-3.5 rounded-xl border border-[#e0e0e0] space-y-1.5 text-xs">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide block">
                  Información de Cuadrilla
                </span>
                <div className="font-bold text-gray-800">
                  📅 Fecha: <span className="font-normal text-gray-600">{filtroFecha}</span>
                </div>
                <div className="font-bold text-gray-800">
                  👤 Supervisor: <span className="font-normal text-gray-600">{filtroSupervisor}</span>
                </div>
                <div className="font-bold text-gray-800">
                  📍 Ubicación: <span className="font-normal text-gray-600">{filtroFundo} - {filtroModulo}</span>
                </div>
                <div className="font-bold text-gray-800">
                  👥 Grupo: <span className="font-normal text-gray-600">{filtroGrupo}</span>
                </div>
              </div>

              {/* Bloque Balance de Personal */}
              <div className="bg-[#fafafa] p-3.5 rounded-xl border border-[#e0e0e0] space-y-2 text-xs">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide block">
                  Balance de Personal
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Evaluados:</span>
                  <span className="font-bold text-gray-900">{totalTrabajadores} trabajadores</span>
                </div>
                <div className="flex justify-between items-center text-[#1b5e20]">
                  <span className="font-semibold">Conformes (Aprobados):</span>
                  <span className="font-extrabold">{trabajadoresConformes}</span>
                </div>
                <div className="flex justify-between items-center text-[#c62828]">
                  <span className="font-semibold">Anulados / Rechazados:</span>
                  <span className="font-extrabold">{trabajadoresAnulados}</span>
                </div>
              </div>

              {/* Bloque Balance de Jabas */}
              <div className="bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] p-3.5 rounded-xl border border-[#a5d6a7] flex flex-col justify-center text-center">
                <span className="text-[10px] text-[#1b5e20] uppercase font-bold tracking-wider">
                  Total Jabas Validadas
                </span>
                <div className="text-3xl font-black text-[#1b5e20] my-0.5">
                  {jabasConformes}
                </div>
                <span className="text-[10px] text-gray-600">
                  De un total bruto de {totalJabas} jabas ({jabasAnuladas} descontadas)
                </span>
              </div>
            </div>

            {/* Observaciones Generales del Supervisor */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Observaciones Generales de la Validación (Opcional):
              </label>
              <textarea
                rows={2}
                placeholder="Ingresa comentarios de supervisión, condiciones del campo, calidad de fruta o notas relevantes..."
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
              />
            </div>

            {/* Botón Principal: Guardar Validación y Enviar */}
            <button
              type="button"
              disabled={isSubmitting || candidateWorkers.length === 0}
              onClick={handleSubmitValidacion}
              className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] ${
                isSubmitting || candidateWorkers.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#2e7d32] hover:bg-[#1b5e20] text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Guardar Validación y Enviar</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 2: HISTORIAL DE VALIDACIONES REGISTRADAS */}
      {/* ========================================================================= */}
      {activeSubTab === 'historial' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] flex items-center justify-center text-[#1b5e20]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1b5e20]">
                    Historial de Validaciones de Supervisión
                  </h2>
                  <p className="text-xs text-[#757575]">
                    Registro de cuadrillas y tareos validados y enviados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('nueva')}
                className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>+ Nueva</span>
              </button>
            </div>

            {validaciones.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-[#fafafa] rounded-xl border border-dashed border-gray-200">
                <FileCheck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                Aún no hay validaciones registradas en el sistema.
                <div className="text-[11px] text-gray-400 mt-1">
                  Completa el formulario en "Nueva Validación" para registrar la primera.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {validaciones.map((val) => {
                  const isExpanded = expandedHistId === val.id;
                  return (
                    <div
                      key={val.id}
                      className="border border-[#e0e0e0] rounded-xl overflow-hidden bg-white shadow-2xs hover:border-[#a5d6a7] transition-all"
                    >
                      {/* Cabecera del Item */}
                      <div
                        onClick={() => setExpandedHistId(isExpanded ? null : val.id)}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-[#fafafa] hover:bg-[#f5f5f5]"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-[#1b5e20]">
                              ID: {val.id}
                            </span>
                            <span className="text-[10px] bg-[#e8f5e9] text-[#1b5e20] px-2 py-0.5 rounded-full font-bold border border-[#a5d6a7]">
                              {val.estado || 'Validado'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 flex flex-wrap items-center gap-2">
                            <span>📅 {val.fecha}</span>
                            <span>·</span>
                            <span>📍 {val.fundo} - {val.modulo}</span>
                            <span>·</span>
                            <span>👥 {val.grupo}</span>
                            <span>·</span>
                            <span>👤 Sup: {val.supervisor}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <div className="text-sm font-black text-[#1b5e20]">
                              {val.jabasConformes} Jabas
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {val.trabajadoresConformes} / {val.totalTrabajadores} personal
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Detalle Desplegable */}
                      {isExpanded && (
                        <div className="p-3.5 border-t border-[#e0e0e0] bg-white space-y-3 text-xs animate-in fade-in">
                          {val.observacionesGenerales && (
                            <div className="bg-[#fff8e1] p-2.5 rounded-lg border border-[#ffe082] text-xs text-[#e65100]">
                              <span className="font-bold">Observaciones: </span>
                              {val.observacionesGenerales}
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-gray-700 mb-1.5 uppercase text-[10px] tracking-wide">
                              Detalle Individual de Personal ({val.items?.length || 0})
                            </div>
                            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-gray-100 rounded-lg p-1.5 bg-[#fafafa]">
                              {val.items?.map((it, idx) => (
                                <div
                                  key={`${it.dni}_${idx}`}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 text-xs"
                                >
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-gray-900">
                                      {it.nombres}{' '}
                                      <span className="text-[10px] text-gray-500 font-normal">
                                        ({it.dni})
                                      </span>
                                    </div>
                                    {it.observacion && (
                                      <div className="text-[10px] text-[#c62828] italic">
                                        Obs: {it.observacion}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-[#1b5e20]">{it.jabas} jabas</span>
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        it.conforme
                                          ? 'bg-[#e8f5e9] text-[#1b5e20]'
                                          : 'bg-[#ffebee] text-[#c62828]'
                                      }`}
                                    >
                                      {it.conforme ? 'Conforme' : 'Anulado'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="text-[10px] text-gray-400 text-right">
                            Registrado por {val.creadoPor || val.supervisor} · {val.fechaRegistro}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 2: MONITOR DE VERIFICACIÓN DE REGISTROS EN VIVO */}
      {/* ========================================================================= */}
      {activeSubTab === 'monitor' && (
        <div className="animate-in fade-in">
          <RegistroStatusMonitor
            trabajadores={trabajadores}
            detalleJabas={detalleJabas}
            validaciones={validaciones}
          />
        </div>
      )}

      {/* Modal de Escáner DNI con Cámara */}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanDni={handleScanWorkerDni}
        trabajadores={trabajadores}
        mode="worker"
      />
    </div>
  );
};
