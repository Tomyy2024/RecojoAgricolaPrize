import React, { useState } from 'react';
import { ProgramaGeneral, UserSession } from '../types';
import { INITIAL_FUNDOS, INITIAL_MODULOS_POR_FUNDO } from '../data/initialData';
import { 
  Sprout, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  Calendar, 
  Layers, 
  Users, 
  Search 
} from 'lucide-react';

interface ProgramaGeneralTabProps {
  session: UserSession;
  programasGenerales: ProgramaGeneral[];
  onSave: (list: ProgramaGeneral[]) => void;
  onToast: (msg: string) => void;
}

export const ProgramaGeneralTab: React.FC<ProgramaGeneralTabProps> = ({
  session,
  programasGenerales,
  onSave,
  onToast
}) => {
  const isReadOnly = session.rol === 'Trabajador';
  
  // Form State
  const [fundo, setFundo] = useState('');
  const [modulo, setModulo] = useState('');
  const [haTotal, setHaTotal] = useState('');
  const [numTrabajadores, setNumTrabajadores] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Available modulos based on selected fundo
  const availableModulos = fundo ? INITIAL_MODULOS_POR_FUNDO[fundo] || [] : [];

  const handleFundoChange = (newFundo: string) => {
    setFundo(newFundo);
    setModulo('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundo || !modulo) {
      onToast('⚠️ Selecciona fundo y módulo');
      return;
    }
    if (!haTotal) {
      onToast('⚠️ Ingresa las hectáreas totales');
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      // Update
      const updated = programasGenerales.map((pg) => {
        if (pg.id === editingId) {
          return {
            ...pg,
            fundo,
            modulo,
            haTotal,
            numTrabajadores: numTrabajadores || '0',
            observaciones,
            updatedAt: now,
            supervisor: session.nombre
          };
        }
        return pg;
      });
      onSave(updated);
      onToast(`✅ Programa General actualizado (${fundo} - ${modulo})`);
    } else {
      // Create
      const newEntry: ProgramaGeneral = {
        id: `PG_${Date.now()}`,
        fundo,
        modulo,
        haTotal,
        numTrabajadores: numTrabajadores || '0',
        observaciones,
        fechaRegistro: now,
        createdAt: now,
        updatedAt: now,
        supervisor: session.nombre
      };
      onSave([newEntry, ...programasGenerales]);
      onToast(`✅ Programa General registrado (${fundo} - ${modulo})`);
    }

    resetForm();
  };

  const handleEdit = (item: ProgramaGeneral) => {
    setEditingId(item.id);
    setFundo(item.fundo);
    setModulo(item.modulo);
    setHaTotal(item.haTotal);
    setNumTrabajadores(item.numTrabajadores);
    setObservaciones(item.observaciones);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro del Programa General?')) return;
    const filtered = programasGenerales.filter((pg) => pg.id !== id);
    onSave(filtered);
    onToast('🗑️ Registro eliminado correctamente');
    if (editingId === id) resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFundo('');
    setModulo('');
    setHaTotal('');
    setNumTrabajadores('');
    setObservaciones('');
  };

  // Filtered list
  const filteredList = programasGenerales.filter((pg) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      pg.fundo.toLowerCase().includes(term) ||
      pg.modulo.toLowerCase().includes(term) ||
      pg.observaciones.toLowerCase().includes(term) ||
      (pg.supervisor && pg.supervisor.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#2e7d32]">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1b5e20] leading-tight">
                Programa General de Campo
              </h2>
              <p className="text-xs text-[#757575]">
                Planificación maestra: fundos, módulos, hectáreas y dotación
              </p>
            </div>
          </div>
          <span className="bg-[#e8f5e9] text-[#1b5e20] text-xs font-bold px-2.5 py-1 rounded-full border border-[#a5d6a7]">
            {programasGenerales.length} Registros
          </span>
        </div>

        {/* Form section (Hidden for Trabajador role) */}
        {!isReadOnly && (
          <form
            onSubmit={handleSave}
            className={`p-4 rounded-xl mb-6 border transition-all ${
              editingId
                ? 'bg-[#fff8e1] border-[#ffb300]/50 shadow-sm'
                : 'bg-[#f9fbe7]/60 border-[#dcedc8]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-[#1b5e20] flex items-center gap-1.5">
                {editingId ? (
                  <>
                    <Pencil className="w-4 h-4 text-[#ff8f00]" />
                    <span>Editando Programa General</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-[#2e7d32]" />
                    <span>Nuevo Programa General</span>
                  </>
                )}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-[#d32f2f] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Fundo *
                </label>
                <select
                  value={fundo}
                  onChange={(e) => handleFundoChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
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
                  onChange={(e) => setModulo(e.target.value)}
                  disabled={!fundo}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32] disabled:bg-gray-100 disabled:text-gray-400"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Ha Total *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Ej: 14.5"
                  value={haTotal}
                  onChange={(e) => setHaTotal(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Cantidad de Trabajadores
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ej: 25"
                  value={numTrabajadores}
                  onChange={(e) => setNumTrabajadores(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-[#40493d] mb-1">
                Observaciones
              </label>
              <textarea
                rows={2}
                placeholder="Notas técnicas, condición de cultivo o comentarios..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Actualizar Programa General' : 'Guardar Programa General'}</span>
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl border border-[#bfcaba] text-xs font-semibold text-[#5f6368] hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {/* Search & Counter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por fundo, módulo u observación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#bfcaba] rounded-lg focus:outline-none focus:border-[#2e7d32]"
            />
          </div>
          <span className="text-xs text-[#757575] font-medium self-end sm:self-center">
            Mostrando {filteredList.length} de {programasGenerales.length}
          </span>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto rounded-xl border border-[#e0e0e0]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#2e7d32] text-white font-semibold">
                <th className="py-2.5 px-3">Fundo</th>
                <th className="py-2.5 px-3">Módulo</th>
                <th className="py-2.5 px-3 text-right">Ha_Total</th>
                <th className="py-2.5 px-3 text-right">Personal</th>
                <th className="py-2.5 px-3">Observaciones</th>
                <th className="py-2.5 px-3">Fecha</th>
                {!isReadOnly && <th className="py-2.5 px-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 6 : 7} className="py-8 text-center text-gray-400">
                    No se encontraron registros de Programa General.
                  </td>
                </tr>
              ) : (
                filteredList.map((pg, idx) => (
                  <tr
                    key={pg.id}
                    className={`hover:bg-[#f1f8e9] transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#fcfdf9]'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-[#1b5e20]">{pg.fundo}</td>
                    <td className="py-2.5 px-3 font-bold">{pg.modulo}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{pg.haTotal} ha</td>
                    <td className="py-2.5 px-3 text-right font-medium">{pg.numTrabajadores} trab.</td>
                    <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate" title={pg.observaciones}>
                      {pg.observaciones || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                      {pg.fechaRegistro ? pg.fechaRegistro.slice(0, 10) : '—'}
                    </td>
                    {!isReadOnly && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(pg)}
                            className="p-1 text-[#2e7d32] hover:bg-[#e8f5e9] rounded transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(pg.id)}
                            className="p-1 text-[#d32f2f] hover:bg-[#ffebee] rounded transition-all cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
