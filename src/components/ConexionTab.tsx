import React, { useState } from 'react';
import { SyncLogEntry, FirebaseConfig } from '../types';
import { 
  getGsheetUrl, 
  saveGsheetUrl, 
  isAutoSyncEnabled, 
  setAutoSyncEnabled, 
  getFirebaseConfig, 
  saveFirebaseConfig, 
  generateBackupJson, 
  setLastSyncTime 
} from '../utils/storage';
import { 
  Cloud,
  Save, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  Download, 
  RefreshCw, 
  FileCode2, 
  Radio,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Table
} from 'lucide-react';

interface ConexionTabProps {
  logs: SyncLogEntry[];
  onAddLog: (msg: string, tipo: 'ok' | 'err' | 'info') => void;
  onManualSyncPush: () => void;
  onManualSyncPull: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onResetData?: () => void;
}


const APPS_SCRIPT_CODE = `/**
 * RECOJO DE FRUTA - GOOGLE APPS SCRIPT WEB APP BACKEND
 * Instrucciones:
 * 1. Abre tu Google Sheet > Extensiones > Apps Script
 * 2. Pega todo este código reemplazando el contenido existente
 * 3. Clic en "Implementar" > "Nueva implementación"
 * 4. Tipo: "Aplicación web"
 * 5. Ejecutar como: "Yo" (tu cuenta)
 * 6. Quién tiene acceso: "Cualquier usuario" (Anyone)
 * 7. Copia la URL terminada en /exec y pégala en la pestaña "Nube" de la App
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var rawData = e.postData.contents;
    var parsed = JSON.parse(rawData);
    var payload = parsed.data || {};
    var timestamp = new Date();

    // 1. Guardar Registro de Jabas / Avance Detallado
    if (payload.detalleJabas && payload.detalleJabas.length > 0) {
      var sheetJabas = getOrCreateSheet(ss, 'Registro_Avance', [
        'ID', 'Fecha', 'Hora_Registro', 'Supervisor', 'Fundo', 'Modulo', 'Grupo', 'Lider', 'DNI', 'Trabajador', 'Jabas'
      ]);
      sheetJabas.clearContents();
      sheetJabas.appendRow(['ID', 'Fecha', 'Hora_Registro', 'Supervisor', 'Fundo', 'Modulo', 'Grupo', 'Lider', 'DNI', 'Trabajador', 'Jabas']);
      payload.detalleJabas.forEach(function(item) {
        sheetJabas.appendRow([
          item.id || '',
          item.fecha || '',
          item.timestamp || timestamp.toISOString(),
          item.supervisor || '',
          item.fundo || '',
          item.modulo || '',
          item.grupo || '',
          item.lider || '',
          item.dni || '',
          item.trabajador || '',
          Number(item.jabas) || 0
        ]);
      });
    }

    // 2. Guardar Validaciones Oficiales de Supervisor
    if (payload.validaciones && payload.validaciones.length > 0) {
      var sheetVal = getOrCreateSheet(ss, 'Validaciones_Supervisor', [
        'ID_Validacion', 'Fecha', 'Hora_Validacion', 'Supervisor', 'Fundo', 'Modulo', 'Grupo', 'Lider',
        'Total_Personal', 'Personal_Conforme', 'Personal_Anulado', 'Total_Jabas', 'Jabas_Conformes',
        'Estado', 'Observaciones', 'Creado_Por'
      ]);
      sheetVal.clearContents();
      sheetVal.appendRow([
        'ID_Validacion', 'Fecha', 'Hora_Validacion', 'Supervisor', 'Fundo', 'Modulo', 'Grupo', 'Lider',
        'Total_Personal', 'Personal_Conforme', 'Personal_Anulado', 'Total_Jabas', 'Jabas_Conformes',
        'Estado', 'Observaciones', 'Creado_Por'
      ]);
      payload.validaciones.forEach(function(v) {
        sheetVal.appendRow([
          v.id || '',
          v.fecha || '',
          v.fechaRegistro || timestamp.toISOString(),
          v.supervisor || '',
          v.fundo || '',
          v.modulo || '',
          v.grupo || '',
          v.lider || '',
          v.totalTrabajadores || 0,
          v.trabajadoresConformes || 0,
          v.trabajadoresAnulados || 0,
          v.totalJabas || 0,
          v.jabasConformes || 0,
          v.estado || 'Validado',
          v.observacionesGenerales || '',
          v.creadoPor || ''
        ]);
      });
    }

    // 3. Guardar Programas de Cosecha
    if (payload.programas && payload.programas.length > 0) {
      var sheetProg = getOrCreateSheet(ss, 'Programas', [
        'ID', 'Fecha', 'Fundo', 'Modulo', 'Jabas_Estimadas', 'Supervisor', 'Estado'
      ]);
      sheetProg.clearContents();
      sheetProg.appendRow(['ID', 'Fecha', 'Fundo', 'Modulo', 'Jabas_Estimadas', 'Supervisor', 'Estado']);
      payload.programas.forEach(function(p) {
        sheetProg.appendRow([
          p.id || '',
          p.fecha || '',
          p.fundo || '',
          p.modulo || '',
          Number(p.jabas) || 0,
          p.supervisor || '',
          p.estado || 'Abierto'
        ]);
      });
    }

    // 4. Guardar Programa General
    if (payload.programaGeneral && payload.programaGeneral.length > 0) {
      var sheetGen = getOrCreateSheet(ss, 'Programa_General', [
        'ID', 'Fecha', 'Fundo', 'Modulo', 'Variedad', 'Jabas_Estimadas', 'Supervisor', 'Estado'
      ]);
      sheetGen.clearContents();
      sheetGen.appendRow(['ID', 'Fecha', 'Fundo', 'Modulo', 'Variedad', 'Jabas_Estimadas', 'Supervisor', 'Estado']);
      payload.programaGeneral.forEach(function(pg) {
        sheetGen.appendRow([
          pg.id || '',
          pg.fecha || '',
          pg.fundo || '',
          pg.modulo || '',
          pg.variedad || '',
          Number(pg.jabas) || 0,
          pg.supervisor || '',
          pg.estado || 'Pendiente'
        ]);
      });
    }

    // 5. Guardar Trabajadores
    if (payload.trabajadores && payload.trabajadores.length > 0) {
      var sheetTrab = getOrCreateSheet(ss, 'Trabajadores', [
        'DNI', 'Nombres', 'Fundo', 'Modulo', 'Grupo', 'Supervisor', 'Lider', 'Tipo'
      ]);
      sheetTrab.clearContents();
      sheetTrab.appendRow(['DNI', 'Nombres', 'Fundo', 'Modulo', 'Grupo', 'Supervisor', 'Lider', 'Tipo']);
      payload.trabajadores.forEach(function(t) {
        sheetTrab.appendRow([
          t.dni || '',
          t.nombres || '',
          t.fundo || '',
          t.modulo || '',
          t.grupo || '',
          t.supervisor || '',
          t.lider || '',
          t.tipo || 'Trabajador'
        ]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Sincronización completada exitosamente',
      timestamp: timestamp.toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.accion) ? e.parameter.accion : 'test';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'test') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Conexión exitosa a Google Sheets - Recojo de Fruta API',
      spreadsheetName: ss.getName()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'export') {
    try {
      var result = {
        detalleJabas: [],
        validaciones: [],
        programas: [],
        programaGeneral: [],
        trabajadores: []
      };

      // 1. Leer Registro_Avance
      var sheetJabas = ss.getSheetByName('Registro_Avance');
      if (sheetJabas && sheetJabas.getLastRow() > 1) {
        var values = sheetJabas.getRange(2, 1, sheetJabas.getLastRow() - 1, 11).getValues();
        result.detalleJabas = values.map(function(r) {
          return {
            id: String(r[0] || ''),
            fecha: String(r[1] || ''),
            timestamp: String(r[2] || ''),
            supervisor: String(r[3] || ''),
            fundo: String(r[4] || ''),
            modulo: String(r[5] || ''),
            grupo: String(r[6] || ''),
            lider: String(r[7] || ''),
            dni: String(r[8] || ''),
            trabajador: String(r[9] || ''),
            jabas: Number(r[10]) || 0
          };
        });
      }

      // 2. Leer Validaciones_Supervisor
      var sheetVal = ss.getSheetByName('Validaciones_Supervisor');
      if (sheetVal && sheetVal.getLastRow() > 1) {
        var valValues = sheetVal.getRange(2, 1, sheetVal.getLastRow() - 1, 16).getValues();
        result.validaciones = valValues.map(function(r) {
          return {
            id: String(r[0] || ''),
            fecha: String(r[1] || ''),
            fechaRegistro: String(r[2] || ''),
            supervisor: String(r[3] || ''),
            fundo: String(r[4] || ''),
            modulo: String(r[5] || ''),
            grupo: String(r[6] || ''),
            lider: String(r[7] || ''),
            totalTrabajadores: Number(r[8]) || 0,
            trabajadoresConformes: Number(r[9]) || 0,
            trabajadoresAnulados: Number(r[10]) || 0,
            totalJabas: Number(r[11]) || 0,
            jabasConformes: Number(r[12]) || 0,
            estado: String(r[13] || 'Validado'),
            observacionesGenerales: String(r[14] || ''),
            creadoPor: String(r[15] || '')
          };
        });
      }

      // 3. Leer Programas
      var sheetProg = ss.getSheetByName('Programas');
      if (sheetProg && sheetProg.getLastRow() > 1) {
        var progValues = sheetProg.getRange(2, 1, sheetProg.getLastRow() - 1, 7).getValues();
        result.programas = progValues.map(function(r) {
          return {
            id: String(r[0] || ''),
            fecha: String(r[1] || ''),
            fundo: String(r[2] || ''),
            modulo: String(r[3] || ''),
            jabas: Number(r[4]) || 0,
            supervisor: String(r[5] || ''),
            estado: String(r[6] || 'Abierto')
          };
        });
      }

      // 4. Leer Programa_General
      var sheetGen = ss.getSheetByName('Programa_General');
      if (sheetGen && sheetGen.getLastRow() > 1) {
        var genValues = sheetGen.getRange(2, 1, sheetGen.getLastRow() - 1, 8).getValues();
        result.programaGeneral = genValues.map(function(r) {
          return {
            id: String(r[0] || ''),
            fecha: String(r[1] || ''),
            fundo: String(r[2] || ''),
            modulo: String(r[3] || ''),
            variedad: String(r[4] || ''),
            jabas: Number(r[5]) || 0,
            supervisor: String(r[6] || ''),
            estado: String(r[7] || 'Pendiente')
          };
        });
      }

      // 5. Leer Trabajadores
      var sheetTrab = ss.getSheetByName('Trabajadores');
      if (sheetTrab && sheetTrab.getLastRow() > 1) {
        var trabValues = sheetTrab.getRange(2, 1, sheetTrab.getLastRow() - 1, 8).getValues();
        result.trabajadores = trabValues.map(function(r) {
          return {
            dni: String(r[0] || ''),
            nombres: String(r[1] || ''),
            fundo: String(r[2] || ''),
            modulo: String(r[3] || ''),
            grupo: String(r[4] || ''),
            supervisor: String(r[5] || ''),
            lider: String(r[6] || ''),
            tipo: String(r[7] || 'Trabajador')
          };
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        message: 'Datos exportados correctamente desde Google Sheets',
        data: result
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f5e9');
    }
  }
  return sheet;
}`;

