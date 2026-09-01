import React, { useState, useMemo, useEffect } from 'react';
import { Trabajador, Lider, UserSession, DetalleJaba, Usuario } from '../types';
import { ScannerModal } from './ScannerModal';
import { getLocalToday, getLocalISO } from '../utils/storage';
import { 
  Users, 
  Crown, 
  Camera, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Save, 
  Sparkles, 
  Package, 
  CheckSquare,
  Building2,
  MapPin,
  Layers,
  UserCheck,
  Plus,
  Minus,
  Info,
  Calendar,
  Trash2,
  UserPlus,
  FolderPlus,
  CheckCheck,
  Tag
} from 'lucide-react';

interface TrabajadoresTabProps {
  session: UserSession;
  trabajadores: Trabajador[];
  grupos: string[];
  lideres: Lider[];
  usuarios?: Usuario[];
  modulosPorFundo?: Record<string, string[]>;
  onSaveModulo?: (fundo: string, modulo: string) => void;
  onUpdateTrabajadores?: (updated: Trabajador[]) => void;
  onSaveTrabajador?: (worker: Trabajador) => void;
  onSaveLider: (lider: Lider) => void;
  onDeleteLider?: (liderNameOrDni: string) => void;
  onSaveSupervisor?: (supervisorName: string) => void;
  onSaveGrupo?: (grupo: string) => void;
  onSaveAvance: (avanceMap: Record<string, number>, detalleList: DetalleJaba[]) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const TrabajadoresTab: React.FC<TrabajadoresTabProps> = ({
  session,
  trabajadores,
  grupos,
  lideres,
  usuarios = [],
  modulosPorFundo = {},
  onSaveModulo,
  onUpdateTrabajadores,
  onSaveTrabajador,
  onSaveLider,
  onDeleteLider,
  onSaveSupervisor,
  onSaveGrupo,
  onSaveAvance,
  onToast
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Supervisor checking
  const isSupervisorUser = session.rol === 'Supervisor';
  const sessionSupervisorName = session.nombre;

  // Paso 1: Configuración de Cuadrilla Secuencial (Limpio sin datos de prueba)
  const [cuadrillaSupervisor, setCuadrillaSupervisor] = useState(
    isSupervisorUser ? sessionSupervisorName : ''
  );
  const [cuadrillaFundo, setCuadrillaFundo] = useState('');
  const [cuadrillaModulo, setCuadrillaModulo] = useState('');
  const [cuadrillaGrupo, setCuadrillaGrupo] = useState('');
  const [cuadrillaLider, setCuadrillaLider] = useState('');
  const [cuadrillaLiderDni, setCuadrillaLiderDni] = useState('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [step2SearchTerm, setStep2SearchTerm] = useState('');

  // Selected Workers (Set of DNI strings)
  const [selectedDnis, setSelectedDnis] = useState<Set<string>>(new Set());

  // Dynamic Group Assignment per Worker: { [dni]: assignedGroup }
  const [workerAssignedGrupos, setWorkerAssignedGrupos] = useState<Record<string, string>>({});

  // Avance values: { [dni]: jabasCount }
  const [avanceValues, setAvanceValues] = useState<Record<string, number>>({});

  // Supervisor registration state
  const [showSupervisorForm, setShowSupervisorForm] = useState(false);
  const [newSupervisorNombre, setNewSupervisorNombre] = useState('');

  // Modulo registration state
  const [showModuloForm, setShowModuloForm] = useState(false);
  const [newModuloNombre, setNewModuloNombre] = useState('');
  const [newModuloFundo, setNewModuloFundo] = useState('');

  // Grupo registration state
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [newGrupoNombre, setNewGrupoNombre] = useState('');

  // Leader registration state (Sub-module)
  const [showLeaderForm, setShowLeaderForm] = useState(false);
  const [liderNombre, setLiderNombre] = useState('');
  const [liderDni, setLiderDni] = useState('');

  // New Worker direct registration modal state
  const [showNewWorkerModal, setShowNewWorkerModal] = useState(false);
  const [newWorkerDni, setNewWorkerDni] = useState('');
  const [newWorkerNombres, setNewWorkerNombres] = useState('');
  const [newWorkerSupervisor, setNewWorkerSupervisor] = useState('');
  const [newWorkerFundo, setNewWorkerFundo] = useState('');
  const [newWorkerModulo, setNewWorkerModulo] = useState('');
  const [newWorkerGrupo, setNewWorkerGrupo] = useState('');
  const [newWorkerLider, setNewWorkerLider] = useState('');

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'worker' | 'leader'>('worker');

  // Derive unique lists for dropdowns
  const supervisoresList = useMemo(() => {
    const set = new Set<string>();
    if (isSupervisorUser && sessionSupervisorName) {
      set.add(sessionSupervisorName);
    }
    if (usuarios && Array.isArray(usuarios)) {
      usuarios.filter((u) => u.rol === 'Supervisor').forEach((u) => {
        if (u.nombre) set.add(u.nombre);
      });
    }
    trabajadores.forEach((t) => {
      if (t.supervisor && t.supervisor.trim()) set.add(t.supervisor.trim());
    });
    return Array.from(set).sort();
  }, [trabajadores, isSupervisorUser, sessionSupervisorName, usuarios]);

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

  const modulosList = useMemo(() => {
    const set = new Set<string>();
    const fundoKey = cuadrillaFundo || 'Santa Teresa';
    
    // Dynamic modules from modulosPorFundo prop
    if (modulosPorFundo && modulosPorFundo[fundoKey]) {
      modulosPorFundo[fundoKey].forEach((m) => {
        if (m && m.trim()) set.add(m.trim().toUpperCase());
      });
    }

    // Default static initial modules
    if (cuadrillaFundo === 'Santa Teresa') {
      ['M01', 'M06', 'M07', 'M08', 'M09', 'M10A', 'M10B', 'M11'].forEach((m) => set.add(m));
    } else if (cuadrillaFundo === 'Arena Azul') {
      ['M01', 'M02', 'M03', 'M04'].forEach((m) => set.add(m));
    } else if (cuadrillaFundo === 'Vivadis') {
      ['M01', 'M02', 'M03', 'M04', 'M05'].forEach((m) => set.add(m));
    } else if (cuadrillaFundo === 'Ayllu Allpa') {
      ['M12', 'M13', 'M14', 'M15'].forEach((m) => set.add(m));
    } else if (cuadrillaFundo === 'Ampliacion') {
      ['M16', 'M17', 'M18'].forEach((m) => set.add(m));
    } else if (!cuadrillaFundo && modulosPorFundo) {
      Object.values(modulosPorFundo).forEach((mods) => {
        if (Array.isArray(mods)) {
          mods.forEach((m) => m && set.add(m.trim().toUpperCase()));
        }
      });
    }

    // Include any module found in trabajadores records for this fundo
    trabajadores.forEach((t) => {
      if ((!cuadrillaFundo || t.fundo === cuadrillaFundo) && t.modulo && t.modulo.trim()) {
        set.add(t.modulo.trim().toUpperCase());
      }
    });

    return Array.from(set).sort();
  }, [trabajadores, cuadrillaFundo, modulosPorFundo]);

  const allGrupos = useMemo(() => {
    const set = new Set<string>();
    grupos.forEach((g) => {
      if (g && g.trim()) set.add(g.trim());
    });
    trabajadores.forEach((t) => {
      if (t.grupo && t.grupo.trim()) set.add(t.grupo.trim());
    });
    lideres.forEach((l) => {
      if (l.grupo && l.grupo.trim()) set.add(l.grupo.trim());
    });
    return Array.from(set).sort();
  }, [grupos, trabajadores, lideres]);

  // Combined leaders list (from state + real records) - strictly deduplicated
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

    lideres.forEach((l) => {
      addLeader(l.lider || l.nombres, l.dni);
    });

    trabajadores.forEach((t) => {
      addLeader(t.lider, t.tipo === 'Líder' ? t.dni : '');
    });

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [lideres, trabajadores]);

  // Helper for normalizations
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

  // Filtered workers list - general pool available for assignment, searchable by name or DNI
  const filteredTrabajadores = useMemo(() => {
    const seenDni = new Set<string>();
    return trabajadores.filter((t) => {
      if (!t.dni || seenDni.has(t.dni)) return false;
      seenDni.add(t.dni);

      // Search Filter (by Name or DNI)
      if (searchTerm && searchTerm.trim() !== '') {
        const term = normalizeStr(searchTerm);
        const matchesSearch =
          normalizeStr(t.nombres).includes(term) ||
          t.dni.includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [trabajadores, searchTerm]);

  // Handle changing group for an individual worker
  const handleWorkerGroupChange = (dni: string, newGroup: string) => {
    setWorkerAssignedGrupos((prev) => ({
      ...prev,
      [dni]: newGroup
    }));
  };

  // Toggle single worker selection (dynamically binds to cuadrillaGrupo on select)
  const toggleWorker = (dni: string) => {
    setSelectedDnis((prev) => {
      const next = new Set(prev);
      if (next.has(dni)) {
        next.delete(dni);
      } else {
        next.add(dni);
        // Dynamically assign to current cuadrillaGrupo
        setWorkerAssignedGrupos((prevGrp) => ({
          ...prevGrp,
          [dni]: prevGrp[dni] || cuadrillaGrupo
        }));
      }
      return next;
    });
  };

  // Select all filtered workers and assign to cuadrillaGrupo
  const selectAllFiltered = () => {
    setSelectedDnis((prev) => {
      const next = new Set(prev);
      const newGroups: Record<string, string> = {};
      filteredTrabajadores.forEach((t) => {
        next.add(t.dni);
        newGroups[t.dni] = workerAssignedGrupos[t.dni] || cuadrillaGrupo;
      });
      setWorkerAssignedGrupos((prevGrp) => ({ ...prevGrp, ...newGroups }));
      return next;
    });
    onToast(`✅ ${filteredTrabajadores.length} trabajadores seleccionados y asignados al ${cuadrillaGrupo}`);
  };

  const clearSelection = () => {
    setSelectedDnis(new Set());
    onToast('Selección de personal limpiada');
  };

  // Barcode / DNI Scan Handler - dynamically binds scanned worker to cuadrillaGrupo
  const handleScanDniResult = (dni: string) => {
    const trimmedDni = dni.trim();
    if (scannerMode === 'leader') {
      setLiderDni(trimmedDni);
      const found = trabajadores.find((t) => String(t.dni).trim() === trimmedDni);
      if (found) {
        setLiderNombre(found.nombres);
        setCuadrillaLider(found.nombres);
        setCuadrillaLiderDni(found.dni);
      }
      setScannerOpen(false);
      onToast(`👑 DNI de líder asignado: ${trimmedDni}`);
    } else {
      // Dynamic Group Assignment on Scan
      setSelectedDnis((prev) => new Set(prev).add(trimmedDni));
      setWorkerAssignedGrupos((prev) => ({
        ...prev,
        [trimmedDni]: cuadrillaGrupo || 'Grupo 01'
      }));

      if (step === 2) {
        setStep2SearchTerm(trimmedDni);
      }

      const found = trabajadores.find((t) => String(t.dni).trim() === trimmedDni);
      const nombre = found ? found.nombres : `Trabajador DNI ${trimmedDni}`;
      setScannerOpen(false);
      onToast(`👷 ${nombre} (${trimmedDni}) listo para registrar avance.`);
    }
  };

  // Register new Supervisor
  const handleRegisterSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSupervisorNombre.trim();
    if (!clean) {
      onToast('⚠️ Ingresa el nombre del supervisor', 'warning');
      return;
    }
    if (onSaveSupervisor) {
      onSaveSupervisor(clean);
    }
    setCuadrillaSupervisor(clean);
    setNewSupervisorNombre('');
    setShowSupervisorForm(false);
    onToast(`✅ Supervisor "${clean}" registrado y seleccionado`, 'success');
  };

  // Register new Modulo
  const handleRegisterModulo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanModulo = newModuloNombre.trim().toUpperCase();
    const targetFundo = newModuloFundo.trim() || cuadrillaFundo || 'Santa Teresa';
    
    if (!cleanModulo) {
      onToast('⚠️ Ingresa el código o nombre del módulo (ej: M05, M10A)', 'warning');
      return;
    }

    if (onSaveModulo) {
      onSaveModulo(targetFundo, cleanModulo);
    }

    setCuadrillaFundo(targetFundo);
    setCuadrillaModulo(cleanModulo);
    setNewModuloNombre('');
    setNewModuloFundo('');
    setShowModuloForm(false);
    onToast(`✅ Módulo "${cleanModulo}" agregado exitosamente al fundo "${targetFundo}"`, 'success');
  };

  // Register new Grupo
  const handleRegisterGrupo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newGrupoNombre.trim();
    if (!clean) {
      onToast('⚠️ Ingresa el nombre del grupo', 'warning');
      return;
    }
    if (onSaveGrupo) {
      onSaveGrupo(clean);
    }
    setCuadrillaGrupo(clean);
    setNewGrupoNombre('');
    setShowGrupoForm(false);
    onToast(`✅ Grupo "${clean}" registrado y seleccionado`, 'success');
  };

  // Register new Leader (Independent of groups)
  const handleRegisterLider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liderNombre.trim()) {
      onToast('⚠️ Ingresa el nombre del líder', 'warning');
      return;
    }
    if (!liderDni.trim() || liderDni.length < 8) {
      onToast('⚠️ Ingresa un DNI válido de 8 dígitos', 'warning');
      return;
    }

    const newLider: Lider = {
      lider: liderNombre.trim(),
      dni: liderDni.trim(),
      nombres: liderNombre.trim(),
      fechaAlta: getLocalToday()
    };

    onSaveLider(newLider);
    setCuadrillaLider(liderNombre.trim());
    setCuadrillaLiderDni(liderDni.trim());
    onToast(`👑 Líder "${liderNombre.trim()}" registrado (disponible para todos los grupos)`, 'success');
    setLiderNombre('');
    setLiderDni('');
    setShowLeaderForm(false);
  };

  // Open worker modal with current cuadrilla context pre-filled
  const handleOpenNewWorkerModal = () => {
    setNewWorkerDni('');
    setNewWorkerNombres('');
    setNewWorkerSupervisor(cuadrillaSupervisor || (supervisoresList[0] || ''));
    setNewWorkerFundo(cuadrillaFundo || 'Santa Teresa');
    setNewWorkerModulo(cuadrillaModulo || 'M01');
    setNewWorkerGrupo(cuadrillaGrupo || (allGrupos[0] || 'Grupo 01'));
    setNewWorkerLider(cuadrillaLider || (availableLideres[0]?.nombre || ''));
    setShowNewWorkerModal(true);
  };

  // Direct registration of worker with 5 fields: Supervisor, Fundo, Modulo, Grupo, Lider
  const handleRegisterNewWorker = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDni = newWorkerDni.trim().replace(/\D/g, '');
    const cleanNombres = newWorkerNombres.trim().toUpperCase();

    if (!cleanDni || cleanDni.length < 5) {
      onToast('⚠️ Ingresa un DNI / Fotocheck válido', 'warning');
      return;
    }
    if (!cleanNombres) {
      onToast('⚠️ Ingresa el nombre completo del trabajador', 'warning');
      return;
    }

    const workerSupervisor = newWorkerSupervisor.trim() || cuadrillaSupervisor || session.nombre;
    const workerFundo = newWorkerFundo.trim() || cuadrillaFundo || 'Santa Teresa';
    const workerModulo = newWorkerModulo.trim().toUpperCase() || cuadrillaModulo || 'M01';
    const workerGrupo = newWorkerGrupo.trim() || cuadrillaGrupo || 'Grupo 01';
    const workerLider = newWorkerLider.trim() || cuadrillaLider || '';

    const newWorker: Trabajador = {
      id: `TRAB_${cleanDni}_${Date.now().toString().slice(-4)}`,
      fecha: getLocalToday(),
      dni: cleanDni,
      nombres: cleanNombres,
      supervisor: workerSupervisor,
      fundo: workerFundo,
      modulo: workerModulo,
      grupo: workerGrupo,
      lider: workerLider,
      tipo: 'Cosechero'
    };

    if (onSaveTrabajador) {
      onSaveTrabajador(newWorker);
    } else if (onUpdateTrabajadores) {
      const exists = trabajadores.some((t) => String(t.dni).trim() === cleanDni);
      const updated = exists
        ? trabajadores.map((t) => (String(t.dni).trim() === cleanDni ? newWorker : t))
        : [newWorker, ...trabajadores];
      onUpdateTrabajadores(updated);
    }

    // Auto-select in current cuadrilla selection
    setSelectedDnis((prev) => new Set(prev).add(cleanDni));
    setWorkerAssignedGrupos((prev) => ({
      ...prev,
      [cleanDni]: workerGrupo
    }));

    setShowNewWorkerModal(false);
    onToast(
      `✅ ${cleanNombres} registrado con Supervisor: ${workerSupervisor}, Fundo: ${workerFundo}, Módulo: ${workerModulo}, Grupo: ${workerGrupo}, Líder: ${workerLider || 'Sin asignar'}`,
      'success'
    );
  };

