import React, { useState } from 'react';
import { Trabajador } from '../types';
import { FileUp, FileText, Check, X, UploadCloud, AlertTriangle, Eye } from 'lucide-react';

interface ImportarTabProps {
  trabajadores: Trabajador[];
  onImportTrabajadores: (nuevos: Trabajador[]) => void;
  onToast: (msg: string) => void;
}

export const ImportarTab: React.FC<ImportarTabProps> = ({
  trabajadores,
  onImportTrabajadores,
  onToast
}) => {
  const [mode, setMode] = useState<'file' | 'paste'>('file');
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
        const grupo = cols[5] || 'Grupo 01';

        if (dni) {
          list.push({
            dni,
            nombres: nombres || `TRABAJADOR ${dni}`,
            fundo,
            modulo,
            supervisor,
            grupo,
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
    if (!parsedData || parsedData.length === 0) return;

    const existingDnis = new Set(trabajadores.map((t) => String(t.dni).trim()));
    const nowIso = new Date().toISOString().split('T')[0] + ' 00:00:00';

    const newWorkers: Trabajador[] = [];
    let duplicates = 0;

    parsedData.forEach((p, idx) => {
      if (!existingDnis.has(p.dni)) {
        newWorkers.push({
          id: `IMP_${Date.now()}_${idx}`,
          fecha: nowIso,
          dni: p.dni,
          nombres: p.nombres,
          fundo: p.fundo,
          modulo: p.modulo,
          supervisor: p.supervisor,
          grupo: p.grupo,
          tipo: p.tipo,
          jabas: 0
        });
        existingDnis.add(p.dni);
      } else {
        duplicates += 1;
      }
    });

    if (newWorkers.length === 0) {
      onToast(`⚠️ Todos los ${parsedData.length} trabajadores ya existen en la nómina.`);
      return;
    }

    onImportTrabajadores(newWorkers);
    onToast(
      `✅ Importación exitosa: ${newWorkers.length} trabajadores agregados` +
        (duplicates > 0 ? ` (${duplicates} duplicados omitidos)` : '')
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
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-[#2e7d32]" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                Importación Masiva de Trabajadores
              </h2>
              <p className="text-xs text-[#757575]">
                Carga de nómina mediante archivo CSV o pegado directo de columnas
              </p>
            </div>
          </div>
          <span className="bg-[#e8f5e9] text-[#1b5e20] font-bold text-xs px-2.5 py-1 rounded-full border border-[#a5d6a7]">
            {trabajadores.length} Registrados
          </span>
        </div>

        {/* Tab Toggle */}
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
