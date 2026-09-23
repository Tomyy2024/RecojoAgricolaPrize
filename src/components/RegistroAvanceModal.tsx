import React, { useState, useMemo } from 'react';
import { 
  X, Trash2, Search, Filter, RefreshCw, Download, 
  AlertTriangle, Check, Layers, User, Calendar, 
  CheckSquare, Square, FileSpreadsheet, ShieldAlert,
  UploadCloud, Loader2
} from 'lucide-react';
import { DetalleJaba, UserRole } from '../types';
import { 
  deleteDetalleJabaFromStorage, 
  deleteDetalleJabasFromStorage, 
  saveDetalleJabas, 
  getGsheetUrl, 
  replicarAvanceAlSheet,
  sanitizeAndDeduplicateDetalleJabas,
  normalizeModulo
} from '../utils/storage';

interface RegistroAvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  detalleJabas: DetalleJaba[];
  userRole?: UserRole;
  onRecordsUpdated: (updatedList: DetalleJaba[]) => void;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const RegistroAvanceModal: React.FC<RegistroAvanceModalProps> = ({
  isOpen,
  onClose,
  detalleJabas,
  userRole,
  onRecordsUpdated,
  onNotify
}) => {
  const isAdmin = userRole === 'Administrador';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFecha, setFilterFecha] = useState<string>('todas');
  const [filterModulo, setFilterModulo] = useState<string>('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDepurando, setIsDepurando] = useState(false);
  const [isUploadingSheet, setIsUploadingSheet] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Registros deduplicados y sanitizados como única fuente de verdad
  const cleanDetalleJabas = useMemo(() => {
    return sanitizeAndDeduplicateDetalleJabas(detalleJabas || []);
  }, [detalleJabas]);

  // Available dates
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    cleanDetalleJabas.forEach(d => {
      if (d.fecha) dates.add(d.fecha);
    });
    return Array.from(dates).sort().reverse();
  }, [cleanDetalleJabas]);

  // Available modulos
  const availableModulos = useMemo(() => {
    const mods = new Set<string>();
    cleanDetalleJabas.forEach(d => {
      if (d.modulo) mods.add(normalizeModulo(d.modulo));
    });
    return Array.from(mods).sort();
  }, [cleanDetalleJabas]);

  // Filtered records (sin duplicados)
  const filteredRecords = useMemo(() => {
    return cleanDetalleJabas.filter(item => {
      // Date filter
      if (filterFecha !== 'todas' && item.fecha !== filterFecha) {
        return false;
      }
      // Modulo filter
      if (filterModulo !== 'todos' && normalizeModulo(item.modulo) !== normalizeModulo(filterModulo)) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const dni = String(item.dni || '').toLowerCase();
        const trab = String(item.trabajador || '').toLowerCase();
        const sup = String(item.supervisor || '').toLowerCase();
        const lid = String(item.lider || '').toLowerCase();
        const grp = String(item.grupo || '').toLowerCase();
        if (!dni.includes(q) && !trab.includes(q) && !sup.includes(q) && !lid.includes(q) && !grp.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [cleanDetalleJabas, filterFecha, filterModulo, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const totalJabas = filteredRecords.reduce((acc, r) => acc + (Number(r.jabas) || 0), 0);
    const uniqueDnis = new Set(filteredRecords.map(r => r.dni || r.trabajador)).size;
    return {
      count: filteredRecords.length,
      totalJabas,
      uniqueWorkers: uniqueDnis
    };
  }, [filteredRecords]);

  if (!isOpen) return null;

  // Toggle selection for bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  // Perform single deletion
  const handleDeleteSingle = async (id: string) => {
    if (!isAdmin) return;
    setIsDeleting(true);
    try {
      const sheetUrl = getGsheetUrl();
      // Call server deletion endpoint
      const res = await fetch('/api/eliminar-registro-avance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          userRole,
          url: sheetUrl
        })
      });

      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        const updatedLocal = deleteDetalleJabaFromStorage(id);
        onRecordsUpdated(json.detalleJabas || updatedLocal);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setConfirmDeleteId(null);
        if (onNotify) onNotify('Registro eliminado de la base central y Google Sheets con éxito.', 'success');
      } else {
        // Fallback local deletion
        const updatedLocal = deleteDetalleJabaFromStorage(id);
        onRecordsUpdated(updatedLocal);
        setConfirmDeleteId(null);
        if (onNotify) onNotify(json.message || 'Registro eliminado localmente.', 'info');
      }
    } catch (err: any) {
      // Local fallback
      const updatedLocal = deleteDetalleJabaFromStorage(id);
      onRecordsUpdated(updatedLocal);
      setConfirmDeleteId(null);
      if (onNotify) onNotify('Registro eliminado de la base local.', 'info');
    } finally {
      setIsDeleting(false);
    }
  };

  // Perform bulk deletion
  const handleBulkDelete = async () => {
    if (!isAdmin || selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const idsArray: string[] = Array.from(selectedIds);
      const sheetUrl = getGsheetUrl();
      const res = await fetch('/api/eliminar-registro-avance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: idsArray,
          userRole,
          url: sheetUrl
        })
      });

      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        const updatedLocal = deleteDetalleJabasFromStorage(idsArray);
        onRecordsUpdated(json.detalleJabas || updatedLocal);
        setSelectedIds(new Set());
        setShowBulkConfirm(false);
        if (onNotify) onNotify(`Se eliminaron ${idsArray.length} registros exitosamente.`, 'success');
      } else {
        const updatedLocal = deleteDetalleJabasFromStorage(idsArray);
        onRecordsUpdated(updatedLocal);
        setSelectedIds(new Set());
        setShowBulkConfirm(false);
        if (onNotify) onNotify(json.message || `Se eliminaron ${idsArray.length} registros localmente.`, 'info');
      }
    } catch (err: any) {
      const idsArray: string[] = Array.from(selectedIds);
      const updatedLocal = deleteDetalleJabasFromStorage(idsArray);
      onRecordsUpdated(updatedLocal);
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      if (onNotify) onNotify(`Se eliminaron ${idsArray.length} registros localmente.`, 'info');
    } finally {
      setIsDeleting(false);
    }
  };

  // Perform deep clean / deduplication
  const handleDepurarTodo = async () => {
    if (!isAdmin) return;
    setIsDepurando(true);
    try {
      const sheetUrl = getGsheetUrl();
      const res = await fetch('/api/depurar-registro-avance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRole,
          url: sheetUrl
        })
      });

      const json = await res.json();
      if (res.ok && json.status === 'ok') {
        saveDetalleJabas(json.detalleJabas);
        onRecordsUpdated(json.detalleJabas);
        setSelectedIds(new Set());
        if (onNotify) onNotify(json.message, 'success');
      } else {
        if (onNotify) onNotify('Error al depurar registros.', 'error');
      }
    } catch (err: any) {
      if (onNotify) onNotify('Error de conexión al depurar.', 'error');
    } finally {
      setIsDepurando(false);
    }
  };

  // Replicar registros de avance directo a Google Sheets
  const handleSubirSheet = async () => {
    if (detalleJabas.length === 0) {
      if (onNotify) onNotify('No hay registros de avance para sincronizar.', 'warning');
      return;
    }
    setIsUploadingSheet(true);
    try {
      const res = await replicarAvanceAlSheet(detalleJabas);
      if (res.sheetOk) {
        if (onNotify) onNotify(`✅ Sincronización exitosa: ${detalleJabas.length} registros y ${res.countJabas} jabas actualizados en Google Sheets ('Registro_Avance').`, 'success');
      } else {
        if (onNotify) onNotify(`⚠️ Registros listos en sistema. Aviso Google Sheet: ${res.error || 'Verificar conexión'}`, 'warning');
      }
    } catch (err: any) {
      if (onNotify) onNotify(`Error al conectar con Google Sheets: ${err?.message || err}`, 'error');
    } finally {
      setIsUploadingSheet(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Hora_Registro', 'Supervisor', 'Fundo', 'Modulo', 'Grupo', 'Lider', 'DNI', 'Trabajador', 'Jabas'];
    const rows = filteredRecords.map(r => [
      `"${r.id || ''}"`,
      `"${r.fecha || ''}"`,
      `"${r.timestamp || ''}"`,
      `"${(r.supervisor || '').replace(/"/g, '""')}"`,
      `"${(r.fundo || '').replace(/"/g, '""')}"`,
      `"${r.modulo || ''}"`,
      `"${(r.grupo || '').replace(/"/g, '""')}"`,
      `"${(r.lider || '').replace(/"/g, '""')}"`,
      `"${r.dni || ''}"`,
      `"${(r.trabajador || '').replace(/"/g, '""')}"`,
      r.jabas || 0
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Registro_Avance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="modal-registro-avance" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Hoja de Datos: Registro de Avance
                {isAdmin && (
                  <span className="text-xs bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded-full">
                    Control Administrador
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Sincronización bidireccional con la hoja <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded font-mono">Registro_Avance</code> de Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 bg-white border-b border-slate-100 text-sm">
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
            <span className="text-xs text-slate-500 block">Registros Válidos</span>
            <span className="text-lg font-bold text-slate-800">{stats.count}</span>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200/80">
            <span className="text-xs text-emerald-600 block">Total Jabas Cosechadas</span>
            <span className="text-lg font-bold text-emerald-800">{stats.totalJabas.toLocaleString()}</span>
          </div>
          <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200/80">
            <span className="text-xs text-blue-600 block">Cosecheros Únicos</span>
            <span className="text-lg font-bold text-blue-800">{stats.uniqueWorkers}</span>
          </div>
          <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-200/80">
            <span className="text-xs text-purple-600 block">Promedio Jabas/Cosechero</span>
            <span className="text-lg font-bold text-purple-800">
              {stats.uniqueWorkers > 0 ? (stats.totalJabas / stats.uniqueWorkers).toFixed(1) : '0'}
            </span>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por DNI, trabajador, supervisor..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Fecha Filter */}
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterFecha}
                onChange={e => setFilterFecha(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todas">Todas las fechas</option>
                {availableDates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Modulo Filter */}
            <div className="flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterModulo}
                onChange={e => setFilterModulo(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="todos">Todos los módulos</option>
                {availableModulos.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Admin Operations Buttons */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                {/* Depurar Duplicados */}
                <button
                  onClick={handleDepurarTodo}
                  disabled={isDepurando || detalleJabas.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
                  title="Elimina automáticamente duplicados y registros vacíos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDepurando ? 'animate-spin' : ''}`} />
                  {isDepurando ? 'Depurando...' : '🧹 Depurar Duplicados'}
                </button>

                {/* Bulk Delete */}
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowBulkConfirm(true)}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Seleccionados ({selectedIds.size})
                  </button>
                )}
              </>
            )}

            {/* Sincronizar directo con Google Sheets */}
            <button
              onClick={handleSubirSheet}
              disabled={isUploadingSheet || detalleJabas.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
              title="Sube y actualiza todos los registros de avance directo a Google Sheets ('Registro_Avance')"
            >
              {isUploadingSheet ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Subiendo al Sheet...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>☁️ Subir a Google Sheets</span>
                </>
              )}
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium text-xs transition-colors"
              title="Descargar en formato CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
          </div>
        </div>

        {/* Bulk Confirmation Modal Dialog */}
        {showBulkConfirm && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between animate-fade-in text-xs text-rose-900">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">¿Confirmas la eliminación de {selectedIds.size} registros de Registro_Avance?</p>
                <p className="text-rose-700">Esta acción borrará permanentemente estos registros de la base del sistema y de Google Sheets.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 rounded-lg hover:bg-rose-100 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold flex items-center gap-1 shadow-sm"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Sí, Eliminar Permanentemente
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Single Record Deletion */}
        {confirmDeleteId && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between animate-fade-in text-xs text-amber-900">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">¿Eliminar este registro de avance?</p>
                <p className="text-amber-700">
                  ID: <span className="font-mono">{confirmDeleteId}</span> — Se borrará de la memoria del servidor, Firestore y Google Sheets.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-100 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteSingle(confirmDeleteId)}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold flex items-center gap-1 shadow-sm"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Eliminar Registro
              </button>
            </div>
          </div>
        )}

        {/* Table View */}
        <div className="flex-1 overflow-auto bg-white">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-slate-600 text-sm">No se encontraron registros de avance</p>
              <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros de fecha, módulo o el término de búsqueda.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                <tr>
                  {isAdmin && (
                    <th className="p-3 w-10 text-center">
                      <button
                        onClick={selectAllFiltered}
                        className="text-slate-600 hover:text-slate-900 focus:outline-none"
                        title={selectedIds.size === filteredRecords.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      >
                        {selectedIds.size > 0 && selectedIds.size === filteredRecords.length ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : selectedIds.size > 0 ? (
                          <div className="w-4 h-4 border-2 border-emerald-600 bg-emerald-100 rounded flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-600 rounded-sm" />
                          </div>
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="p-3 font-semibold">Fecha</th>
                  <th className="p-3 font-semibold">DNI</th>
                  <th className="p-3 font-semibold min-w-[180px]">Trabajador</th>
                  <th className="p-3 font-semibold text-center">Módulo</th>
                  <th className="p-3 font-semibold">Grupo</th>
                  <th className="p-3 font-semibold">Líder</th>
                  <th className="p-3 font-semibold">Supervisor</th>
                  <th className="p-3 font-semibold text-right">Jabas</th>
                  {isAdmin && (
                    <th className="p-3 font-semibold text-center w-16">Acción</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((item, idx) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id || idx}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}
                    >
                      {isAdmin && (
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className="focus:outline-none"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="p-3 text-slate-600 font-mono whitespace-nowrap">
                        {item.fecha || '-'}
                      </td>
                      <td className="p-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                        {item.dni || '-'}
                      </td>
                      <td className="p-3 text-slate-800 font-medium whitespace-nowrap">
                        {item.trabajador || '-'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                          {item.modulo || 'M01'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {item.grupo || '-'}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {item.lider || '-'}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {item.supervisor || '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap text-sm">
                        {Number(item.jabas) || 0}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar este registro de avance"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Mostrando <span className="font-semibold text-slate-700">{filteredRecords.length}</span> de <span className="font-semibold text-slate-700">{detalleJabas.length}</span> registros totales en la base de datos
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors shadow-sm"
          >
            Cerrar Vista
          </button>
        </div>

      </div>
    </div>
  );
};