  // Explicitly assign current cuadrilla context to all currently selected workers
  const handleAssignCuadrillaToSelected = () => {
    if (selectedDnis.size === 0) {
      onToast('⚠️ Selecciona al menos un trabajador para asignarle la cuadrilla', 'warning');
      return;
    }

    const targetSupervisor = cuadrillaSupervisor || session.nombre;
    const targetFundo = cuadrillaFundo || 'Santa Teresa';
    const targetModulo = cuadrillaModulo || 'M01';
    const targetGrupo = cuadrillaGrupo || 'Grupo 01';
    const targetLider = cuadrillaLider || '';

    if (onUpdateTrabajadores) {
      const updated = trabajadores.map((t) => {
        if (selectedDnis.has(String(t.dni).trim())) {
          return {
            ...t,
            supervisor: targetSupervisor,
            fundo: targetFundo,
            modulo: targetModulo,
            grupo: workerAssignedGrupos[t.dni] || targetGrupo,
            lider: targetLider || t.lider,
            fecha: getLocalToday()
          };
        }
        return t;
      });
      onUpdateTrabajadores(updated);
    }

    onToast(
      `✅ Cuadrilla asignada a ${selectedDnis.size} trabajadores (Supervisor: ${targetSupervisor}, Fundo: ${targetFundo}, Módulo: ${targetModulo}, Grupo: ${targetGrupo}, Líder: ${targetLider || 'Sin asignar'})`,
      'success'
    );
  };

