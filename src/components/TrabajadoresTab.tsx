import React, { useState, useMemo, useEffect } from 'react';
import { Trabajador, Lider, UserSession, DetalleJaba } from '../types';
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
  Calendar
} from 'lucide-react';

interface TrabajadoresTabProps {
  session: UserSession;
  trabajadores: Trabajador[];
  grupos: string[];
  lideres: Lider[];
  onSaveLider: (lider: Lider) => void;
  onSaveAvance: (avanceMap: Record<string, number>, detalleList: DetalleJaba[]) => void;
  onToast: (msg: string) => void;
}

export const TrabajadoresTab: React.FC<TrabajadoresTabProps> = ({
  session,
  trabajadores,
  grupos,
  lideres,
  onSaveLider,
  onSaveAvance,
  onToast
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Supervisor checking
  const isSupervisorUser = session.rol === 'Supervisor';
  const sessionSupervisorName = session.nombre;

  // Paso 1: Configuración de Cuadrilla Secuencial
  const [cuadrillaSupervisor, setCuadrillaSupervisor] = useState(
    isSupervisorUser ? sessionSupervisorName : 'Carlos Solar'
  );
  const [cuadrillaFundo, setCuadrillaFundo] = useState('Santa Teresa');
  const [cuadrillaModulo, setCuadrillaModulo] = useState('M01');
  const [cuadrillaGrupo, setCuadrillaGrupo] = useState('Grupo01');
  const [cuadrillaLider, setCuadrillaLider] = useState('Antony Cerron');
  const [cuadrillaLiderDni, setCuadrillaLiderDni] = useState('71928374');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Workers (Set of DNI strings)
  const [selectedDnis, setSelectedDnis] = useState<Set<string>>(new Set());

  // Avance values: { [dni]: jabasCount }
  const [avanceValues, setAvanceValues] = useState<Record<string, number>>({});

  // Leader registration state (Sub-module)
  const [showLeaderForm, setShowLeaderForm] = useState(false);
  const [liderGrupo, setLiderGrupo] = useState('Grupo01');
  const [liderNombre, setLiderNombre] = useState('');
  const [liderDni, setLiderDni] = useState('');
  const [filtroGrupoLideres, setFiltroGrupoLideres] = useState('');

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'worker' | 'leader'>('worker');

  // Derive unique lists for dropdowns
  const supervisoresList = useMemo(() => {
    const set = new Set<string>();
    if (isSupervisorUser && sessionSupervisorName) {
      set.add(sessionSupervisorName);
    }
    set.add('Carlos Solar');
    set.add('Carlos Mendoza');
    set.add('María Quispe');
    trabajadores.forEach((t) => {
      if (t.supervisor) set.add(t.supervisor);
    });
    return Array.from(set).sort();
  }, [trabajadores, isSupervisorUser, sessionSupervisorName]);

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
    }
    trabajadores.forEach((t) => {
      if ((!cuadrillaFundo || t.fundo === cuadrillaFundo) && t.modulo) {
        set.add(t.modulo);
      }
    });
    return Array.from(set).sort();
  }, [trabajadores, cuadrillaFundo]);

  const allGrupos = useMemo(() => {
    const set = new Set<string>();
    set.add('Grupo01');
    set.add('Grupo 01');
    grupos.forEach((g) => set.add(g));
    trabajadores.forEach((t) => {
      if (t.grupo) set.add(t.grupo);
    });
    lideres.forEach((l) => {
      if (l.grupo) set.add(l.grupo);
    });
    return Array.from(set);
  }, [grupos, trabajadores, lideres]);

  // Combined leaders list (from state + defaults)
  const availableLideres = useMemo(() => {
    const list: { nombre: string; dni: string; grupo: string }[] = [];
    
    // Add default Antony Cerron
    list.push({ nombre: 'Antony Cerron', dni: '71928374', grupo: 'Grupo01' });

    lideres.forEach((l) => {
      if (!list.some((item) => item.nombre.toLowerCase() === l.lider.toLowerCase())) {
        list.push({ nombre: l.lider, dni: l.dni, grupo: l.grupo });
      }
    });

    trabajadores.forEach((t) => {
      if (t.lider && !list.some((item) => item.nombre.toLowerCase() === t.lider!.toLowerCase())) {
        list.push({ nombre: t.lider, dni: t.dni, grupo: t.grupo || 'Grupo01' });
      }
    });

    return list;
  }, [lideres, trabajadores]);

  // Auto update leader when group changes if match exists
  useEffect(() => {
    const matched = availableLideres.find(
      (l) => l.grupo.toLowerCase() === cuadrillaGrupo.toLowerCase()
    );
    if (matched) {
      setCuadrillaLider(matched.nombre);
      setCuadrillaLiderDni(matched.dni);
    }
  }, [cuadrillaGrupo, availableLideres]);

  // Filtered workers list
  const filteredTrabajadores = useMemo(() => {
    const seenDni = new Set<string>();
    return trabajadores.filter((t) => {
      if (seenDni.has(t.dni)) return false;
      seenDni.add(t.dni);

      // Match Supervisor
      if (cuadrillaSupervisor && t.supervisor) {
        const matchesSup = 
          t.supervisor.toLowerCase().includes(cuadrillaSupervisor.toLowerCase()) ||
          cuadrillaSupervisor.toLowerCase().includes(t.supervisor.toLowerCase());
        if (!matchesSup && cuadrillaSupervisor !== '') {
          // allow soft match if user wants to see all
        }
      }

      // Match Fundo
      if (cuadrillaFundo && t.fundo && t.fundo.toLowerCase() !== cuadrillaFundo.toLowerCase()) {
        // filter unless blank
      }

      // Match search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches =
          t.nombres.toLowerCase().includes(term) ||
          t.dni.includes(term) ||
          (t.grupo && t.grupo.toLowerCase().includes(term)) ||
          (t.fundo && t.fundo.toLowerCase().includes(term));
        if (!matches) return false;
      }

      return true;
    });
  }, [trabajadores, cuadrillaSupervisor, cuadrillaFundo, searchTerm]);

  // Toggle single worker selection
  const toggleWorker = (dni: string) => {
    const next = new Set(selectedDnis);
    if (next.has(dni)) next.delete(dni);
    else next.add(dni);
    setSelectedDnis(next);
  };

  // Select all filtered workers
  const selectAllFiltered = () => {
    const next = new Set(selectedDnis);
    filteredTrabajadores.forEach((t) => next.add(t.dni));
    setSelectedDnis(next);
    onToast(`✅ ${filteredTrabajadores.length} trabajadores seleccionados`);
  };

  const clearSelection = () => {
    setSelectedDnis(new Set());
    onToast('Selección de personal limpiada');
  };

  // Barcode / DNI Scan Handler
  const handleScanDniResult = (dni: string) => {
    if (scannerMode === 'leader') {
      setLiderDni(dni);
      const found = trabajadores.find((t) => String(t.dni).trim() === dni.trim());
      if (found) {
        setLiderNombre(found.nombres);
        setCuadrillaLider(found.nombres);
        setCuadrillaLiderDni(found.dni);
      }
      setScannerOpen(false);
      onToast(`👑 DNI de líder asignado: ${dni}`);
    } else {
      const next = new Set(selectedDnis);
      next.add(dni);
      setSelectedDnis(next);
      onToast(`👷 Trabajador con DNI ${dni} agregado a la cuadrilla`);
    }
  };

  // Register new Leader
  const handleRegisterLider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liderGrupo) {
      onToast('⚠️ Selecciona un grupo para el líder');
      return;
    }
    if (!liderNombre.trim()) {
      onToast('⚠️ Ingresa el nombre del líder');
      return;
    }
    if (!liderDni.trim() || liderDni.length < 8) {
      onToast('⚠️ Ingresa un DNI válido de 8 dígitos');
      return;
    }

    const newLider: Lider = {
      lider: liderNombre.trim(),
      dni: liderDni.trim(),
      nombres: liderNombre.trim(),
      grupo: liderGrupo,
      fechaAlta: getLocalToday()
    };

    onSaveLider(newLider);
    setCuadrillaLider(liderNombre.trim());
    setCuadrillaLiderDni(liderDni.trim());
    setCuadrillaGrupo(liderGrupo);
    onToast(`👑 Líder ${liderNombre} registrado y asignado a la cuadrilla`);
    setLiderNombre('');
    setLiderDni('');
    setShowLeaderForm(false);
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
    return trabajadores
      .filter((t) => selectedDnis.has(t.dni))
      .sort((a, b) => a.nombres.localeCompare(b.nombres));
  }, [trabajadores, selectedDnis]);

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
        detalleList.push({
          id: `${hoy}_${dni}_${cuadrillaModulo || 'M01'}`,
          fecha: hoy,
          dni,
          trabajador: t ? t.nombres : dni,
          fundo: cuadrillaFundo || (t ? t.fundo : 'Santa Teresa'),
          modulo: cuadrillaModulo || (t ? t.modulo : 'M01'),
          jabas,
          supervisor: cuadrillaSupervisor || session.nombre,
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
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>1. Supervisor</span>
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
                      setCuadrillaFundo(e.target.value);
                      setCuadrillaModulo('M01');
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
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>3. Módulo</span>
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
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32]">
                  <Users className="w-3.5 h-3.5" />
                  <span>4. Grupo</span>
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
                  <span className="font-semibold text-[#1b5e20]">Ejemplo:</span> Grupo01
                </div>
              </div>

              {/* 5. Líder Responsable */}
              <div className="space-y-1">
                <label className="flex items-center justify-between text-xs font-bold text-[#ff8f00]">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    <span>5. Líder</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLeaderForm(!showLeaderForm)}
                    className="text-[10px] text-[#2e7d32] hover:underline font-normal cursor-pointer"
                  >
                    {showLeaderForm ? 'Cerrar' : '+ Registrar'}
                  </button>
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
                        👑 {l.nombre} ({l.grupo})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="font-semibold text-[#1b5e20]">Ejemplo:</span> Antony Cerron
                </div>
              </div>
            </div>

            {/* Sub-Panel Opcional: Registro de Nuevo Líder */}
            {showLeaderForm && (
              <form
                onSubmit={handleRegisterLider}
                className="mb-5 p-4 bg-[#fff8e1]/70 rounded-xl border border-[#ffe082] space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#ffe082]">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#ff8f00]" />
                    <h3 className="text-xs font-bold text-[#1b5e20] uppercase tracking-wide">
                      Registrar Nuevo Líder de Cuadrilla
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#757575]">Se vinculará a la cuadrilla actual</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                      Grupo Asignado *
                    </label>
                    <select
                      value={liderGrupo}
                      onChange={(e) => setLiderGrupo(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white"
                    >
                      {allGrupos.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#40493d] mb-1">
                      Nombre del Líder *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Antony Cerron"
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
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#bfcaba] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScannerMode('leader');
                          setScannerOpen(true);
                        }}
                        className="bg-white border border-[#bfcaba] px-2.5 rounded-lg text-[#ff8f00] hover:bg-gray-50"
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
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
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
            )}

            {/* Listado y Selección de Personal */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 mb-3 gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2e7d32]" />
                <h3 className="text-sm font-bold text-[#1b5e20]">
                  Selección de Personal para la Cuadrilla
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#e8f5e9] text-[#1b5e20] font-bold text-xs px-2.5 py-1 rounded-full border border-[#a5d6a7]">
                  {selectedDnis.size} de {filteredTrabajadores.length} seleccionados
                </span>
                {selectedDnis.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-[11px] text-gray-500 hover:text-red-600 underline cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Barra de Búsqueda y Botones de Acción Rápida */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar trabajador por nombre (Ej: Julia Cruz) o DNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#bfcaba] rounded-lg focus:outline-none focus:border-[#2e7d32] bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
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
            <div className="max-h-80 overflow-y-auto space-y-1.5 rounded-xl border border-[#e0e0e0] p-2 bg-[#fafafa]">
              {filteredTrabajadores.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No se encontraron trabajadores con los filtros de búsqueda aplicados.
                </div>
              ) : (
                filteredTrabajadores.map((t) => {
                  const isChecked = selectedDnis.has(t.dni);
                  return (
                    <div
                      key={t.dni}
                      onClick={() => toggleWorker(t.dni)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-[#e8f5e9] border-[#2e7d32] shadow-sm'
                          : 'bg-white border-[#e0e0e0] hover:border-[#a5d6a7]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-[#2e7d32] accent-[#2e7d32] pointer-events-none"
                        />
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-[#212121]">
                            {t.nombres}
                          </div>
                          <div className="text-[11px] text-[#757575] flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="font-semibold text-[#1b5e20]">DNI: {t.dni}</span>
                            <span>·</span>
                            <span>{t.fundo || cuadrillaFundo} - {t.modulo || cuadrillaModulo}</span>
                            <span>·</span>
                            <span>Sup: {t.supervisor || cuadrillaSupervisor}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-[#f1f8e9] text-[#2e7d32] px-2 py-0.5 rounded-full font-semibold border border-[#c8e6c9]">
                          {t.grupo || cuadrillaGrupo}
                        </span>
                        {isChecked && (
                          <span className="text-[10px] bg-[#2e7d32] text-white px-2 py-0.5 rounded-full font-bold">
                            Asignado
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

          {/* Listado de Trabajadores con Vinculación Contextual */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {selectedWorkersList.map((t) => {
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

                    {/* Fila de Contexto Vinculado */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                      <span className="bg-[#fff8e1] text-[#e65100] px-2 py-0.5 rounded-md font-semibold text-[10px] border border-[#ffe082]">
                        👑 Líder: {cuadrillaLider || 'Antony Cerron'}
                      </span>
                      <span className="bg-[#f5f5f5] text-gray-700 px-2 py-0.5 rounded-md font-semibold text-[10px] border border-gray-200">
                        👥 Grupo: {cuadrillaGrupo}
                      </span>
                      <span className="bg-[#f5f5f5] text-gray-700 px-2 py-0.5 rounded-md font-medium text-[10px]">
                        📍 {cuadrillaFundo} · {cuadrillaModulo}
                      </span>
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
            })}
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
                return (
                  <div
                    key={dni}
                    className="p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 hover:bg-[#fafafa] transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-[#212121]">
                        {t ? t.nombres : dni}
                      </div>
                      <div className="text-[11px] text-[#757575] flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-semibold text-[#1b5e20]">DNI: {dni}</span>
                        <span>·</span>
                        <span>Grupo: {cuadrillaGrupo}</span>
                        <span>·</span>
                        <span>Líder: {cuadrillaLider || 'Antony Cerron'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-xs font-bold text-gray-500">Avance:</span>
                      <span className="px-3 py-1 bg-[#fff8e1] border border-[#ffe082] text-[#e65100] font-extrabold text-sm rounded-lg">
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
