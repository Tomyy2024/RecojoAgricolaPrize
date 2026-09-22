import React, { useState, useMemo } from 'react';
import { ProgramaGeneral, UserSession } from '../types';
import { INITIAL_FUNDOS, INITIAL_MODULOS_POR_FUNDO } from '../data/initialData';
import { getLocalToday, normalizeDateString, formatDateDDMMAAAA } from '../utils/storage';
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
  Search,
  Filter
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
  const [fecha, setFecha] = useState(getLocalToday());
  const [fundo, setFundo] = useState('');
  const [modulo, setModulo] = useState('');
  const [haTotal, setHaTotal] = useState('');
  const [numTrabajadores, setNumTrabajadores] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  // Fechas disponibles en programas generales
  const fechasDisponibles = useMemo(() => {
    const map = new Map<string, number>();
    programasGenerales.forEach((pg) => {
      const d = normalizeDateString(pg.fecha || pg.fechaRegistro || pg.createdAt || '');
      if (d) {
        map.set(d, (map.get(d) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([f, count]) => ({ fecha: f, fechaFormateada: formatDateDDMMAAAA(f), count }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [programasGenerales]);

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
            fecha: fecha || getLocalToday(),
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
      onToast(`✅ Programa Semanal actualizado (${fundo} - ${modulo})`);
    } else {
      // Create
      const newEntry: ProgramaGeneral = {
        id: `PG_${Date.now()}`,
        fecha: fecha || getLocalToday(),
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
      onToast(`✅ Programa Semanal registrado (${fundo} - ${modulo})`);
    }

    resetForm();
  };

  const handleEdit = (item: ProgramaGeneral) => {
    setEditingId(item.id);
    setFecha(item.fecha || (item.fechaRegistro ? item.fechaRegistro.slice(0, 10) : getLocalToday()));
    setFundo(item.fundo);
    setModulo(item.modulo);
    setHaTotal(item.haTotal);
    setNumTrabajadores(item.numTrabajadores);
    setObservaciones(item.observaciones);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro del Programa Semanal?')) return;
    const filtered = programasGenerales.filter((pg) => pg.id !== id);
    onSave(filtered);
    onToast('🗑️ Registro eliminado correctamente');
    if (editingId === id) resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFecha(getLocalToday());
    setFundo('');
    setModulo('');
    setHaTotal('');
    setNumTrabajadores('');
    setObservaciones('');
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return programasGenerales.filter((pg) => {
      if (filtroFecha) {
        const pgDate = normalizeDateString(pg.fecha || pg.fechaRegistro || pg.createdAt || '');
        if (pgDate !== normalizeDateString(filtroFecha)) return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        pg.fundo.toLowerCase().includes(term) ||
        pg.modulo.toLowerCase().includes(term) ||
        pg.observaciones.toLowerCase().includes(term) ||
        (pg.supervisor && pg.supervisor.toLowerCase().includes(term))
      );
    });
  }, [programasGenerales, filtroFecha, searchTerm]);

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
                Programa Semanal de Campo
              </h2>
              <p className="text-xs text-[#757575]">
                Planificación semanal maestra: fundos, módulos, hectáreas y dotación
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
                    <span>Editando Programa Semanal</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-[#2e7d32]" />
                    <span>Nuevo Programa Semanal</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-[#40493d] mb-1">
                  Fecha del Programa *
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#bfcaba] bg-white">
                  <Calendar className="w-4 h-4 text-[#2e7d32] shrink-0" />
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm bg-transparent font-medium text-gray-800 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

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
                <span>{editingId ? 'Actualizar Programa Semanal' : 'Guardar Programa Semanal'}</span>
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

        {/* Search & Date Filter Bar */}
        <div className="bg-[#fafafa] p-3 rounded-xl border border-[#e0e0e0] mb-3 space-y-2.5">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2.5">
            {/* Buscador de texto */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por fundo, módulo u observación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#bfcaba] rounded-lg focus:outline-none focus:border-[#2e7d32]"
              />
            </div>

            {/* Filtro de Fecha */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#bfcaba] shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-[#2e7d32] shrink-0" />
                <span className="text-[11px] font-bold text-gray-600">Filtrar Fecha:</span>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                />
              </div>

              {fechasDisponibles.length > 0 && (
                <select
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="text-xs bg-white px-2 py-1.5 rounded-lg border border-[#bfcaba] font-medium text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="">Fechas disponibles ({fechasDisponibles.length})</option>
                  {fechasDisponibles.map((f) => (
                    <option key={f.fecha} value={f.fecha}>
                      {f.fechaFormateada} ({f.count} reg.)
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setFiltroFecha(getLocalToday())}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filtroFecha === getLocalToday()
                    ? 'bg-[#2e7d32] text-white shadow-xs'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-[#bfcaba]'
                }`}
              >
                Hoy
              </button>

              {filtroFecha && (
                <button
                  type="button"
                  onClick={() => setFiltroFecha('')}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Ver Todas</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#757575] pt-1 border-t border-gray-200">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#2e7d32]" />
              {filtroFecha ? (
                <span>
                  Filtrando por fecha: <strong className="text-[#1b5e20]">{formatDateDDMMAAAA(filtroFecha)}</strong>
                </span>
              ) : (
                <span>Mostrando todas las fechas</span>
              )}
            </div>
            <span className="font-semibold text-gray-700">
              Mostrando {filteredList.length} de {programasGenerales.length} registros
            </span>
          </div>
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
                    No se encontraron registros de Programa Semanal.
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
                      {pg.fecha ? formatDateDDMMAAAA(pg.fecha) : (pg.fechaRegistro ? formatDateDDMMAAAA(pg.fechaRegistro.slice(0, 10)) : '—')}
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