  // Step 2: Jabas Avance Handlers
  const handleJabasChange = (dni: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setAvanceValues((prev) => {
      const copy = { ...prev };
      if (num > 0) copy[dni] = num;
      else delete copy[dni];
      return copy;
    });
  };

  const adjustJabas = (dni: string, delta: number) => {
    const current = avanceValues[dni] || 0;
    const nextVal = Math.max(0, current + delta);
    setAvanceValues((prev) => {
      const copy = { ...prev };
      if (nextVal > 0) copy[dni] = nextVal;
      else delete copy[dni];
      return copy;
    });
  };

  const selectedWorkersList = useMemo(() => {
    const seenDni = new Set<string>();
    const list: Trabajador[] = [];
    trabajadores.forEach((t) => {
      const cleanDni = String(t.dni || '').trim();
      if (cleanDni && selectedDnis.has(cleanDni) && !seenDni.has(cleanDni)) {
        seenDni.add(cleanDni);
        list.push(t);
      }
    });
    return list.sort((a, b) => a.nombres.localeCompare(b.nombres));
  }, [trabajadores, selectedDnis]);

  const filteredStep2WorkersList = useMemo(() => {
    if (!step2SearchTerm.trim()) return selectedWorkersList;
    const q = step2SearchTerm.toLowerCase().trim();
    return selectedWorkersList.filter(
      (w) =>
        w.nombres.toLowerCase().includes(q) ||
        String(w.dni).toLowerCase().includes(q)
    );
  }, [selectedWorkersList, step2SearchTerm]);

  const totalJabasAvance = useMemo(() => {
    return (Object.values(avanceValues) as number[]).reduce(
      (sum: number, curr: number) => sum + (Number(curr) || 0),
      0
    );
  }, [avanceValues]);

  const handleStep1Next = () => {
    if (selectedDnis.size === 0) {
      onToast('⚠️ Selecciona al menos un trabajador para la cuadrilla');
      return;
    }
    setStep(2);
  };

  const handleConfirmAvance = () => {
    if (totalJabasAvance === 0) {
      onToast('⚠️ Ingresa al menos 1 jaba de avance para continuar');
      return;
    }
    setStep(3);
  };

