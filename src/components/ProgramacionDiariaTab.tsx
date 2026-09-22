import React, { useState, useMemo } from 'react';
import { ProgramacionDiaria, SelectedLote, UserSession } from '../types';
import { 
  INITIAL_FUNDOS, 
  INITIAL_MODULOS_POR_FUNDO, 
  INITIAL_LOTES 
} from '../data/initialData';
import { getLocalToday, getLocalISO, getUsuarios } from '../utils/storage';
import { 
  CalendarCheck, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  CheckSquare, 
  Square, 
  Save, 
  Layers, 
  Calendar, 
  Box, 
  Sparkles,
  Plus,
  ListFilter,
  Search,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  Sprout,
  Clock,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface ProgramacionDiariaTabProps {
  session: UserSession;
  programacionesDiarias: ProgramacionDiaria[];
  onSaveProgramacion: (item: ProgramacionDiaria) => void;
  onDeleteProgramacion: (id: string) => void;
  onGoToEjecucion?: (item: ProgramacionDiaria) => void;
  onToast: (msg: string) => void;
}

export const ProgramacionDiariaTab: React.FC<ProgramacionDiariaTabProps> = ({
  session,
  programacionesDiarias,
  onSaveProgramacion,
  onDeleteProgramacion,
  onGoToEjecucion,
  onToast
}) => {
  // Verificación de acceso estricta: Asignado a los roles de Supervisor y Administrador
  const isAuthorizedRole = session.rol === 'Administrador' || session.rol === 'Supervisor';

  // Navigation between Wizard and History
  const [activeSubTab, setActiveSubTab] = useState<'wizard' | 'historial'>('wizard');

  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State (Same options as Ejecución)
  const [fecha, setFecha] = useState(getLocalToday());
  const [supervisorAsignado, setSupervisorAsignado] = useState<string>(() => {
    return session.nombre || 'Supervisor';
  });
  const [fundo, setFundo] = useState('');
  const [modulo, setModulo] = useState('');
  const [haTotal, setHaTotal] = useState('');
  const [numTrabajadores, setNumTrabajadores] = useState('');
  const [tipo, setTipo] = useState<'Suelo' | 'Maceta'>('Suelo');
  const [jabas, setJabas] = useState('');
  const [variedad, setVariedad] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Supervisores disponibles para asignación (rol Supervisor y Administrador)
  const supervisoresDisponibles = useMemo(() => {
    try {
      const list = getUsuarios()
        .filter((u) => u.rol === 'Supervisor' || u.rol === 'Administrador')
        .map((u) => u.nombre);
      if (session.nombre && !list.includes(session.nombre)) {
        list.push(session.nombre);
      }
      return Array.from(new Set(list.filter(Boolean))).sort();
    } catch {
      return [session.nombre || 'Supervisor'];
    }
  }, [session.nombre]);

  // Lotes State
  const [selectedLotes, setSelectedLotes] = useState<Set<string>>(new Set());

  // Modal confirmation state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSavedId, setLastSavedId] = useState('');

  // Historial Filters State
  const [filtroFecha, setFiltroFecha] = useState<string>(getLocalToday());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const availableModulos = fundo ? INITIAL_MODULOS_POR_FUNDO[fundo] || [] : [];
  
  // Available lotes for chosen Fundo & Modulo
  const availableLotes = INITIAL_LOTES.filter(
    (l) => l.fundo === fundo && l.modulo === modulo
  );

  // Group lotes by Turno
  const lotesByTurno = availableLotes.reduce((acc, l) => {
    if (!acc[l.turno]) acc[l.turno] = [];
    acc[l.turno].push(l);
    return acc;
  }, {} as Record<string, typeof availableLotes>);

  // Handlers for Fundo & Modulo changes
  const handleFundoChange = (newFundo: string) => {
    setFundo(newFundo);
    setModulo('');
    setSelectedLotes(new Set());
  };

  const handleModuloChange = (newModulo: string) => {
    setModulo(newModulo);
    setSelectedLotes(new Set());
  };

  // Lotes multi-selection logic
  const toggleLote = (key: string) => {
    const next = new Set(selectedLotes);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedLotes(next);
  };

  const selectAllLotes = () => {
    const next = new Set<string>();
    availableLotes.forEach((l) => {
      next.add(`${l.turno}|${l.lote}`);
    });
    setSelectedLotes(next);
    onToast(`✅ ${availableLotes.length} lotes seleccionados`);
  };

  const clearAllLotes = () => {
    setSelectedLotes(new Set());
    onToast('Selección de lotes anulada');
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !fundo || !modulo) {
      onToast('⚠️ Por favor completa Fecha, Fundo y Módulo');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const handleSaveFinal = () => {
    const lotesList: SelectedLote[] = Array.from(selectedLotes).map((key: string) => {
      const [turno, lote] = key.split('|');
      return { turno, lote };
    });

    const newId = `PROG_DIA_${Date.now().toString().slice(-6)}`;
    const nuevaProgramacion: ProgramacionDiaria = {
      id: newId,
      fecha,
      fundo,
      modulo,
      haTotal: haTotal || '0',
      numTrab: numTrabajadores || '0',
      tipo,
      jabas: parseFloat(jabas) || 0,
      ddc: 0,
      lotes: lotesList,
      totalLotes: lotesList.length,
      fechaRegistro: getLocalISO(),
      supervisor: supervisorAsignado || session.nombre || 'Supervisor',
      variedad: variedad.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      estado: 'Programado'
    };

    onSaveProgramacion(nuevaProgramacion);
    setLastSavedId(newId);
    setShowSuccessModal(true);
    onToast(`🎉 Programación Diaria ${newId} guardada exitosamente`);
  };

  const resetAll = () => {
    setStep(1);
    setFundo('');
    setModulo('');
    setHaTotal('');
    setNumTrabajadores('');
    setTipo('Suelo');
    setJabas('');
    setSupervisorAsignado(session.nombre || 'Supervisor');
    setVariedad('');
    setObservaciones('');
    setSelectedLotes(new Set());
    setShowSuccessModal(false);
  };

  // Historial Filtered Items
  const filteredHistorial = useMemo(() => {
    return programacionesDiarias.filter((p) => {
      // Date filter
      if (filtroFecha && p.fecha !== filtroFecha) {
        return false;
      }
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesFundo = p.fundo.toLowerCase().includes(term);
        const matchesModulo = p.modulo.toLowerCase().includes(term);
        const matchesId = p.id.toLowerCase().includes(term);
        const matchesSupervisor = p.supervisor ? p.supervisor.toLowerCase().includes(term) : false;
        const matchesLote = p.lotes?.some(l => l.lote.toLowerCase().includes(term));
        if (!matchesFundo && !matchesModulo && !matchesId && !matchesSupervisor && !matchesLote) {
          return false;
        }
      }
      return true;
    });
  }, [programacionesDiarias, filtroFecha, searchTerm]);

  // Totals for current filter
  const stats = useMemo(() => {
    let totalJabas = 0;
    let totalHa = 0;
    let totalTrab = 0;
    filteredHistorial.forEach(p => {
      totalJabas += Number(p.jabas) || 0;
      totalHa += parseFloat(p.haTotal) || 0;
      totalTrab += parseInt(p.numTrab, 10) || 0;
    });
    return {
      count: filteredHistorial.length,
      totalJabas,
      totalHa: totalHa.toFixed(1),
      totalTrab
    };
  }, [filteredHistorial]);

  if (!isAuthorizedRole) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-8 text-center max-w-lg mx-auto mt-8">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <CalendarCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-1">Acceso Restringido</h3>
        <p className="text-xs text-gray-600 mb-2">
          La vista de <strong>Programación Diaria</strong> está asignada exclusivamente al rol de <strong>Supervisor</strong> y <strong>Administrador</strong>.
        </p>
        <span className="inline-block text-[11px] bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
          Tu rol actual: {session.rol}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Tab Toggle Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#2e7d32]">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#1b5e20] leading-tight">
                  Programación Diaria de Cosecha
                </h1>
                <span className="bg-[#e8f5e9] text-[#2e7d32] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#a5d6a7]">
                  Supervisor / Admin
                </span>
              </div>
              <p className="text-xs text-[#757575]">
                Planificación operativa por fundo, módulo, lotes, dotación y jabas proyectadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => setActiveSubTab('wizard')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'wizard'
                  ? 'bg-[#2e7d32] text-white shadow-sm'
                  : 'bg-[#f5f5f5] text-[#5f6368] hover:bg-[#e8f5e9] hover:text-[#2e7d32]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Programación</span>
            </button>
            <button
              onClick={() => setActiveSubTab('historial')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'historial'
                  ? 'bg-[#2e7d32] text-white shadow-sm'
                  : 'bg-[#f5f5f5] text-[#5f6368] hover:bg-[#e8f5e9] hover:text-[#2e7d32]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Historial ({programacionesDiarias.length})</span>
            </button>
          </div>
        </div>

        {/* Wizard Step Indicator (Only shown in wizard mode) */}
        {activeSubTab === 'wizard' && (
          <div className="flex items-center justify-between max-w-xl mx-auto pt-4 pb-1">
            <div
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 cursor-pointer transition-all ${
                step === 1 ? 'text-[#2e7d32] font-bold' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === 1
                    ? 'bg-[#2e7d32] text-white shadow-sm ring-2 ring-[#a5d6a7]'
                    : step > 1
                    ? 'bg-[#c8e6c9] text-[#1b5e20]'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-xs uppercase tracking-tight hidden sm:inline">1. Parámetros</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-[#2e7d32]' : 'bg-gray-200'}`} />

            <div
              onClick={() => (fundo && modulo ? setStep(2) : null)}
              className={`flex items-center gap-2 transition-all ${
                fundo && modulo ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              } ${step === 2 ? 'text-[#2e7d32] font-bold' : 'text-gray-400'}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === 2
                    ? 'bg-[#2e7d32] text-white shadow-sm ring-2 ring-[#a5d6a7]'
                    : step > 2
                    ? 'bg-[#c8e6c9] text-[#1b5e20]'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-xs uppercase tracking-tight hidden sm:inline">2. Lotes</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-[#2e7d32]' : 'bg-gray-200'}`} />

            <div
              onClick={() => (fundo && modulo ? setStep(3) : null)}
              className={`flex items-center gap-2 transition-all ${
                fundo && modulo ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              } ${step === 3 ? 'text-[#2e7d32] font-bold' : 'text-gray-400'}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === 3
                    ? 'bg-[#2e7d32] text-white shadow-sm ring-2 ring-[#a5d6a7]'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                3
              </div>
              <span className="text-xs uppercase tracking-tight hidden sm:inline">3. Confirmación</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: 3-STEP WIZARD (Mismas opciones de Ejecución) */}
      {/* ========================================================================= */}
      {activeSubTab === 'wizard' && (
        <>
          {/* STEP 1: Parámetros */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6 animate-in fade-in">
              <div className="flex items-center gap-2 pb-3 border-b border-[#f0f0f0] mb-5">
                <CalendarCheck className="w-5 h-5 text-[#2e7d32]" />
                <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                  Paso 1: Parámetros de la Programación Diaria
                </h2>
              </div>

              <form onSubmit={handleStep1Next} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Fecha de Programación *
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Supervisor Asignado *
                    </label>
                    {session.rol === 'Administrador' ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#bfcaba] bg-white">
                        <Users className="w-4 h-4 text-[#2e7d32] shrink-0" />
                        <select
                          value={supervisorAsignado}
                          onChange={(e) => setSupervisorAsignado(e.target.value)}
                          className="w-full text-xs sm:text-sm bg-transparent font-medium text-gray-800 focus:outline-none cursor-pointer"
                        >
                          {supervisoresDisponibles.map((sup) => (
                            <option key={sup} value={sup}>
                              {sup} {sup === session.nombre ? '(Tú - Admin)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-gray-800 text-xs sm:text-sm font-semibold">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#2e7d32] shrink-0" />
                          <span>{supervisorAsignado}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                          Supervisor Activo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Fundo *
                    </label>
                    <select
                      value={fundo}
                      onChange={(e) => handleFundoChange(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                    >
                      <option value="">Seleccionar fundo...</option>
                      {INITIAL_FUNDOS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Módulo *
                    </label>
                    <select
                      value={modulo}
                      onChange={(e) => handleModuloChange(e.target.value)}
                      disabled={!fundo}
                      required
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32] disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">
                        {fundo ? 'Seleccionar módulo...' : 'Primero selecciona un fundo'}
                      </option>
                      {availableModulos.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Hectáreas Totales (Ha_Total)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      value={haTotal}
                      onChange={(e) => setHaTotal(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Cantidad de Trabajadores Programados
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={numTrabajadores}
                      onChange={(e) => setNumTrabajadores(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Tipo de Cultivo
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as 'Suelo' | 'Maceta')}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                    >
                      <option value="Suelo">Suelo</option>
                      <option value="Maceta">Maceta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Jabas Programadas (Proyectadas)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={jabas}
                      onChange={(e) => setJabas(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Variedad (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Biloxi, Ventura, Atlas..."
                      value={variedad}
                      onChange={(e) => setVariedad(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#40493d] mb-1">
                      Observaciones / Notas
                    </label>
                    <input
                      type="text"
                      placeholder="Instrucciones para campo, cuadrilla asignada..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] mt-6"
                >
                  <span>Siguiente: Selección de Lotes</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Selección de Lotes */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                      Paso 2: Selección de Lotes
                    </h2>
                    <span className="bg-[#e8f5e9] text-[#1b5e20] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#a5d6a7]">
                      {selectedLotes.size} seleccionados
                    </span>
                  </div>
                  <p className="text-xs text-[#757575] mt-0.5">
                    Fundo: <strong className="text-[#1b5e20]">{fundo}</strong> · Módulo:{' '}
                    <strong className="text-[#1b5e20]">{modulo}</strong>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllLotes}
                    className="bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b5e20] text-xs font-bold py-1.5 px-3 rounded-lg border border-[#a5d6a7] flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Todo</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearAllLotes}
                    className="bg-[#ffebee] hover:bg-[#ffcdd2] text-[#c62828] text-xs font-bold py-1.5 px-3 rounded-lg border border-[#ef9a9a] flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Anular</span>
                  </button>
                </div>
              </div>

              {availableLotes.length === 0 ? (
                <div className="py-10 px-4 text-center bg-[#f9fbe7] rounded-xl border border-dashed border-[#cddc39]">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-[#afb42b] shadow-xs">
                    <Box className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#827717] mb-1">
                    Módulo sin lotes configurados en catálogo
                  </h3>
                  <p className="text-xs text-[#9e9d24] max-w-md mx-auto mb-4">
                    El módulo <strong>{modulo}</strong> de <strong>{fundo}</strong> no cuenta con lotes individuales en el catálogo. Puedes continuar directamente para registrar la programación a nivel de módulo completo.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <span>Continuar al Resumen sin Lotes</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {Object.keys(lotesByTurno)
                    .sort()
                    .map((turno) => (
                      <div key={turno} className="rounded-xl border border-[#e0e0e0] p-3 bg-[#fafafa]">
                        <div className="text-xs font-bold text-[#1b5e20] uppercase tracking-wider mb-2 pb-1 border-b border-[#e0e0e0] flex items-center justify-between">
                          <span>Turno {turno}</span>
                          <span className="text-[10px] text-gray-500 font-normal">
                            {lotesByTurno[turno].length} lotes
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {lotesByTurno[turno].map((l) => {
                            const key = `${l.turno}|${l.lote}`;
                            const isSelected = selectedLotes.has(key);
                            return (
                              <div
                                key={key}
                                onClick={() => toggleLote(key)}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none ${
                                  isSelected
                                    ? 'bg-[#e8f5e9] border-[#2e7d32] text-[#1b5e20] shadow-sm'
                                    : 'bg-white border-[#e0e0e0] text-gray-700 hover:border-[#a5d6a7]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-[#2e7d32] accent-[#2e7d32] pointer-events-none"
                                />
                                <span>{l.lote}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-[#e0e0e0] mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#40493d] py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="flex-2 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span>Continuar al Resumen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Resumen & Confirmación */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6 animate-in fade-in">
              <div className="flex items-center gap-2 pb-3 border-b border-[#f0f0f0] mb-4">
                <Sparkles className="w-5 h-5 text-[#2e7d32]" />
                <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                  Paso 3: Confirmación y Resumen de la Programación
                </h2>
              </div>

              {/* Key metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 bg-[#fcfdf9] p-4 rounded-xl border border-[#dcedc8]">
                <div>
                  <span className="block text-[11px] text-[#757575] font-medium">Fecha Programada</span>
                  <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">{fecha}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[#757575] font-medium">Fundo</span>
                  <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">{fundo}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[#757575] font-medium">Módulo</span>
                  <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">{modulo}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[#757575] font-medium">Cultivo</span>
                  <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">{tipo}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[#757575] font-medium">Ha Total</span>
                  <span className="font-bold text-xs sm:text-sm text-gray-800">{haTotal || '0'} ha</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[#757575] font-medium">Personal Programado</span>
                  <span className="font-bold text-xs sm:text-sm text-gray-800">{numTrabajadores || '0'} trab.</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[#757575] font-medium">Jabas Programadas</span>
                  <span className="font-bold text-xs sm:text-sm text-[#2e7d32]">{jabas || '0'} jabas</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[#757575] font-medium">Supervisor Asignado</span>
                  <span className="font-bold text-xs sm:text-sm text-[#1b5e20] truncate block" title={supervisorAsignado}>
                    {supervisorAsignado}
                  </span>
                </div>
              </div>

              {/* Big Lotes Badge */}
              <div className="bg-[#e8f5e9] border border-[#a5d6a7] rounded-xl p-4 text-center mb-5">
                <div className="text-3xl font-extrabold text-[#1b5e20]">
                  {selectedLotes.size > 0 ? selectedLotes.size : 'Módulo Completo'}
                </div>
                <div className="text-xs text-[#2e7d32] font-semibold uppercase tracking-wider mt-0.5">
                  {selectedLotes.size > 0 ? 'Lotes de Cosecha Programados' : 'Sin desglose de lotes (Nivel Módulo)'}
                </div>
              </div>

              {/* Selected Lotes List */}
              <h4 className="text-xs font-bold text-[#40493d] uppercase tracking-wider mb-2">
                Detalle de Lotes incluidos:
              </h4>
              {selectedLotes.size > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-[#e0e0e0] divide-y divide-[#f0f0f0] bg-white p-2 mb-6">
                  {Array.from(selectedLotes)
                    .sort()
                    .map((key: string) => {
                      const [turno, lote] = key.split('|');
                      return (
                        <div key={key} className="py-1.5 px-3 flex justify-between items-center text-xs">
                          <span className="text-[#5f6368] font-medium">Turno {turno}</span>
                          <span className="font-bold text-[#1b5e20]">{lote}</span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 mb-6 text-center italic">
                  Programación diaria registrada para todo el módulo {modulo} ({fundo}) sin asignación de lotes específicos.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#40493d] py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveFinal}
                  className="flex-2 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Save className="w-4 h-4" />
                  <span>💾 Guardar Programación Diaria</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: HISTORIAL Y LISTADO DE PROGRAMACIONES DIARIAS */}
      {/* ========================================================================= */}
      {activeSubTab === 'historial' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-[#e0e0e0] p-3.5 shadow-xs">
              <span className="text-[11px] text-gray-500 font-medium block">Programaciones</span>
              <span className="text-xl font-extrabold text-[#1b5e20]">{stats.count}</span>
            </div>
            <div className="bg-white rounded-xl border border-[#e0e0e0] p-3.5 shadow-xs">
              <span className="text-[11px] text-gray-500 font-medium block">Jabas Proyectadas</span>
              <span className="text-xl font-extrabold text-[#2e7d32]">{stats.totalJabas}</span>
            </div>
            <div className="bg-white rounded-xl border border-[#e0e0e0] p-3.5 shadow-xs">
              <span className="text-[11px] text-gray-500 font-medium block">Hectáreas Totales</span>
              <span className="text-xl font-extrabold text-gray-800">{stats.totalHa} ha</span>
            </div>
            <div className="bg-white rounded-xl border border-[#e0e0e0] p-3.5 shadow-xs">
              <span className="text-[11px] text-gray-500 font-medium block">Dotación de Personal</span>
              <span className="text-xl font-extrabold text-gray-800">{stats.totalTrab} trab.</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#f9fbe7] px-3 py-1.5 rounded-xl border border-[#dcedc8]">
                  <Calendar className="w-3.5 h-3.5 text-[#2e7d32]" />
                  <span className="text-xs font-bold text-[#1b5e20]">Fecha:</span>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setFiltroFecha(getLocalToday())}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    filtroFecha === getLocalToday()
                      ? 'bg-[#2e7d32] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Hoy
                </button>

                <button
                  type="button"
                  onClick={() => setFiltroFecha('')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    filtroFecha === ''
                      ? 'bg-[#2e7d32] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Ver Todas
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por fundo, módulo o lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#2e7d32]"
                />
              </div>
            </div>
          </div>

          {/* List of Programs */}
          {filteredHistorial.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e0e0e0] p-10 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#f1f8e9] text-[#2e7d32] flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">
                No hay programaciones diarias registradas
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                {filtroFecha
                  ? `No se encontraron registros para la fecha ${filtroFecha}. Puedes registrar una nueva programación.`
                  : 'Aún no se ha registrado ninguna programación diaria en el sistema.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (filtroFecha) setFecha(filtroFecha);
                  setActiveSubTab('wizard');
                  setStep(1);
                }}
                className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Programación Diaria</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistorial.map((item) => {
                const isExpanded = expandedCardId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#e0e0e0] p-4 sm:p-5 shadow-xs hover:border-[#a5d6a7] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0f0f0]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#e8f5e9] text-[#1b5e20] flex items-center justify-center font-bold text-xs">
                          {item.modulo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-[#1b5e20]">
                              {item.fundo} — Módulo {item.modulo}
                            </h3>
                            <span className="bg-[#f1f8e9] text-[#2e7d32] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#c8e6c9]">
                              {item.tipo || 'Suelo'}
                            </span>
                            {item.variedad && (
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                                {item.variedad}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#2e7d32]" />
                              {item.fecha}
                            </span>
                            <span>•</span>
                            <span>ID: <code className="font-bold text-gray-700">{item.id}</code></span>
                            {item.supervisor && (
                              <>
                                <span>•</span>
                                <span>Resp: <strong>{item.supervisor}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {onGoToEjecucion && (
                          <button
                            type="button"
                            onClick={() => onGoToEjecucion(item)}
                            className="bg-[#ff8f00] hover:bg-[#e65100] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                            title="Ir a registrar la ejecución de esta programación"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Ejecutar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar la programación diaria ${item.id} (${item.fundo} - ${item.modulo})?`)) {
                              onDeleteProgramacion(item.id);
                              onToast('🗑️ Programación diaria eliminada');
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-[#d32f2f] hover:bg-[#ffebee] rounded-lg transition-all cursor-pointer"
                          title="Eliminar programación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-1">
                      <div className="bg-[#fafafa] rounded-xl p-2.5 border border-[#eee]">
                        <span className="text-[10px] text-gray-500 block">Jabas Proyectadas</span>
                        <span className="text-sm font-bold text-[#2e7d32]">{item.jabas || 0}</span>
                      </div>
                      <div className="bg-[#fafafa] rounded-xl p-2.5 border border-[#eee]">
                        <span className="text-[10px] text-gray-500 block">Hectáreas</span>
                        <span className="text-sm font-bold text-gray-800">{item.haTotal || 0} ha</span>
                      </div>
                      <div className="bg-[#fafafa] rounded-xl p-2.5 border border-[#eee]">
                        <span className="text-[10px] text-gray-500 block">Personal</span>
                        <span className="text-sm font-bold text-gray-800">{item.numTrab || 0} trab.</span>
                      </div>
                      <div className="bg-[#fafafa] rounded-xl p-2.5 border border-[#eee]">
                        <span className="text-[10px] text-gray-500 block">Supervisor</span>
                        <span className="text-xs sm:text-sm font-bold text-[#1b5e20] truncate block" title={item.supervisor || 'Sin asignar'}>
                          {item.supervisor || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Observations if any */}
                    {item.observaciones && (
                      <div className="mt-2 text-xs text-gray-600 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                        <strong className="text-amber-800">Nota:</strong> {item.observaciones}
                      </div>
                    )}

                    {/* Toggle lotes detail */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                        className="text-xs text-[#2e7d32] hover:text-[#1b5e20] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Ocultar desglose de lotes</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>
                              Ver {item.lotes?.length || 0} lotes asignados
                            </span>
                          </>
                        )}
                      </button>

                      <span className="text-[11px] text-gray-400">
                        Registrado: {item.fechaRegistro ? item.fechaRegistro.slice(0, 16).replace('T', ' ') : '—'}
                      </span>
                    </div>

                    {/* Expanded Lotes Details */}
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-[#fcfdfa] rounded-xl border border-[#dcedc8] animate-in fade-in">
                        {item.lotes && item.lotes.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto">
                            {item.lotes.map((loteItem, idx) => (
                              <div
                                key={`${loteItem.turno}-${loteItem.lote}-${idx}`}
                                className="bg-white border border-[#c8e6c9] px-2 py-1 rounded-lg text-center"
                              >
                                <span className="text-[9px] text-gray-400 block">Turno {loteItem.turno}</span>
                                <span className="text-xs font-bold text-[#1b5e20]">{loteItem.lote}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic text-center py-2">
                            Programación sin desglose de lotes específicos (a nivel de módulo completo).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border border-white/20 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-[#e8f5e9] text-[#2e7d32] rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1b5e20] mb-1">¡Programación Diaria Guardada!</h3>
            <p className="text-xs text-[#5f6368] mb-4">
              La programación <strong className="text-[#1b5e20]">{lastSavedId}</strong> se ha guardado correctamente y está lista para ser ejecutada en campo.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveSubTab('historial');
                }}
                className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Ver en Historial de Programaciones
              </button>
              <button
                onClick={resetAll}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Crear Otra Programación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
