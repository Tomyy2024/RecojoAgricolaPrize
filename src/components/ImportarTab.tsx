import React, { useState, useMemo } from 'react';
import { Trabajador, UserSession } from '../types';
import { FileUp, FileText, Check, X, UploadCloud, AlertTriangle, Eye, ShieldCheck, Lock, Trash2, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { getLocalToday, normalizeDateString } from '../utils/storage';

interface ImportarTabProps {
  session?: UserSession | null;
  trabajadores: Trabajador[];
  onImportTrabajadores: (nuevos: Trabajador[], replaceExisting?: boolean) => void;
  onToast: (msg: string) => void;
  offlineNomina?: boolean;
  onToggleOfflineNomina?: (val?: boolean) => void;
  onDepurarTrabajadoresAyer?: () => void;
  onNavigateToGruposLideres?: () => void;
}

export const ImportarTab: React.FC<ImportarTabProps> = ({
  session,
  trabajadores,
  onImportTrabajadores,
  onToast,
  offlineNomina = true,
  onToggleOfflineNomina,
  onDepurarTrabajadoresAyer,
  onNavigateToGruposLideres
}) => {
  const isAdmin = session?.rol === 'Administrador';
  const hoyStr = getLocalToday();

  // Conteo de trabajadores del día anterior
  const countTrabajadoresAyer = useMemo(() => {
    return trabajadores.filter((t) => {
      if (!t.fecha) return false;
      const fNorm = normalizeDateString(t.fecha);
      return fNorm && fNorm < hoyStr;
    }).length;
  }, [trabajadores, hoyStr]);

  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [replaceMode, setReplaceMode] = useState<boolean>(true);
  const [pasteText, setPasteText] = useState('');
  const [parsedData, setParsedData] = useState<Omit<Trabajador, 'id' | 'fecha'>[] | null>(null);

  const parseCsvText = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      onToast('⚠️ El contenido está vacío');
      return;
    }

    // Check if first row is header
    const firstRow = lines[0].toLowerCase();
    const hasHeader = firstRow.includes('dni') || firstRow.includes('nombre');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const list: Omit<Trabajador, 'id' | 'fecha'>[] = [];

    dataLines.forEach((line) => {
      // Split by comma or semicolon or tab
      const separator = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      const cols = line.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ''));

      if (cols.length >= 2) {
        const dni = cols[0] ? cols[0].replace(/\D/g, '') : '';
        const nombres = cols[1] ? cols[1].toUpperCase() : '';
        const fundo = cols[2] || 'Arena Azul';
        const modulo = cols[3] || 'M01';
        const supervisor = cols[4] || 'General';
        const grupo = cols[5] || '';
        const lider = cols[6] || '';

        // Preservar grupo/líder existente si el trabajador ya estaba registrado
        const existing = trabajadores.find((t) => String(t.dni).trim() === dni);

        if (dni) {
          list.push({
            dni,
            nombres: nombres || `TRABAJADOR ${dni}`,
            fundo: fundo || existing?.fundo || 'Arena Azul',
            modulo: modulo || existing?.modulo || 'M01',
            supervisor: supervisor || existing?.supervisor || 'General',
            grupo: grupo || existing?.grupo || '',
            lider: lider || existing?.lider || '',
            tipo: 'Cosechador',
            jabas: 0
          });
        }
      }
    });

    if (list.length === 0) {
      onToast('❌ No se pudieron extraer datos válidos. Revisa el formato CSV.');
      setParsedData(null);
      return;
    }

    setParsedData(list);
    onToast(`🔍 Vista previa lista: ${list.length} trabajadores detectados`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!isAdmin) {
      onToast('🚫 Permiso denegado: El único que puede cargar la nómina es el rol de Administrador.');
      return;
    }

    if (!parsedData || parsedData.length === 0) return;

    const existingDnis = new Set(trabajadores.map((t) => String(t.dni).trim()));
    const nowIso = new Date().toISOString().split('T')[0] + ' 00:00:00';

    const seenDnis = new Set<string>();
    const newWorkers: Trabajador[] = [];
    let duplicates = 0;

    parsedData.forEach((p, idx) => {
      const cleanDni = p.dni.trim();
      if (replaceMode) {
        if (!seenDnis.has(cleanDni)) {
          seenDnis.add(cleanDni);
          newWorkers.push({
            id: `IMP_${Date.now()}_${idx}`,
            fecha: nowIso,
            dni: cleanDni,
            nombres: p.nombres,
            fundo: p.fundo,
            modulo: p.modulo,
            supervisor: p.supervisor,
            grupo: p.grupo,
            lider: (p as any).lider || '',
            tipo: p.tipo,
            jabas: 0
          });
        } else {
          duplicates += 1;
        }
      } else {
        if (!existingDnis.has(cleanDni) && !seenDnis.has(cleanDni)) {
          seenDnis.add(cleanDni);
          newWorkers.push({
            id: `IMP_${Date.now()}_${idx}`,
            fecha: nowIso,
            dni: cleanDni,
            nombres: p.nombres,
            fundo: p.fundo,
            modulo: p.modulo,
            supervisor: p.supervisor,
            grupo: p.grupo,
            lider: (p as any).lider || '',
            tipo: p.tipo,
            jabas: 0
          });
        } else {
          duplicates += 1;
        }
      }
    });

    if (newWorkers.length === 0) {
      onToast(`⚠️ No se encontraron trabajadores válidos para importar.`);
      return;
    }

    onImportTrabajadores(newWorkers, replaceMode);
    onToast(
      replaceMode
        ? `✅ Nómina diaria reemplazada: ${newWorkers.length} trabajadores activos` + (duplicates > 0 ? ` (${duplicates} duplicados omitidos)` : '')
        : `✅ Importación exitosa: ${newWorkers.length} trabajadores agregados` + (duplicates > 0 ? ` (${duplicates} duplicados omitidos)` : '')
    );

    // Reset
    setParsedData(null);
    setPasteText('');
  };

  const handleCancel = () => {
    setParsedData(null);
    setPasteText('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
              <FileUp className="w-5 h-5 text-[#2e7d32]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 uppercase tracking-wider">
                  Hoja 1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                  Carga de Trabajadores (Nómina Base)
                </h2>
              </div>
              <p className="text-xs text-[#757575] mt-0.5">
                Carga exclusiva de la nómina de trabajadores (DNI y Nombres) sin mover cuadrillas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#e8f5e9] text-[#1b5e20] font-bold text-xs px-2.5 py-1.5 rounded-xl border border-[#a5d6a7]">
              {trabajadores.length} Registrados
            </span>
            {onNavigateToGruposLideres && (
              <button
                type="button"
                onClick={onNavigateToGruposLideres}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Ir a la Hoja 2 para organizar y asignar Grupo y Líder"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Hoja 2: Grupos y Líderes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notificación de Rol Restringido si no es Administrador */}
        {!isAdmin ? (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 mb-4 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Acceso Restringido para Carga de Nómina
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                El único usuario con autorización para cargar, modificar o reemplazar la nómina de trabajadores es el rol de <strong className="font-bold underline">Administrador</strong>.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Tu rol actual es: <span className="font-semibold bg-white px-2 py-0.5 rounded-md border border-amber-300">{session?.rol || 'Sin definir'}</span>.
                Para actualizar la nómina general, solicita al Administrador que realice la carga desde su cuenta.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#e8f5e9] border border-[#a5d6a7] rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2e7d32] shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#1b5e20]">
                  Rol Administrador Activo: Autorizado para cargar la nómina
                </p>
                <p className="text-[11px] text-[#2e7d32]">
                  Los cambios que importes se sincronizarán de inmediato en todos los dispositivos conectados.
                </p>
              </div>
            </div>

            {onDepurarTrabajadoresAyer && (
              <button
                type="button"
                onClick={() => {
                  const confirmMsg = countTrabajadoresAyer > 0
                    ? `¿Estás seguro de depurar ${countTrabajadoresAyer} trabajadores del día anterior?\n\nSe eliminarán de la nómina en este equipo, en el servidor y en todos los dispositivos conectados para que no vuelvan a aparecer.`
                    : '¿Deseas ejecutar la depuración de trabajadores de fechas anteriores a hoy?\n\nEsto asegurará que ningún equipo ni usuario con rol Trabajador vuelva a sincronizar personas de días pasados.';
                  if (window.confirm(confirmMsg)) {
                    onDepurarTrabajadoresAyer();
                  }
                }}
                className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 self-start sm:self-auto"
                title="Depurar y limpiar trabajadores de días anteriores"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Depurar Día Anterior {countTrabajadoresAyer > 0 ? `(${countTrabajadoresAyer})` : ''}</span>
              </button>
            )}
          </div>
        )}

        {/* Tab Toggle & Formularios de Carga: Exclusivo para Administrador */}
        {isAdmin ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setMode('file');
                  setParsedData(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'file'
                    ? 'bg-[#2e7d32] text-white shadow-md'
                    : 'bg-gray-100 text-[#40493d] hover:bg-gray-200'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>📁 Subir Archivo CSV</span>
              </button>
              <button
                onClick={() => {
                  setMode('paste');
                  setParsedData(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'paste'
                    ? 'bg-[#2e7d32] text-white shadow-md'
                    : 'bg-gray-100 text-[#40493d] hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>📝 Pegar Datos</span>
              </button>
            </div>

            {/* Mode 1: File Upload */}
            {mode === 'file' && (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-[#bfcaba] rounded-2xl p-6 text-center bg-[#fcf9f8] hover:bg-[#f1f8e9] transition-colors cursor-pointer relative">
                  <UploadCloud className="w-10 h-10 text-[#2e7d32] mx-auto mb-2 opacity-80" />
                  <div className="font-bold text-xs sm:text-sm text-[#1b5e20] mb-1">
                    Haz clic para seleccionar o arrastra tu archivo CSV
                  </div>
                  <p className="text-[11px] text-[#757575]">
                    Formato esperado: DNI, Nombres, Fundo, Módulo, Supervisor, Grupo
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Mode 2: Paste Text */}
            {mode === 'paste' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#40493d]">
                  Pega aquí el contenido (una fila por trabajador):
                </label>
                <textarea
                  rows={6}
                  placeholder={`DNI,Nombres,Fundo,Módulo,Supervisor,Grupo\n72345678,Juan Pérez Rojas,Arena Azul,M01,Carlos Mendoza,Grupo 01\n45892134,María González,Arena Azul,M01,Carlos Mendoza,Grupo 01`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-[#bfcaba] rounded-xl bg-white focus:outline-none focus:border-[#2e7d32]"
                />
                <button
                  onClick={() => parseCsvText(pasteText)}
                  className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Analizar y Previsualizar</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-200">
            <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-800">
              Carga de nómina inhabilitada para tu usuario
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Solo la cuenta con rol <strong>Administrador</strong> tiene autorización para cargar o reemplazar nóminas. Por favor inicia sesión como Administrador para utilizar este módulo.
            </p>
          </div>
        )}

        {/* Preview and Confirmation */}
        {parsedData && parsedData.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[#e0e0e0] animate-in fade-in">
            <div className="bg-[#e8f5e9] border border-[#a5d6a7] p-4 rounded-xl text-center mb-4">
              <div className="text-3xl font-extrabold text-[#1b5e20]">{parsedData.length}</div>
              <div className="text-xs text-[#2e7d32] font-semibold uppercase tracking-wider mt-0.5">
                Trabajadores Listos para Importar
              </div>
            </div>

            <h4 className="text-xs font-bold text-[#40493d] uppercase tracking-wider mb-2">
              Vista previa de registros:
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-[#e0e0e0] divide-y divide-[#f0f0f0] bg-white mb-5">
              {parsedData.slice(0, 10).map((p, idx) => (
                <div key={idx} className="py-2 px-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-[#1b5e20]">{p.nombres}</span>
                    <span className="text-[11px] text-gray-500 block">
                      DNI: {p.dni} · {p.fundo} - {p.modulo} · {p.supervisor}
                    </span>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold">
                    {p.grupo || 'Grupo 01'}
                  </span>
                </div>
              ))}
              {parsedData.length > 10 && (
                <div className="p-2 text-center text-xs text-gray-400 font-medium">
                  ... y {parsedData.length - 10} trabajadores más
                </div>
              )}
            </div>

            {/* Mode selection: Reemplazar nómina diaria vs Agregar */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="text-xs font-bold text-amber-900 mb-2">Modo de Importación:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  replaceMode ? 'bg-white border-[#2e7d32] shadow-sm' : 'bg-transparent border-amber-200 opacity-80'
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    checked={replaceMode}
                    onChange={() => setReplaceMode(true)}
                    className="mt-0.5 text-[#2e7d32] focus:ring-[#2e7d32]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#1b5e20]">🔄 Reemplazar Nómina Diaria (Recomendado)</div>
                    <div className="text-[11px] text-gray-600 mt-0.5">Sustituye toda la lista actual por estos trabajadores. Evita distorsión con días anteriores.</div>
                  </div>
                </label>

                <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  !replaceMode ? 'bg-white border-[#2e7d32] shadow-sm' : 'bg-transparent border-amber-200 opacity-80'
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    checked={!replaceMode}
                    onChange={() => setReplaceMode(false)}
                    className="mt-0.5 text-[#2e7d32] focus:ring-[#2e7d32]"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-800">➕ Agregar a la Nómina Existente</div>
                    <div className="text-[11px] text-gray-600 mt-0.5">Añade solo los DNIs nuevos sin eliminar los trabajadores actuales.</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold">Protección Offline Automática:</span> Al confirmar, se activará automáticamente el <strong>Modo Offline</strong>. Los trabajadores quedarán blindados en el dispositivo para que no se restablezcan al perder o reconectar señal.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#40493d] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-2 bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
              >
                <Check className="w-4 h-4" />
                <span>✅ Confirmar e Importar Nómina</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