  const handleSaveAvanceFinal = () => {
    const hoy = getLocalToday();
    const nowIso = getLocalISO();
    const detalleList: DetalleJaba[] = [];

    Object.keys(avanceValues).forEach((dni) => {
      const jabas = avanceValues[dni];
      if (jabas > 0) {
        const t = trabajadores.find((x) => x.dni === dni);
        const assignedGrupo = workerAssignedGrupos[dni] || cuadrillaGrupo;
        detalleList.push({
          id: `${hoy}_${dni}_${cuadrillaModulo || 'M01'}_${Date.now().toString().slice(-4)}`,
          fecha: hoy,
          dni,
          trabajador: t ? t.nombres : dni,
          fundo: cuadrillaFundo || 'Santa Teresa',
          modulo: cuadrillaModulo || 'M01',
          jabas,
          supervisor: cuadrillaSupervisor || session.nombre,
          grupo: assignedGrupo,
          lider: cuadrillaLider || '',
          timestamp: nowIso
        });
      }
    });

    onSaveAvance(avanceValues, detalleList);
    onToast(`✅ Avance guardado exitosamente (${totalJabasAvance} jabas registradas)`);
    
    // Reset selection & return to step 1
    setSelectedDnis(new Set());
    setAvanceValues({});
    setStep(1);
  };