export const ConexionTab: React.FC<ConexionTabProps> = ({
  logs,
  onAddLog,
  onManualSyncPush,
  onManualSyncPull,
  onToast,
  onResetData
}) => {
  const [gsheetUrl, setGsheetUrl] = useState(getGsheetUrl());
  const [autoSync, setAutoSync] = useState(isAutoSyncEnabled());
  const [fbConfigText, setFbConfigText] = useState(() => {
    const existing = getFirebaseConfig();
    return existing ? JSON.stringify(existing, null, 2) : '';
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSaveGsheetUrl = () => {
    const trimmed = gsheetUrl.trim();
    saveGsheetUrl(trimmed);
    if (trimmed) {
      onAddLog(`Configuración de Google Sheets guardada: ${trimmed}`, 'ok');
      onToast('✅ URL de Google Sheets guardada', 'success');
    } else {
      onAddLog('URL de Google Sheets eliminada. Modo almacenamiento local activo.', 'info');
      onToast('ℹ️ Conexión local activa', 'info');
    }
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    setAutoSyncEnabled(next);
    if (next) {
      onAddLog('⚡ Auto-guardado en Google Sheets ACTIVADO', 'ok');
      onToast('⚡ Auto-guardado ACTIVADO', 'success');
    } else {
      onAddLog('💤 Auto-guardado desactivado', 'info');
      onToast('💤 Auto-guardado desactivado', 'info');
    }
  };

  const handleTestConnection = async () => {
    if (!gsheetUrl.trim()) {
      onToast('⚠️ Ingresa una URL de Web App primero', 'warning');
      return;
    }
    setTestingConnection(true);
    onAddLog(`🔍 Probando conexión a Google Apps Script (${gsheetUrl.slice(0, 45)}...)...`, 'info');

    try {
      const res = await fetch(`${gsheetUrl}?accion=test`, { method: 'GET' });
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Not JSON
      }

      if (json && json.status === 'ok') {
        if (text.includes('ScanTrabajadores')) {
          onAddLog(`⚠️ Conexión detectada pero el script en Google Sheets es antiguo ("ScanTrabajadores"). Copia el código oficial de abajo y crea una "Nueva Implementación".`, 'err');
          onToast('⚠️ Actualiza el código en Google Apps Script', 'warning');
        } else {
          onAddLog(`✅ Conexión exitosa a Google Sheets - ${json.message || 'API Lista'} (${json.spreadsheetName || 'Hoja Vinculada'})`, 'ok');
          onToast('✅ Conexión con Google Sheets verificada con éxito', 'success');
        }
      } else if (text.includes('<!DOCTYPE html>') || text.includes('Page Not Found') || text.includes('unable to open')) {
        onAddLog(`❌ Error de permisos: En Apps Script, ve a Implementar > Nueva Implementación y asegúrate de elegir "Quién tiene acceso: Cualquier usuario (Anyone)".`, 'err');
        onToast('❌ Permisos no públicos en Apps Script', 'error');
      } else {
        onAddLog(`⚠️ El servidor respondió: ${text.slice(0, 120)}`, 'err');
        onToast(`⚠️ Respuesta: ${res.status}`, 'warning');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      onAddLog(`❌ Error al conectar: ${errMsg}. Verifica tu conexión a internet o la URL del script.`, 'err');
      onToast('⚠️ Error de conexión a la URL de Google Sheets', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = APPS_SCRIPT_CODE;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(true);
      onToast('✅ Código Apps Script copiado al portapapeles', 'success');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      onToast('⚠️ Copia el código manualmente desde el cuadro', 'warning');
    }
  };

  const handleSaveFirebase = () => {
    if (!fbConfigText.trim()) {
      saveFirebaseConfig(null);
      onAddLog('Configuración de Firebase eliminada.', 'info');
      onToast('🗑️ Configuración de Firebase eliminada', 'info');
      return;
    }

    try {
      const parsed: FirebaseConfig = JSON.parse(fbConfigText);
      if (!parsed.apiKey || !parsed.databaseURL) {
        onToast('❌ Faltan campos requeridos: apiKey y databaseURL', 'error');
        return;
      }
      saveFirebaseConfig(parsed);
      onAddLog(`🔥 Firebase Realtime Database configurado (Proyecto: ${parsed.projectId || 'N/A'})`, 'ok');
      onToast('✅ Configuración Firebase guardada', 'success');
    } catch {
      onToast('❌ JSON de Firebase inválido. Revisa la sintaxis.', 'error');
    }
  };

  const handleExportBackup = () => {
    const jsonStr = generateBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recojo-frutos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onAddLog('📥 Copia de seguridad JSON descargada al dispositivo', 'ok');
    onToast('✅ Backup JSON descargado', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Google Sheets Connection Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0e0] p-4 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#2e7d32]" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1b5e20]">
                Paso 3: Guardar toda la información en Google Sheets
              </h2>
              <p className="text-xs text-[#757575]">
                Sincronización directa de registros, avances de jabas y validaciones hacia tu hoja de cálculo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b5e20] bg-[#e8f5e9] px-2.5 py-1 rounded-full border border-[#a5d6a7]">
            <Radio className="w-3.5 h-3.5 text-[#2e7d32] animate-pulse" />
            <span>{gsheetUrl ? 'Conectado a Sheets' : 'Modo Local'}</span>
          </div>
        </div>

        {/* URL Input */}
        <div className="space-y-3 mb-5">
          <label className="block text-xs font-semibold text-[#40493d]">
            URL del Web App de Google Apps Script (Despliegue /exec):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={gsheetUrl}
              onChange={(e) => setGsheetUrl(e.target.value)}
              className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#bfcaba] bg-white focus:outline-none focus:border-[#2e7d32]"
            />
            <button
              onClick={handleSaveGsheetUrl}
              className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar URL</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <button
            onClick={onManualSyncPush}
            className="bg-[#ff8f00] hover:bg-[#e65100] text-white p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <UploadCloud className="w-5 h-5" />
            <span>📤 Subir Todo a Sheets</span>
          </button>

          <button
            onClick={onManualSyncPull}
            className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <DownloadCloud className="w-5 h-5" />
            <span>📥 Descargar de Sheets</span>
          </button>

          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="bg-gray-100 hover:bg-gray-200 text-[#40493d] p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border border-[#bfcaba] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-5 h-5 ${testingConnection ? 'animate-spin text-[#2e7d32]' : ''}`} />
            <span>🔍 Probar Conexión</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="bg-gray-100 hover:bg-gray-200 text-[#40493d] p-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border border-[#bfcaba] transition-all cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>📥 Backup JSON</span>
          </button>
        </div>

        {/* Action Button: Limpiar Datos de Prueba */}
        {onResetData && (
          <div className="bg-red-50/70 border border-red-200 p-3 sm:p-4 rounded-xl mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-red-800">
                  🧹 Limpiar Base de Datos (Sin Datos de Prueba)
                </span>
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.2 rounded-full font-bold uppercase">
                  Paso 2
                </span>
              </div>
              <p className="text-xs text-red-600 mt-0.5 max-w-lg">
                Elimina todos los registros y pruebas para iniciar operaciones en blanco en todas las computadoras y celulares.
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('¿Estás seguro de limpiar todos los registros y datos de prueba? Esta acción dejará el sistema en blanco y sincronizado para todos los usuarios.')) {
                  onResetData();
                }
              }}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              🧹 Limpiar Todo
            </button>
          </div>
        )}


        {/* Auto-Sync Toggle Box */}
        <div className="bg-[#e8f5e9]/70 border border-[#a5d6a7] p-4 rounded-xl mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-[#1b5e20]">
                ⚡ Auto-guardado Automático en Google Sheets
              </span>
              <span className="text-[10px] bg-[#2e7d32] text-white px-2 py-0.2 rounded-full font-bold uppercase">
                Activo
              </span>
            </div>
            <p className="text-xs text-[#5f6368] mt-0.5 max-w-lg">
              Al guardar cualquier avance de jabas en Personal o validación de supervisor, se enviará automáticamente a Google Sheets en tiempo real.
            </p>
          </div>

          <button
            onClick={handleToggleAutoSync}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
              autoSync
                ? 'bg-[#2e7d32] text-white hover:bg-[#1b5e20]'
                : 'bg-white border border-[#bfcaba] text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${autoSync ? 'bg-[#cbffc2]' : 'bg-gray-300'}`} />
            <span>{autoSync ? 'ACTIVADO' : 'DESACTIVADO'}</span>
          </button>
        </div>

        {/* Step-by-Step Google Apps Script Code Generator */}
        <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-[#2e7d32]" />
              <h3 className="font-bold text-xs sm:text-sm text-[#1b5e20]">
                Código Google Apps Script Listo para tu Google Sheet
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCodeGuide(!showCodeGuide)}
              className="text-xs text-[#2e7d32] hover:text-[#1b5e20] font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{showCodeGuide ? 'Ocultar Código' : 'Ver Guía y Código'}</span>
              {showCodeGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Guide Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
              <span className="font-bold text-[#1b5e20] block mb-1">1. Crea Hoja</span>
              <span className="text-[11px] text-gray-600">Abre una hoja en blanco en Google Sheets.</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
              <span className="font-bold text-[#1b5e20] block mb-1">2. Apps Script</span>
              <span className="text-[11px] text-gray-600">Ve a <strong>Extensiones &gt; Apps Script</strong>.</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
              <span className="font-bold text-[#1b5e20] block mb-1">3. Pega Código</span>
              <span className="text-[11px] text-gray-600">Pega el código de abajo y guarda.</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
              <span className="font-bold text-[#1b5e20] block mb-1">4. Implementar</span>
              <span className="text-[11px] text-gray-600">Nueva implementación como <strong>App web</strong> (Acceso: Cualquiera).</span>
            </div>
          </div>

          {showCodeGuide && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-700">Código de Apps Script:</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? '¡Código Copiado!' : 'Copiar Todo el Código'}</span>
                </button>
              </div>

              <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded-xl font-mono text-[10px] leading-relaxed max-h-56 overflow-y-auto border border-gray-700 select-all">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>

        {/* Live Synchronization Log Console */}
        <div className="border-t border-[#e0e0e0] pt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-[#1b5e20] uppercase tracking-wider">
              Registro de Actividad y Sincronización en Vivo
            </h4>
            <span className="text-[11px] text-gray-500 font-mono">
              {logs.length} eventos
            </span>
          </div>

          <div className="bg-[#263238] text-[#eceff1] rounded-xl p-3 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 shadow-inner">
            {logs.length === 0 ? (
              <p className="text-gray-400">Sin eventos de sincronización registrados aún.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-gray-400 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={
                      log.tipo === 'ok'
                        ? 'text-[#81c784]'
                        : log.tipo === 'err'
                        ? 'text-[#ef9a9a]'
                        : 'text-[#90caf9]'
                    }
                  >
                    {log.mensaje}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
