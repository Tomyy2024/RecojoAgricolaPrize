import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trabajador, 
  DetalleJaba, 
  UserSession, 
  ValidacionSupervisor, 
  ValidacionTrabajadorItem,
  Programa,
  Lider
} from '../types';
import { 
  getLocalToday, 
  getLocalISO, 
  formatDateDDMMAAAA, 
  normalizeDateString,
  cleanValidacionesList,
  isValidValidacion,
  purgeAllEmptyRecords
} from '../utils/storage';
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
  Camera,
  Info,
  Crown,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Zap,
  Lock
} from 'lucide-react';

interface ValidacionTabProps {
  session: UserSession;
  trabajadores: Trabajador[];
  detalleJabas: DetalleJaba[];
  programas?: Programa[];
  lideres?: Lider[];
  validaciones: ValidacionSupervisor[];
  grupos: string[];
  onSaveValidacion: (validacion: ValidacionSupervisor) => void;
  onDeleteValidacion?: (valId: string) => void;
  onDeleteLider?: (liderNameOrDni: string) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ValidacionTab: React.FC<ValidacionTabProps> = ({
  session,
  trabajadores,
  detalleJabas,
  programas = [],
  lideres = [],
  validaciones,
  grupos,
  onSaveValidacion,
  onDeleteValidacion,
  onDeleteLider,
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
    isSupervisor ? sessionSupervisorName : ''
  );
  const [filtroFundo, setFiltroFundo] = useState<string>('');
  const [filtroModulo, setFiltroModulo] = useState<string>('');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('');
  const [filtroLider, setFiltroLider] = useState<string>('');
  const [showManageLeadersModal, setShowManageLeadersModal] = useState<boolean>(false);

  // Filtro de Estado de Validación en Paso 2: 'pendientes' (default), 'validados', 'todos'
  const [estadoFiltro, setEstadoFiltro] = useState<'pendientes' | 'validados' | 'todos'>('pendientes');

  // Normalization Helpers
  const normalizeStr = (text?: string) =>
    (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const normalizeModulo = (mod?: string) => {
    const n = normalizeStr(mod).replace(/\s+/g, '');
    return n.replace(/^modulo/, 'm').replace(/^m0*(\d+)/, 'm$1');
  };

  const normalizeDate = (d?: string) => {
    return normalizeDateString(d);
  };

  const normalizeGrupo = (g?: string) => {
    return normalizeStr(g).replace(/\s+/g, '');
  };

  const isMatchingSupervisor = (itemSup?: string, filterSup?: string) => {
    if (!filterSup || filterSup.trim() === '') return true;
    if (!itemSup || itemSup.trim() === '') return true;
    const iSup = normalizeStr(itemSup);
    const fSup = normalizeStr(filterSup);
    if (iSup === fSup || iSup.includes(fSup) || fSup.includes(iSup)) return true;
    
    const wordsI = iSup.split(/\s+/).filter(Boolean);
    const wordsF = fSup.split(/\s+/).filter(Boolean);
    if (wordsI.length >= 2 && wordsF.length >= 2) {
      const prefixI = wordsI.slice(0, 2).join(' ');
      const prefixF = wordsF.slice(0, 2).join(' ');
      if (prefixI === prefixF || iSup.includes(prefixF) || fSup.includes(prefixI)) return true;
    }
    return false;
  };

  // Combined leaders list (from state + real records) - strictly deduplicated by normalized name
  const availableLideres = useMemo(() => {
    const map = new Map<string, { nombre: string; dni: string }>();

    const addLeader = (rawName?: string, rawDni?: string) => {
      if (!rawName || !rawName.trim()) return;
      const cleanName = rawName.trim();
      const normKey = cleanName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      if (!map.has(normKey)) {
        map.set(normKey, { nombre: cleanName, dni: rawDni ? rawDni.trim() : '' });
      } else if (rawDni && !map.get(normKey)?.dni) {
        map.get(normKey)!.dni = rawDni.trim();
      }
    };

    // 1. Explicitly created leaders (primary source)
    lideres.forEach((l) => {
      addLeader(l.lider || l.nombres, l.dni);
    });

    // 2. Worker references
    trabajadores.forEach((t) => {
      addLeader(t.lider, t.tipo === 'Líder' ? t.dni : '');
    });

    // 3. Detalle jabas references
    detalleJabas.forEach((dj) => {
      addLeader(dj.lider, '');
    });

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [lideres, trabajadores, detalleJabas]);

  // Búsqueda rápida dentro de la lista de trabajadores
  const [searchWorker, setSearchWorker] = useState<string>('');

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
    trabajadores.forEach((t) => {
      if (t.supervisor && t.supervisor.trim()) set.add(t.supervisor.trim());
    });
    detalleJabas.forEach((dj) => {
      if (dj.supervisor && dj.supervisor.trim()) set.add(dj.supervisor.trim());
    });
    return Array.from(set).sort();
  }, [trabajadores, detalleJabas, isSupervisor, sessionSupervisorName]);

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
    detalleJabas.forEach((dj) => {
      if (dj.fundo) set.add(dj.fundo);
    });
    return Array.from(set).sort();
  }, [trabajadores, detalleJabas]);

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
      if ((!filtroFundo || normalizeStr(t.fundo) === normalizeStr(filtroFundo)) && t.modulo) {
        set.add(t.modulo);
      }
    });
    detalleJabas.forEach((dj) => {
      if ((!filtroFundo || normalizeStr(dj.fundo) === normalizeStr(filtroFundo)) && dj.modulo) {
        set.add(dj.modulo);
      }
    });
    return Array.from(set).sort();
  }, [trabajadores, detalleJabas, filtroFundo]);

  // List of groups
  const allGrupos = useMemo(() => {
    const set = new Set<string>();
    grupos.forEach((g) => {
      if (g && g.trim()) set.add(g.trim());
    });
    trabajadores.forEach((t) => {
      if (t.grupo && t.grupo.trim()) set.add(t.grupo.trim());
    });
    detalleJabas.forEach((dj) => {
      if (dj.grupo && dj.grupo.trim()) set.add(dj.grupo.trim());
    });
    return Array.from(set).sort();
  }, [grupos, trabajadores, detalleJabas]);

  // Clean validaciones list (discard any corrupted or empty records with 0 jabas and empty fields)
  const validValidaciones = useMemo(() => {
    return cleanValidacionesList(validaciones);
  }, [validaciones]);

  const emptyValidacionesCount = validaciones.length - validValidaciones.length;

  // Map of already validated workers for the selected date: clean DNI -> Validation Info
  const alreadyValidatedMap = useMemo(() => {
    const map = new Map<
      string,
      {
        validacionId: string;
        supervisor: string;
        conforme: boolean;
        jabas: number;
        fechaRegistro: string;
        fecha: string;
        modulo?: string;
        fundo?: string;
      }
    >();

    const targetDate = normalizeDate(filtroFecha);

    validValidaciones.forEach((val) => {
      const valDate = normalizeDate(val.fecha);
      if (!valDate || valDate !== targetDate) return;

      if (val.items && Array.isArray(val.items)) {
        val.items.forEach((it) => {
          const dniClean = String(it.dni || '').trim();
          if (dniClean) {
            map.set(dniClean, {
              validacionId: val.id,
              supervisor: val.supervisor,
              conforme: it.conforme !== false,
              jabas: it.jabas,
              fechaRegistro: val.fechaRegistro,
              fecha: val.fecha,
              modulo: val.modulo,
              fundo: val.fundo
            });
          }
        });
      }
    });
    return map;
  }, [validValidaciones, filtroFecha]);

  // Derive candidate workers based on selected filters (STRICTLY ONLY WORKERS WITH JABAS > 0)
  const allCandidateWorkers = useMemo(() => {
    const map = new Map<
      string,
      {
        worker: Trabajador;
        jabas: number;
        isValidated: boolean;
        validationInfo?: {
          validacionId: string;
          supervisor: string;
          conforme: boolean;
          jabas: number;
          fechaRegistro: string;
          fecha: string;
          modulo?: string;
          fundo?: string;
        };
      }
    >();

    // 1. Calculate and accumulate jabas from DetalleJabas matching the filters
    const matchingDetalle = detalleJabas.filter((dj) => {
      if (filtroFecha) {
        const djDate = normalizeDate(dj.fecha);
        const fDate = normalizeDate(filtroFecha);
        if (djDate && fDate && djDate !== fDate) return false;
      }

      if (filtroFundo) {
        const djFundo = normalizeStr(dj.fundo);
        const fFundo = normalizeStr(filtroFundo);
        if (djFundo && fFundo && djFundo !== fFundo && !djFundo.includes(fFundo) && !fFundo.includes(djFundo)) {
          return false;
        }
      }

      if (filtroModulo) {
        const djMod = normalizeModulo(dj.modulo);
        const fMod = normalizeModulo(filtroModulo);
        if (djMod && fMod && djMod !== fMod) return false;
      }

      if (filtroGrupo) {
        const djGrp = normalizeGrupo(dj.grupo);
        const fGrp = normalizeGrupo(filtroGrupo);
        if (djGrp && fGrp && djGrp !== fGrp) return false;
      }

      if (filtroSupervisor) {
        if (!isMatchingSupervisor(dj.supervisor, filtroSupervisor)) return false;
      }

      return Number(dj.jabas) > 0;
    });

    const jabasByDni: Record<string, number> = {};
    const metaByDni: Record<string, DetalleJaba> = {};
    matchingDetalle.forEach((dj) => {
      const num = Number(dj.jabas) || 0;
      const cleanDni = String(dj.dni || '').trim();
      if (num > 0 && cleanDni) {
        jabasByDni[cleanDni] = (jabasByDni[cleanDni] || 0) + num;
        metaByDni[cleanDni] = dj;
      }
    });

    // 2. Also check programas.avance if any match the active filters
    if (programas && programas.length > 0) {
      programas.forEach((p) => {
        if (filtroFecha && normalizeDate(p.fecha) !== normalizeDate(filtroFecha)) return;
        if (filtroFundo && normalizeStr(p.fundo) !== normalizeStr(filtroFundo)) return;
        if (filtroModulo && normalizeModulo(p.modulo) !== normalizeModulo(filtroModulo)) return;
        if (filtroSupervisor && !isMatchingSupervisor(p.supervisor, filtroSupervisor)) return;

        if (p.avance) {
          Object.entries(p.avance).forEach(([dni, jVal]) => {
            const cleanDni = String(dni || '').trim();
            const num = Number(jVal) || 0;
            if (num > 0 && cleanDni && !jabasByDni[cleanDni]) {
              jabasByDni[cleanDni] = num;
            }
          });
        }
      });
    }

    // 3. For workers in master list, attach their calculated jabas ONLY IF > 0
    trabajadores.forEach((t) => {
      if (!t.dni) return;
      const cleanDni = String(t.dni || '').trim();
      if (!cleanDni) return;

      let jCount = jabasByDni[cleanDni] || 0;

      // If no advance in detalleJabas, check if worker had jabas in master record matching current filter
      if (jCount === 0 && t.jabas && t.jabas > 0) {
        const matchesDate = !filtroFecha || !t.fecha || normalizeDate(t.fecha) === normalizeDate(filtroFecha);
        const matchesFundo = !filtroFundo || !t.fundo || normalizeStr(t.fundo) === normalizeStr(filtroFundo);
        const matchesModulo = !filtroModulo || !t.modulo || normalizeModulo(t.modulo) === normalizeModulo(filtroModulo);
        const matchesGrupo = !filtroGrupo || !t.grupo || normalizeGrupo(t.grupo) === normalizeGrupo(filtroGrupo);
        const matchesSup = isMatchingSupervisor(t.supervisor, filtroSupervisor);

        if (matchesDate && matchesFundo && matchesModulo && matchesGrupo && matchesSup) {
          jCount = t.jabas;
        }
      }

      // STRICT CHECK: Only include workers who have jabas > 0!
      if (jCount > 0) {
        const assignedLider =
          metaByDni[cleanDni]?.lider ||
          t.lider ||
          filtroLider ||
          (availableLideres.length > 0 ? availableLideres[0].nombre : 'Antony Cerron');

        const vInfo = alreadyValidatedMap.get(cleanDni);

        map.set(cleanDni, {
          worker: {
            ...t,
            dni: cleanDni,
            grupo: t.grupo || filtroGrupo,
            supervisor: t.supervisor || filtroSupervisor,
            lider: assignedLider
          },
          jabas: jCount,
          isValidated: !!vInfo,
          validationInfo: vInfo
        });
      }
    });

    // 4. Also include any workers that have DetalleJabas registered under these filters even if not in master list
    matchingDetalle.forEach((dj) => {
      const cleanDni = String(dj.dni || '').trim();
      if (cleanDni && !map.has(cleanDni)) {
        const syntheticWorker: Trabajador = {
          id: `T_DET_${cleanDni}`,
          fecha: dj.fecha,
          dni: cleanDni,
          nombres: dj.trabajador,
          fundo: dj.fundo,
          modulo: dj.modulo,
          supervisor: dj.supervisor || filtroSupervisor,
          grupo: dj.grupo || filtroGrupo,
          lider: dj.lider || filtroLider || 'Antony Cerron',
          tipo: 'Cosechador',
          jabas: jabasByDni[cleanDni] || dj.jabas
        };
        const vInfo = alreadyValidatedMap.get(cleanDni);
        map.set(cleanDni, { 
          worker: syntheticWorker, 
          jabas: jabasByDni[cleanDni] || dj.jabas,
          isValidated: !!vInfo,
          validationInfo: vInfo
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.worker.nombres.localeCompare(b.worker.nombres));
  }, [trabajadores, detalleJabas, programas, availableLideres, alreadyValidatedMap, filtroFecha, filtroSupervisor, filtroFundo, filtroModulo, filtroGrupo, filtroLider]);

  // Counts of pending vs validated candidates
  const totalCandidateCount = allCandidateWorkers.length;
  const validatedCount = allCandidateWorkers.filter((c) => c.isValidated).length;
  const pendingCount = totalCandidateCount - validatedCount;

  // Active candidates list according to estadoFiltro ('pendientes' excludes already validated)
  const candidateWorkers = useMemo(() => {
    if (estadoFiltro === 'pendientes') {
      return allCandidateWorkers.filter((c) => !c.isValidated);
    }
    if (estadoFiltro === 'validados') {
      return allCandidateWorkers.filter((c) => c.isValidated);
    }
    return allCandidateWorkers;
  }, [allCandidateWorkers, estadoFiltro]);

  // Synchronize validation state when candidate workers list changes or filters change
  useEffect(() => {
    setWorkerValidationState((prev) => {
      const nextState: Record<string, { conforme: boolean; observacion: string; jabas: number }> = {};
      candidateWorkers.forEach(({ worker, jabas, validationInfo }) => {
        if (prev[worker.dni]) {
          nextState[worker.dni] = {
            ...prev[worker.dni],
            jabas: prev[worker.dni].jabas !== undefined ? prev[worker.dni].jabas : jabas
          };
        } else if (validationInfo) {
          nextState[worker.dni] = {
            conforme: validationInfo.conforme,
            observacion: '',
            jabas: validationInfo.jabas
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

  // Quick instant validation of an individual worker
  const handleValidateSingleWorker = (worker: Trabajador, jabas: number) => {
    const cleanDni = String(worker.dni || '').trim();
    if (alreadyValidatedMap.has(cleanDni)) {
      onToast(`⚠️ El trabajador ${worker.nombres} ya fue validado anteriormente para esta fecha`, 'warning');
      return;
    }

    const state = workerValidationState[worker.dni] || { conforme: true, observacion: '', jabas };
    const item: ValidacionTrabajadorItem = {
      dni: cleanDni,
      nombres: worker.nombres,
      tipo: worker.tipo || 'Cosechador',
      jabas: state.jabas !== undefined ? state.jabas : jabas,
      conforme: state.conforme !== false,
      observacion: state.observacion
    };

    const singleVal: ValidacionSupervisor = {
      id: `VAL_${filtroFecha}_${filtroModulo || 'GEN'}_${cleanDni}_${Date.now().toString().slice(-4)}`,
      fecha: filtroFecha,
      supervisor: filtroSupervisor || sessionSupervisorName,
      fundo: filtroFundo || worker.fundo || 'Fundo General',
      modulo: filtroModulo || worker.modulo || 'M01',
      grupo: filtroGrupo || worker.grupo || 'Grupo 01',
      lider: worker.lider || filtroLider || 'Antony Cerron',
      totalTrabajadores: 1,
      trabajadoresConformes: item.conforme ? 1 : 0,
      trabajadoresAnulados: item.conforme ? 0 : 1,
      totalJabas: item.jabas,
      jabasConformes: item.conforme ? item.jabas : 0,
      items: [item],
      estado: 'Validado',
      fechaRegistro: getLocalISO(),
      observacionesGenerales: `Validación individual rápida para ${worker.nombres}`,
      creadoPor: session.nombre
    };

    onSaveValidacion(singleVal);
    onToast(`✅ Trabajador ${worker.nombres} validado con éxito (${item.jabas} jabas). Trasladado a Validados.`, 'success');
  };

  // Paso 4: Guardar y Enviar Validación de Cuadrilla / Selección
  const handleSubmitValidacion = () => {
    // STRICT FILTER: Only include workers that are NOT already validated!
    const pendingToSubmit = candidateWorkers.filter((c) => !c.isValidated);

    if (pendingToSubmit.length === 0) {
      onToast('⚠️ Todos los trabajadores seleccionados ya fueron validados previamente. No se permiten registros duplicados.', 'warning');
      return;
    }

    const conformesToSubmit = pendingToSubmit.filter(
      (c) => workerValidationState[c.worker.dni]?.conforme !== false
    );

    if (conformesToSubmit.length === 0) {
      onToast('⚠️ No hay trabajadores conformes pendientes para validar en esta cuadrilla.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const items: ValidacionTrabajadorItem[] = pendingToSubmit.map(({ worker, jabas }) => {
        const state = workerValidationState[worker.dni] || { conforme: true, observacion: '', jabas };
        return {
          dni: String(worker.dni || '').trim(),
          nombres: worker.nombres,
          tipo: worker.tipo || 'Cosechador',
          jabas: state.jabas !== undefined ? state.jabas : jabas,
          conforme: state.conforme !== false,
          observacion: state.observacion
        };
      });

      const totalT = items.length;
      const confT = items.filter((i) => i.conforme !== false).length;
      const anulT = totalT - confT;
      const totJ = items.reduce((acc, i) => acc + (i.jabas || 0), 0);
      const confJ = items.reduce((acc, i) => acc + (i.conforme !== false ? (i.jabas || 0) : 0), 0);

      const nuevaValidacion: ValidacionSupervisor = {
        id: `VAL_${filtroFecha}_${filtroModulo || 'GEN'}_${Date.now().toString().slice(-6)}`,
        fecha: filtroFecha,
        supervisor: filtroSupervisor || sessionSupervisorName,
        fundo: filtroFundo || 'Fundo General',
        modulo: filtroModulo || 'M01',
        grupo: filtroGrupo || 'Grupo 01',
        lider: pendingToSubmit[0]?.worker.lider || filtroLider || 'Antony Cerron',
        totalTrabajadores: totalT,
        trabajadoresConformes: confT,
        trabajadoresAnulados: anulT,
        totalJabas: totJ,
        jabasConformes: confJ,
        items,
        estado: 'Validado',
        fechaRegistro: getLocalISO(),
        observacionesGenerales: observacionesGenerales.trim(),
        creadoPor: session.nombre
      };

      onSaveValidacion(nuevaValidacion);
      onToast(
        `✅ Validación oficial guardada con éxito (${confT} conformes, ${confJ} jabas validadas). El personal validado ya no aparecerá como pendiente.`,
        'success'
      );

      // Reset observations and ensure view is on pendientes
      setObservacionesGenerales('');
      setEstadoFiltro('pendientes');
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
            <span>Verificar Registros ({formatDateDDMMAAAA(filtroFecha)})</span>
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
                    Paso 1: Filtros de Selección de Cuadrilla
                  </h2>
                  <p className="text-[11px] text-[#757575]">
                    Especifica los criterios para cargar el personal y las jabas cosechadas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  Fecha seleccionada: <strong className="text-[#1b5e20]">{formatDateDDMMAAAA(filtroFecha)}</strong>
                </span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

              {/* Líder */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#e65100]">
                    <Crown className="w-3.5 h-3.5 text-[#ff8f00]" />
                    <span>Líder Asignado *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManageLeadersModal(true)}
                    className="text-[10px] text-red-700 hover:text-red-900 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                    title="Gestionar y eliminar líderes"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Gestionar</span>
                  </button>
                </div>
                <select
                  value={filtroLider}
                  onChange={(e) => setFiltroLider(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#ffe082] bg-[#fffde7] font-bold text-[#e65100] focus:outline-none focus:border-[#e65100]"
                >
                  {availableLideres.map((l, idx) => (
                    <option key={`${l.nombre}-${idx}`} value={l.nombre}>
                      👑 {l.nombre}
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
                    Verifica las jabas de cada personal. Los ya validados se ocultan automáticamente para evitar duplicados.
                  </p>
                </div>
              </div>

              {/* Filtro de Estado: Pendientes (Default) vs Validados vs Todos */}
              <div className="flex bg-[#f5f5f5] p-1 rounded-xl border border-gray-200 gap-1">
                <button
                  type="button"
                  onClick={() => setEstadoFiltro('pendientes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    estadoFiltro === 'pendientes'
                      ? 'bg-[#ff8f00] text-white shadow-2xs'
                      : 'text-[#e65100] hover:bg-amber-50'
                  }`}
                  title="Mostrar solo trabajadores pendientes de validación"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendientes ({pendingCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEstadoFiltro('validados')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    estadoFiltro === 'validados'
                      ? 'bg-[#1b5e20] text-white shadow-2xs'
                      : 'text-[#1b5e20] hover:bg-emerald-50'
                  }`}
                  title="Mostrar trabajadores que ya fueron validados hoy"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Ya Validados ({validatedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEstadoFiltro('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    estadoFiltro === 'todos'
                      ? 'bg-gray-800 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Mostrar todo el personal (pendientes y validados)"
                >
                  Todos ({totalCandidateCount})
                </button>
              </div>
            </div>

            {/* Barra de Acciones Masivas y Buscador (Paso 3) */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 mb-3.5 bg-[#fcf9f8] p-3 rounded-xl border border-[#e0e0e0]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar trabajador por nombre o DNI..."
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
                  title="Marcar a todos los trabajadores mostrados como conformes"
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
              estadoFiltro === 'pendientes' && validatedCount > 0 ? (
                /* Card especial cuando todos los trabajadores ya fueron validados */
                <div className="py-8 px-4 text-center bg-[#f4fbf5] rounded-xl border border-[#a5d6a7] space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#e8f5e9] text-[#1b5e20] flex items-center justify-center mx-auto mb-1">
                    <ShieldCheck className="w-7 h-7 text-[#2e7d32]" />
                  </div>
                  <div className="font-extrabold text-gray-900 text-sm">
                    ¡Cuadrilla ya validada con éxito!
                  </div>
                  <p className="text-xs text-gray-600 max-w-lg mx-auto">
                    Los <strong className="text-[#1b5e20]">{validatedCount} trabajadores</strong> con jabas de esta cuadrilla ({filtroFundo || 'Fundo'}, {filtroModulo || 'Módulo'}, {filtroGrupo || 'Grupo'}) del día <strong className="text-gray-900">{formatDateDDMMAAAA(filtroFecha)}</strong> ya fueron validados oficialmente.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('validados')}
                      className="bg-[#2e7d32] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1b5e20] cursor-pointer shadow-2xs"
                    >
                      Ver Personal Validado ({validatedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('historial')}
                      className="bg-white border border-[#2e7d32] text-[#2e7d32] px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-50 cursor-pointer"
                    >
                      Ver en Historial Oficial
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 px-4 text-center text-gray-500 text-xs bg-[#fafafa] rounded-xl border border-dashed border-gray-200">
                  <PackageCheck className="w-10 h-10 mx-auto text-[#2e7d32]/50 mb-2.5" />
                  <div className="font-bold text-gray-800 text-sm mb-1">
                    No hay trabajadores con jabas pendientes para los filtros seleccionados
                  </div>
                  <div className="text-[11px] text-gray-500 max-w-md mx-auto">
                    La lista de validación muestra a los trabajadores con jabas cosechadas asignadas ({filtroFundo || 'Todos los fundos'}, {filtroModulo || 'Todos los módulos'}, {filtroGrupo || 'Todos los grupos'}) para la fecha {formatDateDDMMAAAA(filtroFecha)}.
                  </div>
                  <div className="text-[10px] text-gray-400 mt-2">
                    💡 Registra primero el avance de jabas en la pestaña <strong className="text-gray-600">PERSONAL</strong> o cambia los filtros superiores.
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredList.map(({ worker, jabas, isValidated, validationInfo }) => {
                  const state = workerValidationState[worker.dni] || {
                    conforme: validationInfo ? validationInfo.conforme : true,
                    observacion: '',
                    jabas: jabas
                  };
                  const isConforme = state.conforme;
                  const currentJabas = state.jabas !== undefined ? state.jabas : jabas;

                  return (
                    <div
                      key={worker.dni}
                      className={`p-3 rounded-xl border transition-all ${
                        isValidated
                          ? 'bg-[#f4fbf5] border-[#a5d6a7]'
                          : isConforme
                          ? 'bg-white border-[#e0e0e0] hover:border-[#a5d6a7]'
                          : 'bg-[#fff5f5] border-[#ffcdd2]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Info Trabajador */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-gray-900">
                              {worker.nombres}
                            </span>
                            <span className="text-[10px] bg-[#f5f5f5] text-gray-700 px-2 py-0.5 rounded-full font-semibold border border-gray-200">
                              DNI: {worker.dni}
                            </span>
                            {isValidated ? (
                              <span className="text-[10px] bg-[#e8f5e9] text-[#1b5e20] px-2 py-0.5 rounded-full font-bold border border-[#a5d6a7] flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-[#2e7d32]" />
                                <span>Ya Validado ({validationInfo?.supervisor || 'Supervisor'})</span>
                              </span>
                            ) : (
                              <span className="text-[10px] bg-[#fff8e1] text-[#b26a00] px-2 py-0.5 rounded-full font-semibold border border-[#ffe082] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#ff8f00]" />
                                <span>Pendiente</span>
                              </span>
                            )}
                            {worker.tipo && (
                              <span className="text-[10px] bg-[#f5f5f5] text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                                {worker.tipo}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2">
                            <span>{worker.fundo || filtroFundo} · {worker.modulo || filtroModulo}</span>
                            <span>·</span>
                            <span>Grupo: {worker.grupo || filtroGrupo}</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 bg-[#fff8e1] text-[#e65100] px-2 py-0.5 rounded-md font-semibold text-[10px] border border-[#ffe082]">
                              <Crown className="w-3 h-3 text-[#ff8f00]" />
                              <span>Líder: {worker.lider || filtroLider || 'Antony Cerron'}</span>
                            </span>
                            {worker.supervisor && (
                              <>
                                <span>·</span>
                                <span>Sup: {worker.supervisor}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Controles: Jabas y Botones de Validación */}
                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                          {/* Input de Jabas */}
                          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Jabas:</span>
                            {isValidated ? (
                              <span className="font-extrabold text-xs text-[#1b5e20] px-1.5 py-0.5">
                                {currentJabas}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={currentJabas}
                                onChange={(e) => handleWorkerJabasChange(worker.dni, e.target.value)}
                                className="w-14 text-center font-extrabold text-xs text-[#1b5e20] bg-white border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-[#2e7d32]"
                              />
                            )}
                          </div>

                          {isValidated ? (
                            /* Si ya está validado, botón bloqueado en verde */
                            <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#e8f5e9] text-[#1b5e20] border border-[#a5d6a7] flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                              <span>Validado</span>
                            </div>
                          ) : (
                            /* Si está pendiente, controles de Toggle y Validación Inmediata */
                            <div className="flex items-center gap-1.5">
                              {/* Botón Toggle Conforme / Anular */}
                              <button
                                type="button"
                                onClick={() => toggleWorkerConforme(worker.dni)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs ${
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

                              {/* Botón de Validación Rápida Individual (Desaparece de pendientes al instante) */}
                              <button
                                type="button"
                                onClick={() => handleValidateSingleWorker(worker, currentJabas)}
                                className="bg-[#1b5e20] hover:bg-[#2e7d32] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs transition-all"
                                title="Validar inmediatamente a este trabajador individual"
                              >
                                <Zap className="w-3 h-3 text-[#ffeb3b]" />
                                <span className="hidden xs:inline">Validar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Si está no conforme / anulado, mostrar campo para observación */}
                      {!isConforme && !isValidated && (
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
                  Revisa el consolidado y confirma el envío de la validación. Los trabajadores validados no se duplicarán.
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
                  📅 Fecha: <span className="font-normal text-gray-600">{formatDateDDMMAAAA(filtroFecha)}</span>
                </div>
                <div className="font-bold text-gray-800">
                  👤 Supervisor: <span className="font-normal text-gray-600">{filtroSupervisor || 'Todos'}</span>
                </div>
                <div className="font-bold text-gray-800">
                  📍 Ubicación: <span className="font-normal text-gray-600">{filtroFundo || 'Todos'} - {filtroModulo || 'Todos'}</span>
                </div>
                <div className="font-bold text-gray-800">
                  👥 Grupo: <span className="font-normal text-gray-600">{filtroGrupo || 'Todos'}</span>
                </div>
                <div className="font-bold text-[#e65100] flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-[#ff8f00]" />
                  <span>Líder: </span>
                  <span className="font-bold text-[#e65100]">{filtroLider || candidateWorkers[0]?.worker.lider || 'Antony Cerron'}</span>
                </div>
              </div>

              {/* Bloque Balance de Personal */}
              <div className="bg-[#fafafa] p-3.5 rounded-xl border border-[#e0e0e0] space-y-2 text-xs">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide block">
                  Balance de Personal Pendiente
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pendientes de Envío:</span>
                  <span className="font-bold text-gray-900">{totalTrabajadores} trabajadores</span>
                </div>
                <div className="flex justify-between items-center text-[#1b5e20]">
                  <span className="font-semibold">Conformes a Validar:</span>
                  <span className="font-extrabold">{trabajadoresConformes}</span>
                </div>
                <div className="flex justify-between items-center text-[#c62828]">
                  <span className="font-semibold">Anulados / Descartados:</span>
                  <span className="font-extrabold">{trabajadoresAnulados}</span>
                </div>
              </div>

              {/* Bloque Balance de Jabas */}
              <div className="bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] p-3.5 rounded-xl border border-[#a5d6a7] flex flex-col justify-center text-center">
                <span className="text-[10px] text-[#1b5e20] uppercase font-bold tracking-wider">
                  Total Jabas a Validar
                </span>
                <div className="text-3xl font-black text-[#1b5e20] my-0.5">
                  {jabasConformes}
                </div>
                <span className="text-[10px] text-gray-600">
                  De un total bruto de {totalJabas} jabas ({jabasAnuladas} descontadas)
                </span>
              </div>
            </div>

            {/* Banner Informativo si la cuadrilla ya fue completamente validada */}
            {pendingCount === 0 && validatedCount > 0 && (
              <div className="bg-[#e8f5e9] border border-[#a5d6a7] p-3.5 rounded-xl flex items-center gap-3 text-xs text-[#1b5e20]">
                <ShieldCheck className="w-5 h-5 text-[#2e7d32] shrink-0" />
                <div>
                  <div className="font-extrabold">Esta cuadrilla ya fue validada oficialmente</div>
                  <div className="text-[11px] text-gray-600">
                    Los {validatedCount} trabajadores de esta cuadrilla ya fueron registrados para esta fecha. Para evitar duplicados, el guardado masivo está bloqueado.
                  </div>
                </div>
              </div>
            )}

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

            {/* Botón Principal: Guardar Validación y Enviar con Bloqueo de Duplicados */}
            {(() => {
              const pendingToSubmit = candidateWorkers.filter((c) => !c.isValidated);
              const pendingConformesCount = pendingToSubmit.filter(
                (c) => workerValidationState[c.worker.dni]?.conforme !== false
              ).length;
              const isAlreadyFullyValidated = pendingCount === 0 && validatedCount > 0;
              const canSubmit = !isSubmitting && pendingConformesCount > 0 && !isAlreadyFullyValidated;

              return (
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmitValidacion}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] ${
                    !canSubmit
                      ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                      : 'bg-[#2e7d32] hover:bg-[#1b5e20] text-white shadow-emerald-900/20'
                  }`}
                >
                  {isAlreadyFullyValidated ? (
                    <>
                      <Lock className="w-4 h-4 text-gray-500" />
                      <span>✅ Cuadrilla ya validada (Sin pendientes)</span>
                    </>
                  ) : pendingConformesCount === 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>⚠️ Sin trabajadores pendientes para validar</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Guardar Validación y Enviar ({pendingConformesCount} pendientes)</span>
                    </>
                  )}
                </button>
              );
            })()}
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
                className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <span>+ Nueva Validación</span>
              </button>
            </div>

            {emptyValidacionesCount > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Se detectaron {emptyValidacionesCount} registros vacíos (0 jabas) en la memoria.</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Puedes eliminarlos en un clic para mantener el historial limpio y ordenado.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const res = purgeAllEmptyRecords();
                    if (onDeleteValidacion) {
                      validaciones.forEach((v) => {
                        if (!isValidValidacion(v)) {
                          onDeleteValidacion(v.id);
                        }
                      });
                    }
                    onToast(`🧹 Se limpiaron ${emptyValidacionesCount} registros vacíos`, 'success');
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar Registros Vacíos</span>
                </button>
              </div>
            )}

            {validValidaciones.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs bg-[#fafafa] rounded-xl border border-dashed border-gray-200">
                <FileCheck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                Aún no hay validaciones registradas en el sistema.
                <div className="text-[11px] text-gray-400 mt-1">
                  Completa el formulario en "Nueva Validación" para registrar la primera.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {validValidaciones.map((val) => {
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
                            <span>📅 {formatDateDDMMAAAA(val.fecha)}</span>
                            <span>·</span>
                            <span>📍 {val.fundo || 'Fundo'} - {val.modulo || 'Módulo'}</span>
                            <span>·</span>
                            <span>👥 {val.grupo || 'Grupo'}</span>
                            {val.lider && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 bg-[#fff8e1] text-[#e65100] px-1.5 py-0.5 rounded font-semibold text-[10px] border border-[#ffe082]">
                                  <Crown className="w-3 h-3 text-[#ff8f00]" />
                                  <span>Líder: {val.lider}</span>
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span>👤 Sup: {val.supervisor || 'Supervisor'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <div className="text-sm font-black text-[#1b5e20]">
                              {val.jabasConformes || 0} Jabas
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {val.trabajadoresConformes || 0} / {val.totalTrabajadores || 0} personal
                            </div>
                          </div>

                          {/* Botón Eliminar Validación del Historial */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Estás seguro de eliminar la validación ${val.id}? Esta acción liberará a los trabajadores para volver a ser validados.`)) {
                                if (onDeleteValidacion) {
                                  onDeleteValidacion(val.id);
                                } else {
                                  onToast('Validación eliminada', 'info');
                                }
                              }
                            }}
                            className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all font-semibold flex items-center gap-1 cursor-pointer text-xs"
                            title="Eliminar validación duplicada o errónea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>

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
                                      {it.nombres || 'Personal'}{' '}
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
                                    <span className="font-black text-[#1b5e20]">{it.jabas || 0} jabas</span>
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
                            Registrado por {val.creadoPor || val.supervisor} · {formatDateDDMMAAAA(val.fechaRegistro)}
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
      {/* SECCIÓN 3: MONITOR DE VERIFICACIÓN DE REGISTROS EN VIVO */}
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

      {/* Modal de Gestión y Eliminación de Líderes */}
      {showManageLeadersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-[#fff8e1] border-b border-[#ffe082] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ffe082] flex items-center justify-center text-lg">
                  👑
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#b26a00]">Gestionar Líderes</h3>
                  <p className="text-[11px] text-gray-600">Elimina líderes no deseados o duplicados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManageLeadersModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-white/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {availableLideres.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No hay líderes registrados actualmente.
                </div>
              ) : (
                availableLideres.map((lead) => (
                  <div
                    key={lead.nombre}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-amber-50/50 rounded-xl border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">👑</span>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{lead.nombre}</p>
                        {lead.dni && (
                          <span className="font-mono text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            DNI: {lead.dni}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de eliminar permanentemente al líder "${lead.nombre}"?`)) {
                          if (filtroLider === lead.nombre) {
                            setFiltroLider('');
                          }
                          if (onDeleteLider) {
                            onDeleteLider(lead.nombre);
                          } else {
                            onToast(`🗑️ Líder "${lead.nombre}" eliminado`, 'info');
                          }
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all font-semibold flex items-center gap-1 cursor-pointer"
                      title="Eliminar líder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageLeadersModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 cursor-pointer shadow-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