  return (
    <div className="space-y-4">
      {/* 3-Step Wizard Indicator */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 cursor-pointer transition-all ${
            step === 1
              ? 'text-[#1b5e20] font-bold'
              : step > 1
              ? 'text-[#2e7d32] font-medium'
              : 'text-gray-400'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 1
                ? 'bg-[#2e7d32] text-white shadow-md'
                : step > 1
                ? 'bg-[#a5d6a7] text-[#1b5e20]'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span className="text-xs uppercase tracking-tight hidden sm:inline">
            1. Config. Cuadrilla
          </span>
        </button>

        <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step >= 2 ? 'bg-[#2e7d32]' : 'bg-gray-200'}`} />

        <button
          type="button"
          onClick={() => {
            if (selectedDnis.size > 0) setStep(2);
          }}
          className={`flex items-center gap-2 cursor-pointer transition-all ${
            step === 2
              ? 'text-[#1b5e20] font-bold'
              : step > 2
              ? 'text-[#2e7d32] font-medium'
              : 'text-gray-400'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 2
                ? 'bg-[#2e7d32] text-white shadow-md'
                : step > 2
                ? 'bg-[#a5d6a7] text-[#1b5e20]'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step > 2 ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <span className="text-xs uppercase tracking-tight hidden sm:inline">
            2. Registro de Avance
          </span>
        </button>

        <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step === 3 ? 'bg-[#2e7d32]' : 'bg-gray-200'}`} />

        <button
          type="button"
          onClick={() => {
            if (totalJabasAvance > 0) setStep(3);
          }}
          className={`flex items-center gap-2 cursor-pointer transition-all ${
            step === 3 ? 'text-[#1b5e20] font-bold' : 'text-gray-400'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 3 ? 'bg-[#2e7d32] text-white shadow-md' : 'bg-gray-100 text-gray-400'
            }`}
          >
            3
          </div>
          <span className="text-xs uppercase tracking-tight hidden sm:inline">
            3. Resumen Detallado
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PASO 1: CONFIGURACIÓN DE CUADRILLA & SELECCIÓN DE PERSONAL */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          {/* Card: Configuración Secuencial de Cuadrilla */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0f0f0] mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#e8f5e9] flex items-center justify-center text-[#1b5e20]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                  Paso 1: Configuración de Cuadrilla
                </h2>
                <p className="text-xs text-[#757575]">
                  Completa los campos en orden secuencial para definir la cuadrilla de trabajo
                </p>
              </div>
            </div>

            {/* Formulario Secuencial con Ejemplos Visuales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 bg-[#fcf9f8] p-4 rounded-xl border border-[#e0e0e0] mb-5">
              {/* 1. Supervisor */}
              <div className="space-y-1">
                <label className="flex items-center justify-between text-xs font-bold text-[#2e7d32]">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>1. Supervisor</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupervisorForm(!showSupervisorForm);
                      setShowGrupoForm(false);
                      setShowLeaderForm(false);
                    }}
                    className="text-[10px] text-[#2e7d32] hover:underline font-normal cursor-pointer"
                  >
                    {showSupervisorForm ? 'Cerrar' : '+ Registrar'}
                  </button>
                </label>
                <div className="relative">
                  <select
                    value={cuadrillaSupervisor}
                    onChange={(e) => setCuadrillaSupervisor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="">Seleccionar supervisor...</option>
                    {supervisoresList.map((sup) => (
                      <option key={sup} value={sup}>
                        {sup}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="font-semibold text-[#1b5e20]">Ejemplo:</span> Carlos Solar
                </div>
              </div>

              {/* 2. Fundo */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>2. Fundo</span>
                </label>
                <div className="relative">
                  <select
                    value={cuadrillaFundo}
                    onChange={(e) => {
                      const newFundo = e.target.value;
                      setCuadrillaFundo(newFundo);
                      if (newFundo === 'Santa Teresa') setCuadrillaModulo('M01');
                      else if (newFundo === 'Arena Azul') setCuadrillaModulo('M01');
                      else if (newFundo === 'Vivadis') setCuadrillaModulo('M01');
                      else if (newFundo === 'Ayllu Allpa') setCuadrillaModulo('M12');
                      else if (newFundo === 'Ampliacion') setCuadrillaModulo('M16');
                      else setCuadrillaModulo('');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="">Seleccionar fundo...</option>
                    {fundosList.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="font-semibold text-[#1b5e20]">Ejemplo:</span> Santa Teresa
                </div>
              </div>

              {/* 3. Módulo */}
              <div className="space-y-1">
                <label className="flex items-center justify-between text-xs font-bold text-[#2e7d32]">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>3. Módulo</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModuloForm(!showModuloForm);
                      setShowSupervisorForm(false);
                      setShowGrupoForm(false);
                      setShowLeaderForm(false);
                      setNewModuloFundo(cuadrillaFundo || 'Santa Teresa');
                    }}
                    className="text-[10px] text-[#2e7d32] hover:underline font-normal cursor-pointer"
                  >
                    {showModuloForm ? 'Cerrar' : '+ Registrar'}
                  </button>
                </label>
                <div className="relative">
                  <select
                    value={cuadrillaModulo}
                    onChange={(e) => setCuadrillaModulo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="">Seleccionar módulo...</option>
                    {modulosList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="font-semibold text-[#1b5e20]">Ejemplo:</span> M01
                </div>
              </div>

              {/* 4. Grupo */}
              <div className="space-y-1">
                <label className="flex items-center justify-between text-xs font-bold text-[#2e7d32]">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>4. Grupo</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGrupoForm(!showGrupoForm);
                      setShowSupervisorForm(false);
                      setShowLeaderForm(false);
                    }}
                    className="text-[10px] text-[#2e7d32] hover:underline font-normal cursor-pointer"
                  >
                    {showGrupoForm ? 'Cerrar' : '+ Registrar'}
                  </button>
                </label>
                <div className="relative">
                  <select
                    value={cuadrillaGrupo}
                    onChange={(e) => setCuadrillaGrupo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="">Seleccionar grupo...</option>
                    {allGrupos.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="font-semibold text-[#1b5e20]">Ejemplo:</span> Grupo 01
                </div>
              </div>

              {/* 5. Líder Responsable */}
              <div className="space-y-1">
                <label className="flex items-center justify-between text-xs font-bold text-[#ff8f00]">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    <span>5. Líder</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLeaderForm(!showLeaderForm);
                        setShowSupervisorForm(false);
                        setShowGrupoForm(false);
                      }}
                      className="text-[10px] text-[#2e7d32] hover:underline font-normal cursor-pointer"
                    >
                      {showLeaderForm ? 'Cerrar' : '+ Registrar / Gestionar'}
                    </button>
                  </div>
                </label>
                <div className="relative">
                  <select
                    value={cuadrillaLider}
                    onChange={(e) => {
                      const selected = availableLideres.find((l) => l.nombre === e.target.value);
                      setCuadrillaLider(e.target.value);
                      if (selected) setCuadrillaLiderDni(selected.dni);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32] focus:ring-1 focus:ring-[#2e7d32]"
                  >
                    <option value="">Seleccionar líder...</option>
                    {availableLideres.map((l) => (
                      <option key={`${l.nombre}_${l.dni}`} value={l.nombre}>
                        👑 {l.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="font-semibold text-[#1b5e20]">Ejemplo:</span> Antony Cerron
                </div>
              </div>
            </div>

            {/* Sub-Panel Opcional: Registro de Nuevo Supervisor */}
            {showSupervisorForm && (
              <form
                onSubmit={handleRegisterSupervisor}
                className="mb-5 p-4 bg-[#e8f5e9]/80 rounded-xl border border-[#a5d6a7] space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#a5d6a7]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#2e7d32]" />
                    <h3 className="text-xs font-bold text-[#1b5e20] uppercase tracking-wide">
                      Registrar Nuevo Supervisor
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#757575]">Se registrará y seleccionará automáticamente</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                      Nombre Completo del Supervisor *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Carlos Solar, Maria Quispe..."
                      value={newSupervisorNombre}
                      onChange={(e) => setNewSupervisorNombre(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSupervisorForm(false)}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Supervisor</span>
                  </button>
                </div>
              </form>
            )}

            {/* Sub-Panel Opcional: Registro de Nuevo Módulo */}
            {showModuloForm && (
              <form
                onSubmit={handleRegisterModulo}
                className="mb-5 p-4 bg-[#e8f5e9]/90 rounded-xl border border-[#81c784] space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#a5d6a7]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#2e7d32]" />
                    <h3 className="text-xs font-bold text-[#1b5e20] uppercase tracking-wide">
                      Registrar Nuevo Módulo de Campo
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#2e7d32] font-semibold bg-white px-2 py-0.5 rounded border border-[#a5d6a7]">
                    🌱 Se guardará en la base de datos y quedará seleccionado
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                      Fundo Agrícola *
                    </label>
                    <select
                      value={newModuloFundo}
                      onChange={(e) => setNewModuloFundo(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                    >
                      {fundosList.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                      Código / Nombre del Módulo *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: M05, M09, M10A, M21..."
                      value={newModuloNombre}
                      onChange={(e) => setNewModuloNombre(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white text-gray-900 font-bold uppercase focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModuloForm(false)}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Módulo</span>
                  </button>
                </div>
              </form>
            )}

            {/* Sub-Panel Opcional: Registro de Nuevo Grupo */}
            {showGrupoForm && (
              <form
                onSubmit={handleRegisterGrupo}
                className="mb-5 p-4 bg-[#e8f5e9]/80 rounded-xl border border-[#a5d6a7] space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#a5d6a7]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2e7d32]" />
                    <h3 className="text-xs font-bold text-[#1b5e20] uppercase tracking-wide">
                      Registrar Nuevo Grupo
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#757575]">Se registrará y agregará a las opciones de grupos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                      Nombre o Identificador del Grupo *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Grupo 01, Grupo 02, Cuadrilla Norte..."
                      value={newGrupoNombre}
                      onChange={(e) => setNewGrupoNombre(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGrupoForm(false)}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Grupo</span>
                  </button>
                </div>
              </form>
            )}

            {/* Sub-Panel Opcional: Registro y Gestión de Líderes */}
            {showLeaderForm && (
              <div className="mb-5 p-4 bg-[#fff8e1]/80 rounded-xl border border-[#ffe082] space-y-4 animate-in fade-in">
                <form onSubmit={handleRegisterLider} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#ffe082]">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#ff8f00]" />
                      <h3 className="text-xs font-bold text-[#1b5e20] uppercase tracking-wide">
                        Registrar Nuevo Líder de Cuadrilla
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#ff8f00] font-semibold bg-[#fff3e0] px-2 py-0.5 rounded border border-[#ffe082]">
                      ✨ Disponible para liderar cualquier grupo o cuadrilla
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                        Nombre Completo del Líder *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Antony Cerron, Ana Rosa Jave..."
                        value={liderNombre}
                        onChange={(e) => setLiderNombre(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                        DNI (8 dígitos) *
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="Ej: 71928374"
                          value={liderDni}
                          onChange={(e) => setLiderDni(e.target.value.replace(/\D/g, ''))}
                          required
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScannerMode('leader');
                            setScannerOpen(true);
                          }}
                          className="bg-white border border-[#bfcaba] px-2.5 rounded-lg text-[#ff8f00] hover:bg-gray-50 flex items-center justify-center cursor-pointer"
                          title="Escanear DNI"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLeaderForm(false)}
                      className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Líder</span>
                    </button>
                  </div>
                </form>

                {/* Sección de Gestión / Eliminación de Líderes */}
                <div className="pt-3 border-t border-[#ffe082]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-[#ff8f00]" />
                      <span className="text-xs font-bold text-[#b26a00] uppercase">
                        Líderes Registrados en el Sistema ({availableLideres.length})
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">Puedes eliminar líderes obsoletos o duplicados</span>
                  </div>

                  {availableLideres.length === 0 ? (
                    <div className="text-center py-3 text-xs text-gray-500 bg-white/60 rounded-lg border border-dashed border-[#ffe082]">
                      No hay líderes registrados actualmente.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 bg-white/80 p-2 rounded-lg border border-[#ffe082]">
                      {availableLideres.map((lead) => (
                        <div
                          key={lead.nombre}
                          className="flex items-center justify-between px-3 py-1.5 bg-white rounded-md border border-gray-200 hover:border-[#ff8f00] text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">👑</span>
                            <div>
                              <span className="font-bold text-gray-900">{lead.nombre}</span>
                              {lead.dni && (
                                <span className="ml-2 font-mono text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  DNI: {lead.dni}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de eliminar al líder "${lead.nombre}"?`)) {
                                if (cuadrillaLider === lead.nombre) {
                                  setCuadrillaLider('');
                                  setCuadrillaLiderDni('');
                                }
                                if (onDeleteLider) {
                                  onDeleteLider(lead.nombre);
                                } else {
                                  onToast(`🗑️ Líder "${lead.nombre}" eliminado`);
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                            title={`Eliminar líder ${lead.nombre}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold">Eliminar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Listado y Selección de Personal */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 mb-3 gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2e7d32]" />
                <h3 className="text-sm font-bold text-[#1b5e20]">
                  Selección de Personal para la Cuadrilla
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#e8f5e9] text-[#1b5e20] font-bold text-xs px-2.5 py-1 rounded-full border border-[#a5d6a7]">
                  {selectedDnis.size} de {filteredTrabajadores.length} seleccionados
                </span>
                {selectedDnis.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleAssignCuadrillaToSelected}
                      className="text-[11px] bg-[#1b5e20] text-white hover:bg-[#2e7d32] font-bold px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                      title="Asignar los 5 campos actuales a los trabajadores seleccionados"
                    >
                      <Sparkles className="w-3 h-3 text-[#ffe082]" />
                      <span>Asignar Cuadrilla ({selectedDnis.size})</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-[11px] text-gray-500 hover:text-red-600 underline cursor-pointer ml-1"
                    >
                      Limpiar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Barra de Búsqueda y Botones de Acción Rápida */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar trabajador por nombre (Ej: Juan Soto) o DNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#bfcaba] rounded-lg focus:outline-none focus:border-[#2e7d32] bg-white"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenNewWorkerModal}
                  className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Registrar nuevo trabajador con Supervisor, Fundo, Módulo, Grupo y Líder"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Registrar Personal</span>
                </button>
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b5e20] text-xs font-bold py-2 px-3 rounded-lg border border-[#a5d6a7] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Seleccionar Todos</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('worker');
                    setScannerOpen(true);
                  }}
                  className="bg-[#ff8f00] hover:bg-[#e65100] text-white py-2 px-3.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Escanear DNI</span>
                </button>
              </div>
            </div>

            {/* Listado de Tarjetas de Trabajadores */}
            <div className="max-h-96 overflow-y-auto space-y-2 rounded-xl border border-[#e0e0e0] p-2 bg-[#fafafa]">
              {filteredTrabajadores.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No se encontraron trabajadores con los filtros de búsqueda aplicados.
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleOpenNewWorkerModal}
                      className="text-[#2e7d32] font-bold underline"
                    >
                      Haz clic aquí para registrar un nuevo trabajador
                    </button>
                  </div>
                </div>
              ) : (
                filteredTrabajadores.map((t) => {
                  const isChecked = selectedDnis.has(t.dni);
                  const assignedGrupo = workerAssignedGrupos[t.dni] || cuadrillaGrupo;

                  return (
                    <div
                      key={t.dni}
                      onClick={() => toggleWorker(t.dni)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none gap-2 ${
                        isChecked
                          ? 'bg-[#e8f5e9] border-[#2e7d32] shadow-sm ring-1 ring-[#2e7d32]'
                          : 'bg-white border-[#e0e0e0] hover:border-[#a5d6a7]'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 mt-0.5 sm:mt-0 rounded text-[#2e7d32] accent-[#2e7d32] pointer-events-none shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-[#212121]">
                              {t.nombres}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-[#1b5e20] bg-white px-1.5 py-0.2 rounded border border-[#c8e6c9]">
                              DNI: {t.dni}
                            </span>
                          </div>

                          {/* Estado de Vinculación: Solo cuando el usuario selecciona el trabajador se amarra a la cuadrilla */}
                          {isChecked ? (
                            <div className="text-[11px] text-[#555] flex flex-wrap items-center gap-1.5 mt-1.5 animate-in fade-in">
                              <span className="bg-white px-1.5 py-0.5 rounded border border-[#a5d6a7] font-semibold text-[#1b5e20]">
                                👤 <b>Sup:</b> {cuadrillaSupervisor || 'Por seleccionar'}
                              </span>
                              <span className="bg-white px-1.5 py-0.5 rounded border border-[#a5d6a7] font-semibold text-[#1b5e20]">
                                📍 <b>Fundo:</b> {cuadrillaFundo || 'Por seleccionar'}
                              </span>
                              <span className="bg-[#e8f5e9] px-1.5 py-0.5 rounded border border-[#81c784] font-bold text-[#1b5e20]">
                                🌱 <b>Módulo:</b> {cuadrillaModulo || 'Por seleccionar'}
                              </span>
                              <span className="bg-white px-1.5 py-0.5 rounded border border-[#a5d6a7] font-semibold text-[#1b5e20]">
                                👥 <b>Grupo:</b> {assignedGrupo || 'Por seleccionar'}
                              </span>
                              {cuadrillaLider && (
                                <span className="bg-[#fff8e1] px-1.5 py-0.5 rounded border border-[#ffe082] text-[#e65100] font-bold">
                                  👑 <b>Líder:</b> {cuadrillaLider}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#757575] flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-500 font-medium">
                                Personal de nómina general disponible para asignación
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {isChecked ? (
                          <span className="text-[10px] bg-[#2e7d32] text-white px-2.5 py-1 rounded-full font-bold shadow-xs flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>En Cuadrilla</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium border border-gray-200 flex items-center gap-1">
                            <Users className="w-2.5 h-2.5 text-gray-400" />
                            <span>Disponible</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Botón de Avance al Paso 2 */}
            <button
              type="button"
              onClick={handleStep1Next}
              className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] mt-4"
            >
              <span>Continuar al Registro de Avance ({selectedDnis.size} trabajadores)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: REGISTRO DE AVANCE (CABECERA EXPLICITA Y VINCULACION CONTEXTUAL) */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6 animate-in fade-in space-y-4">
          {/* Cabecera Explícita de Cuadrilla y Filtros */}
          <div className="bg-gradient-to-r from-[#1b5e20]/10 via-[#2e7d32]/10 to-[#81c784]/20 border border-[#a5d6a7] rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#c8e6c9]">
              <div>
                <span className="text-[11px] font-bold text-[#2e7d32] uppercase tracking-wider block">
                  Paso 2: Registro de Avance
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                  Ingreso de Jabas Cosechadas por Trabajador
                </h2>
              </div>

              {/* Indicadores de Métricas en Vivo */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-[#a5d6a7] text-center shadow-xs">
                  <div className="text-xs font-bold text-[#1b5e20]">{selectedWorkersList.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Personal</div>
                </div>
                <div className="bg-[#fff8e1] px-3.5 py-1.5 rounded-xl border border-[#ffe082] text-center shadow-xs">
                  <div className="text-sm font-extrabold text-[#e65100]">{totalJabasAvance}</div>
                  <div className="text-[10px] text-[#e65100] uppercase font-bold">Total Jabas</div>
                </div>
              </div>
            </div>

            {/* Cabecera con Filtro de Grupo y Líder Responsable Explícitos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
              <div className="bg-white/80 p-2.5 rounded-xl border border-[#e0e0e0]">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Filtro de Grupo
                </div>
                <div className="text-xs font-extrabold text-[#1b5e20] mt-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#2e7d32]" />
                  <span>{cuadrillaGrupo}</span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-[#ffe082]">
                <div className="text-[10px] font-bold text-[#e65100] uppercase tracking-wide">
                  Líder Responsable
                </div>
                <div className="text-xs font-extrabold text-[#e65100] mt-0.5 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-[#ff8f00]" />
                  <span>{cuadrillaLider || 'Antony Cerron'}</span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-[#e0e0e0]">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Supervisor
                </div>
                <div className="text-xs font-bold text-gray-800 mt-0.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-gray-600" />
                  <span>{cuadrillaSupervisor || 'Carlos Solar'}</span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-[#e0e0e0]">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Ubicación Campo
                </div>
                <div className="text-xs font-bold text-gray-800 mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-gray-600" />
                  <span>{cuadrillaFundo} - {cuadrillaModulo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda y Escáner en Paso 2 */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 bg-[#fcf9f8] p-3 rounded-xl border border-[#e0e0e0]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o DNI en esta cuadrilla..."
                value={step2SearchTerm}
                onChange={(e) => setStep2SearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#bfcaba] rounded-lg focus:outline-none focus:border-[#2e7d32] bg-white font-medium"
              />
              {step2SearchTerm && (
                <button
                  type="button"
                  onClick={() => setStep2SearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setScannerMode('worker');
                setScannerOpen(true);
              }}
              className="bg-[#ff8f00] hover:bg-[#e65100] text-white py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Escanear Fotocheck</span>
            </button>
          </div>

          {/* Listado de Trabajadores con Vinculación Contextual */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredStep2WorkersList.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
                No se encontraron trabajadores con el término "{step2SearchTerm}".
              </div>
            ) : (
              filteredStep2WorkersList.map((t) => {
              const currentVal = avanceValues[t.dni] !== undefined ? avanceValues[t.dni] : '';
              const numVal = avanceValues[t.dni] || 0;

              return (
                <div
                  key={t.dni}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-2xl border border-[#e0e0e0] bg-[#fafafa] gap-3 hover:border-[#a5d6a7] hover:bg-white transition-all shadow-2xs"
                >
                  {/* Datos del Trabajador vinculados contextualmente a la cuadrilla */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[#212121]">
                        {t.nombres}
                      </span>
                      <span className="text-[10px] bg-[#e8f5e9] text-[#1b5e20] px-2 py-0.5 rounded-full font-bold border border-[#c8e6c9]">
                        DNI: {t.dni}
                      </span>
                    </div>

                    {/* Fila de Contexto Vinculado con los 5 campos de la cuadrilla seleccionada */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                      <span className="bg-white px-2 py-0.5 rounded-md text-gray-700 border border-gray-200 text-[10px]">
                        👤 <b>Sup:</b> {cuadrillaSupervisor || t.supervisor || session.nombre}
                      </span>
                      <span className="bg-[#f5f5f5] text-gray-700 px-2 py-0.5 rounded-md font-medium text-[10px]">
                        📍 <b>Fundo:</b> {cuadrillaFundo || t.fundo || 'Santa Teresa'} · <b>Módulo:</b> {cuadrillaModulo || t.modulo || 'M01'}
                      </span>
                      <span className="bg-[#e8f5e9] text-[#1b5e20] px-2 py-0.5 rounded-md font-semibold text-[10px] border border-[#a5d6a7] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#2e7d32]" />
                        <span><b>Grupo:</b> {workerAssignedGrupos[t.dni] || cuadrillaGrupo || t.grupo || 'Grupo 01'}</span>
                      </span>
                      {cuadrillaLider && (
                        <span className="bg-[#fff8e1] text-[#e65100] px-2 py-0.5 rounded-md font-semibold text-[10px] border border-[#ffe082]">
                          👑 <b>Líder:</b> {cuadrillaLider}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controles Interactivos de Jabas (+ / - e Input) */}
                  <div className="flex items-center gap-2 self-end md:self-auto bg-white p-1.5 rounded-xl border border-[#bfcaba] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => adjustJabas(t.dni, -5)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                      title="Restar 5 jabas"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustJabas(t.dni, -1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                      title="Restar 1 jaba"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={currentVal}
                      onChange={(e) => handleJabasChange(t.dni, e.target.value)}
                      className="w-20 px-2 py-1 text-center font-extrabold text-sm text-[#1b5e20] rounded-md border border-gray-200 bg-white focus:outline-none focus:border-[#2e7d32]"
                    />

                    <button
                      type="button"
                      onClick={() => adjustJabas(t.dni, 1)}
                      className="w-7 h-7 rounded-lg bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b5e20] flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                      title="Sumar 1 jaba"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustJabas(t.dni, 5)}
                      className="w-7 h-7 rounded-lg bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b5e20] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                      title="Sumar 5 jabas"
                    >
                      +5
                    </button>
                  </div>
                </div>
              );
            })
          )}
          </div>

          {/* Botones de Navegación */}
          <div className="flex gap-3 pt-4 border-t border-[#e0e0e0]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#40493d] py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás a Configuración</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmAvance}
              className="flex-2 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Avance ({totalJabasAvance} jabas)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 3: RESUMEN DETALLADO ESTRUCTURADO EN BLOQUES JERÁRQUICOS */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6 animate-in fade-in space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#f0f0f0]">
            <div className="w-8 h-8 rounded-lg bg-[#fff8e1] flex items-center justify-center text-[#ff8f00]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                Paso 3: Resumen Detallado de Avance
              </h2>
              <p className="text-xs text-[#757575]">
                Revisa los bloques jerárquicos y el detalle de personal antes de registrar en el sistema
              </p>
            </div>
          </div>

          {/* Bloque 1: Datos Generales */}
          <div className="bg-[#fafafa] rounded-2xl border border-[#e0e0e0] p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
              <Building2 className="w-4 h-4 text-[#2e7d32]" />
              <h3 className="text-xs font-extrabold text-[#1b5e20] uppercase tracking-wider">
                Bloque 1: Datos Generales
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-[#e0e0e0]">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">
                  Supervisor Responsable
                </span>
                <span className="font-bold text-sm text-[#212121] mt-0.5 block">
                  {cuadrillaSupervisor || 'Carlos Solar'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#e0e0e0]">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">
                  Fundo Agrícola
                </span>
                <span className="font-bold text-sm text-[#212121] mt-0.5 block">
                  {cuadrillaFundo || 'Santa Teresa'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#e0e0e0]">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">
                  Módulo de Campo
                </span>
                <span className="font-bold text-sm text-[#212121] mt-0.5 block">
                  {cuadrillaModulo || 'M01'}
                </span>
              </div>
            </div>
          </div>

          {/* Bloque 2: Datos de Cuadrilla */}
          <div className="bg-[#fff8e1]/50 rounded-2xl border border-[#ffe082] p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#ffe082]">
              <Crown className="w-4 h-4 text-[#ff8f00]" />
              <h3 className="text-xs font-extrabold text-[#e65100] uppercase tracking-wider">
                Bloque 2: Datos de Cuadrilla
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-[#ffe082]">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">
                  Grupo de Trabajo
                </span>
                <span className="font-bold text-sm text-[#1b5e20] mt-0.5 block flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#2e7d32]" />
                  <span>{cuadrillaGrupo}</span>
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#ffe082]">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">
                  Líder Responsable
                </span>
                <span className="font-bold text-sm text-[#e65100] mt-0.5 block flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-[#ff8f00]" />
                  <span>{cuadrillaLider || 'Antony Cerron'}</span>
                  {cuadrillaLiderDni && (
                    <span className="text-xs text-gray-500 font-normal">
                      (DNI: {cuadrillaLiderDni})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Gran Total Métrica de Jabas */}
          <div className="bg-gradient-to-r from-[#e8f5e9] to-[#c8e6c9] border border-[#a5d6a7] rounded-2xl p-5 text-center">
            <div className="text-4xl font-black text-[#1b5e20]">{totalJabasAvance}</div>
            <div className="text-xs text-[#1b5e20] font-extrabold uppercase tracking-wider mt-1">
              Jabas de Avance Totales
            </div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              Registradas para {Object.keys(avanceValues).length} trabajadores en la fecha{' '}
              <span className="font-bold">{getLocalToday()}</span>
            </div>
          </div>

          {/* Lista de Personal: Detalle Individual con sus Jabas */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="text-xs font-extrabold text-[#40493d] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#2e7d32]" />
                <span>Lista de Personal: Detalle Individual</span>
              </h3>
              <span className="text-[11px] font-bold text-[#1b5e20] bg-[#e8f5e9] px-2.5 py-0.5 rounded-full border border-[#a5d6a7]">
                {Object.keys(avanceValues).length} Registros
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-2xl border border-[#e0e0e0] divide-y divide-[#f0f0f0] bg-white">
              {Object.keys(avanceValues).map((dni) => {
                const t = trabajadores.find((x) => x.dni === dni);
                const count = avanceValues[dni];
                const effectiveSupervisor = cuadrillaSupervisor || t?.supervisor || session.nombre;
                const effectiveFundo = cuadrillaFundo || t?.fundo || 'Santa Teresa';
                const effectiveModulo = cuadrillaModulo || t?.modulo || 'M01';
                const effectiveGrupo = workerAssignedGrupos[dni] || cuadrillaGrupo || t?.grupo || 'Grupo 01';
                const effectiveLider = cuadrillaLider || t?.lider || '';

                return (
                  <div
                    key={dni}
                    className="p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:bg-[#fafafa] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#212121]">
                          {t ? t.nombres : dni}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[#1b5e20] bg-[#e8f5e9] px-1.5 py-0.2 rounded border border-[#c8e6c9]">
                          DNI: {dni}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#757575] flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          👤 <b>Sup:</b> {effectiveSupervisor}
                        </span>
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          📍 <b>Fundo:</b> {effectiveFundo} · <b>Módulo:</b> {effectiveModulo}
                        </span>
                        <span className="font-semibold text-[#1b5e20] bg-[#e8f5e9] px-1.5 py-0.5 rounded border border-[#a5d6a7]">
                          👥 <b>Grupo:</b> {effectiveGrupo}
                        </span>
                        {effectiveLider && (
                          <span className="bg-[#fff8e1] px-1.5 py-0.5 rounded text-[#e65100] font-semibold border border-[#ffe082]">
                            👑 <b>Líder:</b> {effectiveLider}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <span className="text-xs font-bold text-gray-500">Avance:</span>
                      <span className="px-3 py-1 bg-[#fff8e1] border border-[#ffe082] text-[#e65100] font-extrabold text-sm rounded-lg shadow-2xs">
                        {count} jabas
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones Finales */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#40493d] py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Modificar Jabas</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAvanceFinal}
              className="flex-2 bg-[#ff8f00] hover:bg-[#e65100] text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Save className="w-4 h-4" />
              <span>💾 Guardar Avance en el Sistema</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Personal (con los 5 campos requeridos) */}
      {showNewWorkerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#e0e0e0]">
            <div className="bg-[#1b5e20] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Registrar Nuevo Trabajador</h3>
                  <p className="text-[11px] text-green-100">
                    Se asociará con Supervisor, Fundo, Módulo, Grupo y Líder
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewWorkerModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterNewWorker} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* DNI */}
                <div>
                  <label className="block text-xs font-bold text-[#40493d] mb-1">
                    DNI / Fotocheck (8 dígitos) *
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="Ej: 71234567"
                      value={newWorkerDni}
                      onChange={(e) => setNewWorkerDni(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white font-mono text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerMode('worker');
                        setScannerOpen(true);
                      }}
                      className="bg-gray-100 border border-[#bfcaba] px-2.5 rounded-lg text-[#ff8f00] hover:bg-gray-200 flex items-center justify-center cursor-pointer"
                      title="Escanear DNI"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Nombres */}
                <div>
                  <label className="block text-xs font-bold text-[#40493d] mb-1">
                    Nombres y Apellidos *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Soto Quispe"
                    value={newWorkerNombres}
                    onChange={(e) => setNewWorkerNombres(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#bfcaba] bg-white uppercase text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                  />
                </div>
              </div>

              {/* Contexto: 5 Campos */}
              <div className="bg-[#fcf9f8] p-3.5 rounded-xl border border-[#e0e0e0] space-y-2.5">
                <div className="text-[11px] font-bold text-[#1b5e20] uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff8f00]" />
                  <span>Asignación de Cuadrilla del Trabajador</span>
                </div>

                {/* 1. Supervisor */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                    1. Supervisor Responsable
                  </label>
                  <select
                    value={newWorkerSupervisor}
                    onChange={(e) => setNewWorkerSupervisor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                  >
                    <option value="">Seleccionar supervisor...</option>
                    {supervisoresList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2 & 3. Fundo y Modulo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                      2. Fundo Agrícola
                    </label>
                    <select
                      value={newWorkerFundo}
                      onChange={(e) => {
                        setNewWorkerFundo(e.target.value);
                        if (e.target.value === 'Santa Teresa') setNewWorkerModulo('M01');
                        else if (e.target.value === 'Arena Azul') setNewWorkerModulo('M01');
                        else if (e.target.value === 'Vivadis') setNewWorkerModulo('M01');
                        else if (e.target.value === 'Ayllu Allpa') setNewWorkerModulo('M12');
                        else if (e.target.value === 'Ampliacion') setNewWorkerModulo('M16');
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                    >
                      {fundosList.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                      3. Módulo de Campo
                    </label>
                    <select
                      value={newWorkerModulo}
                      onChange={(e) => setNewWorkerModulo(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                    >
                      {modulosList.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4 & 5. Grupo y Lider */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                      4. Grupo de Trabajo
                    </label>
                    <select
                      value={newWorkerGrupo}
                      onChange={(e) => setNewWorkerGrupo(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                    >
                      {allGrupos.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                      5. Líder Responsable
                    </label>
                    <select
                      value={newWorkerLider}
                      onChange={(e) => setNewWorkerLider(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white font-medium text-gray-900 focus:outline-none focus:border-[#2e7d32]"
                    >
                      <option value="">Sin líder asignado</option>
                      {availableLideres.map((l) => (
                        <option key={`${l.nombre}_${l.dni}`} value={l.nombre}>
                          👑 {l.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewWorkerModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar y Asignar a Cuadrilla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scanner Modal Component */}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanDni={handleScanDniResult}
        trabajadores={trabajadores}
        mode={scannerMode}
      />
    </div>
  );
};
