import React, { useState } from 'react';
import { Programa, SelectedLote, UserSession } from '../types';
import { 
  INITIAL_FUNDOS, 
  INITIAL_MODULOS_POR_FUNDO, 
  INITIAL_LOTES 
} from '../data/initialData';
import { getLocalToday, getLocalISO } from '../utils/storage';
import { 
  ClipboardList, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  CheckSquare, 
  Square, 
  Save, 
  Layers, 
  Calendar, 
  Box, 
  Sparkles 
} from 'lucide-react';

interface ProgramaWizardTabProps {
  session: UserSession;
  onSavePrograma: (programa: Programa) => void;
  onToast: (msg: string) => void;
}

export const ProgramaWizardTab: React.FC<ProgramaWizardTabProps> = ({
  session,
  onSavePrograma,
  onToast
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [fecha, setFecha] = useState(getLocalToday());
  const [fundo, setFundo] = useState('');
  const [modulo, setModulo] = useState('');
  const [haTotal, setHaTotal] = useState('');
  const [numTrabajadores, setNumTrabajadores] = useState('');
  const [tipo, setTipo] = useState<'Suelo' | 'Maceta'>('Suelo');
  const [jabas, setJabas] = useState('');
  const [ddc, setDdc] = useState('');

  // Lotes State
  const [selectedLotes, setSelectedLotes] = useState<Set<string>>(new Set());

  // Modal confirmation state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSavedId, setLastSavedId] = useState('');

  const availableModulos = fundo ? INITIAL_MODULOS_POR_FUNDO[fundo] || [] : [];
  
  // Available lotes for chosen Fundo & Modulo
  const availableLotes = INITIAL_LOTES.filter(
    (l) => l.fundo === fundo && l.modulo === modulo
  );

  // Group lotes by Turno
  const lotesByTurno: Record<string, typeof availableLotes> = {};
  availableLotes.forEach((l) => {
    if (!lotesByTurno[l.turno]) lotesByTurno[l.turno] = [];
    lotesByTurno[l.turno].push(l);
  });

  const handleFundoChange = (newFundo: string) => {
    setFundo(newFundo);
    setModulo('');
    setSelectedLotes(new Set());
  };

  const handleModuloChange = (newModulo: string) => {
    setModulo(newModulo);
    setSelectedLotes(new Set());
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundo || !modulo) {
      onToast('⚠️ Selecciona fundo y módulo');
      return;
    }
    setStep(2);
  };

  const toggleLote = (key: string) => {
    const next = new Set(selectedLotes);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedLotes(next);
  };

  const selectAllLotes = () => {
    const next = new Set<string>();
    availableLotes.forEach((l) => next.add(`${l.turno}|${l.lote}`));
    setSelectedLotes(next);
    onToast(`✅ ${availableLotes.length} lotes seleccionados`);
  };

  const clearAllLotes = () => {
    setSelectedLotes(new Set());
    onToast('✕ Selección de lotes anulada');
  };

  const handleStep2Next = () => {
    if (selectedLotes.size === 0) {
      onToast('⚠️ Selecciona al menos un lote para continuar');
      return;
    }
    setStep(3);
  };

  const handleSaveFinal = () => {
    const lotesArr: SelectedLote[] = [];
    selectedLotes.forEach((key) => {
      const [turno, lote] = key.split('|');
      lotesArr.push({ turno, lote });
    });

    lotesArr.sort((a, b) => a.turno.localeCompare(b.turno) || a.lote.localeCompare(b.lote));

    const progId = `PROG_${Date.now().toString(36).toUpperCase()}`;
    const newPrograma: Programa = {
      id: progId,
      fecha,
      fundo,
      modulo,
      haTotal: haTotal || '0',
      numTrab: numTrabajadores || '0',
      tipo,
      jabas: parseInt(jabas) || 0,
      ddc: parseFloat(ddc) || 0,
      lotes: lotesArr,
      totalLotes: lotesArr.length,
      fechaRegistro: getLocalISO(),
      supervisor: session.nombre
    };

    onSavePrograma(newPrograma);
    setLastSavedId(progId);
    setShowSuccessModal(true);
    onToast(`✅ Programa ${progId} guardado exitosamente`);
  };

  const resetAll = () => {
    setShowSuccessModal(false);
    setStep(1);
    setFecha(getLocalToday());
    setFundo('');
    setModulo('');
    setHaTotal('');
    setNumTrabajadores('');
    setTipo('Suelo');
    setJabas('');
    setDdc('');
    setSelectedLotes(new Set());
  };

  return (
    <div className="space-y-4">
      {/* 3-Step Wizard Indicator */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 flex items-center justify-between">
        <div
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
          <span className="text-xs uppercase tracking-tight hidden sm:inline">1. Ejecución</span>
        </div>

        <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step >= 2 ? 'bg-[#2e7d32]' : 'bg-gray-200'}`} />

        <div
          onClick={() => {
            if (fundo && modulo) setStep(2);
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
          <span className="text-xs uppercase tracking-tight hidden sm:inline">2. Lotes</span>
        </div>

        <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step === 3 ? 'bg-[#2e7d32]' : 'bg-gray-200'}`} />

        <div
          onClick={() => {
            if (selectedLotes.size > 0) setStep(3);
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
          <span className="text-xs uppercase tracking-tight hidden sm:inline">3. Resumen</span>
        </div>
      </div>

      {/* STEP 1: Main Programa Form */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6 animate-in fade-in">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f0f0f0] mb-5">
            <ClipboardList className="w-5 h-5 text-[#2e7d32]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
              Paso 1: Parámetros de la Ejecución
            </h2>
          </div>

          <form onSubmit={handleStep1Next} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#40493d] mb-1">
                Fecha de Ejecución *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
              />
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
                  Cantidad de Trabajadores
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Jabas Ejecutadas
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

              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Días de Cosecha (DDC)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={ddc}
                  onChange={(e) => setDdc(e.target.value)}
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

      {/* STEP 2: Selection of Lotes */}
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
            <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-sm">No hay lotes catalogados para este Fundo y Módulo.</p>
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

      {/* STEP 3: Resumen Programa & Save */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6 animate-in fade-in">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f0f0f0] mb-4">
            <Sparkles className="w-5 h-5 text-[#ff8f00]" />
            <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
              Paso 3: Confirmación y Resumen de la Ejecución
            </h2>
          </div>

          {/* Key metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 bg-[#fcf9f8] p-4 rounded-xl border border-[#e0e0e0]">
            <div>
              <span className="block text-[11px] text-[#757575] font-medium">Fecha</span>
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
              <span className="block text-[11px] text-[#757575] font-medium">Tipo</span>
              <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">{tipo}</span>
            </div>
            <div>
              <span className="block text-[11px] text-[#757575] font-medium">Ha Total</span>
              <span className="font-bold text-xs sm:text-sm text-gray-800">{haTotal || '0'} ha</span>
            </div>
            <div>
              <span className="block text-[11px] text-[#757575] font-medium">Personal</span>
              <span className="font-bold text-xs sm:text-sm text-gray-800">{numTrabajadores || '0'}</span>
            </div>
            <div>
              <span className="block text-[11px] text-[#757575] font-medium">Jabas Ejecutadas</span>
              <span className="font-bold text-xs sm:text-sm text-[#ff8f00]">{jabas || '0'}</span>
            </div>
            <div>
              <span className="block text-[11px] text-[#757575] font-medium">DDC</span>
              <span className="font-bold text-xs sm:text-sm text-gray-800">{ddc || '0'}</span>
            </div>
          </div>

          {/* Big Lotes Badge */}
          <div className="bg-[#e8f5e9] border border-[#a5d6a7] rounded-xl p-4 text-center mb-5">
            <div className="text-3xl font-extrabold text-[#1b5e20]">{selectedLotes.size}</div>
            <div className="text-xs text-[#2e7d32] font-semibold uppercase tracking-wider mt-0.5">
              Lotes de Cosecha Seleccionados
            </div>
          </div>

          {/* Selected Lotes List */}
          <h4 className="text-xs font-bold text-[#40493d] uppercase tracking-wider mb-2">
            Detalle de Lotes incluidos:
          </h4>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-[#e0e0e0] divide-y divide-[#f0f0f0] bg-white p-2 mb-6">
            {Array.from<string>(selectedLotes)
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
              className="flex-2 bg-[#ff8f00] hover:bg-[#e65100] text-white py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Save className="w-4 h-4" />
              <span>💾 Guardar Ejecución</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border border-white/20 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-[#e8f5e9] text-[#2e7d32] rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1b5e20] mb-1">¡Ejecución Guardada!</h3>
            <p className="text-xs text-[#5f6368] mb-4">
              La ejecución <strong className="text-[#1b5e20]">{lastSavedId}</strong> se ha registrado con éxito en el sistema local y en cola de sincronización.
            </p>
            <button
              onClick={resetAll}
              className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Crear Nueva Ejecución
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
