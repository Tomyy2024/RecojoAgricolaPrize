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
  auth, 
  signInWithGoogle, 
  signInGuest, 
  logOut as firebaseLogOut,
  syncAllDataToFirestore,
  fetchAllDataFromFirestore,
  testConnection
} from '../lib/firebase';
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
  Table,
  Zap,
  LogIn,
  LogOut,
  Database
} from 'lucide-react';

interface ConexionTabProps {
  logs: SyncLogEntry[];
  onAddLog: (msg: string, tipo: 'ok' | 'err' | 'info') => void;
  onManualSyncPush: () => void;
  onManualSyncPull: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onResetData?: () => void;
  onDataLoadedFromCloud?: (data: any) => void;
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
      var rowsJabas = [['ID', 'Fecha', 'Hora_Registro', 'Supervisor', 'Fundo', 'Modulo', 'Grupo', 'Lider', 'DNI', 'Trabajador', 'Jabas']];
      payload.detalleJabas.forEach(function(item) {
        rowsJabas.push([
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
      if (rowsJabas.length > 0) {
        sheetJabas.getRange(1, 1, rowsJabas.length, 11).setValues(rowsJabas);
      }
    }

    // 2. Guardar Validaciones Oficiales de Supervisor
    if (payload.validaciones && payload.validaciones.length > 0) {
      var sheetVal = getOrCreateSheet(ss, 'Validaciones_Supervisor', [
        'ID_Validacion', 'Fecha', 'Hora_Validacion', 'Supervisor', 'Fundo', 'Modulo', 'Grupo', 'Lider',
        'Total_Personal', 'Personal_Conforme', 'Personal_Anulado', 'Total_Jabas', 'Jabas_Conformes',
        'Estado', 'Observaciones', 'Creado_Por', 'Items_JSON'
      ]);
      sheetVal.clearContents();
      var rowsVal = [[
        'ID_Validacion', 'Fecha', 'Hora_Validacion', 'Supervisor', 'Fundo', 'Modulo', 'Grupo', 'Lider',
        'Total_Personal', 'Personal_Conforme', 'Personal_Anulado', 'Total_Jabas', 'Jabas_Conformes',
        'Estado', 'Observaciones', 'Creado_Por', 'Items_JSON'
      ]];
      payload.validaciones.forEach(function(v) {
        rowsVal.push([
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
          v.creadoPor || '',
          JSON.stringify(v.items || [])
        ]);
      });
      if (rowsVal.length > 0) {
        sheetVal.getRange(1, 1, rowsVal.length, 17).setValues(rowsVal);
      }
    }

    // 3. Guardar Programas de Cosecha
    if (payload.programas && payload.programas.length > 0) {
      var sheetProg = getOrCreateSheet(ss, 'Programas', [
        'ID', 'Fecha', 'Fundo', 'Modulo', 'Jabas_Estimadas', 'Supervisor', 'Estado'
      ]);
      sheetProg.clearContents();
      var rowsProg = [['ID', 'Fecha', 'Fundo', 'Modulo', 'Jabas_Estimadas', 'Supervisor', 'Estado']];
      payload.programas.forEach(function(p) {
        rowsProg.push([
          p.id || '',
          p.fecha || '',
          p.fundo || '',
          p.modulo || '',
          Number(p.jabas) || 0,
          p.supervisor || '',
          p.estado || 'Abierto'
        ]);
      });
      if (rowsProg.length > 0) {
        sheetProg.getRange(1, 1, rowsProg.length, 7).setValues(rowsProg);
      }
    }

    // 4. Guardar Programa General
    if (payload.programaGeneral && payload.programaGeneral.length > 0) {
      var sheetGen = getOrCreateSheet(ss, 'Programa_General', [
        'ID', 'Fecha', 'Fundo', 'Modulo', 'Variedad', 'Jabas_Estimadas', 'Supervisor', 'Estado'
      ]);
      sheetGen.clearContents();
      var rowsGen = [['ID', 'Fecha', 'Fundo', 'Modulo', 'Variedad', 'Jabas_Estimadas', 'Supervisor', 'Estado']];
      payload.programaGeneral.forEach(function(pg) {
        rowsGen.push([
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
      if (rowsGen.length > 0) {
        sheetGen.getRange(1, 1, rowsGen.length, 8).setValues(rowsGen);
      }
    }

    // 5. Guardar Trabajadores (Bulk Rápido con setValues)
    if (payload.trabajadores && payload.trabajadores.length > 0) {
      var sheetTrab = getOrCreateSheet(ss, 'Trabajadores', [
        'DNI', 'Nombres', 'Fundo', 'Modulo', 'Grupo', 'Supervisor', 'Lider', 'Tipo'
      ]);
      sheetTrab.clearContents();
      var rowsTrab = [['DNI', 'Nombres', 'Fundo', 'Modulo', 'Grupo', 'Supervisor', 'Lider', 'Tipo']];
      payload.trabajadores.forEach(function(t) {
        rowsTrab.push([
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
      if (rowsTrab.length > 0) {
        sheetTrab.getRange(1, 1, rowsTrab.length, 8).setValues(rowsTrab);
      }
    }

    // 6. Guardar Usuarios y Cuentas de Acceso
    if (payload.usuarios && payload.usuarios.length > 0) {
      var sheetUsers = getOrCreateSheet(ss, 'Usuarios', [
        'Usuario', 'Password', 'Nombre', 'Rol', 'Fecha_Creacion'
      ]);
      sheetUsers.clearContents();
      var rowsUsers = [['Usuario', 'Password', 'Nombre', 'Rol', 'Fecha_Creacion']];
      payload.usuarios.forEach(function(u) {
        rowsUsers.push([
          u.user || '',
          u.pass || '',
          u.nombre || '',
          u.rol || 'Trabajador',
          u.creado || ''
        ]);
      });
      if (rowsUsers.length > 0) {
        sheetUsers.getRange(1, 1, rowsUsers.length, 5).setValues(rowsUsers);
      }
    }

    // 7. Guardar Lideres
    if (payload.lideres && payload.lideres.length > 0) {
      var sheetLid = getOrCreateSheet(ss, 'Lideres', [
        'Lider', 'DNI', 'Nombres', 'Grupo', 'Fecha_Alta'
      ]);
      sheetLid.clearContents();
      var rowsLid = [['Lider', 'DNI', 'Nombres', 'Grupo', 'Fecha_Alta']];
      payload.lideres.forEach(function(l) {
        rowsLid.push([
          l.lider || '',
          l.dni || '',
          l.nombres || '',
          l.grupo || '',
          l.fechaAlta || ''
        ]);
      });
      if (rowsLid.length > 0) {
        sheetLid.getRange(1, 1, rowsLid.length, 5).setValues(rowsLid);
      }
    }

    // 8. Guardar Grupos
    if (payload.grupos && payload.grupos.length > 0) {
      var sheetGrp = getOrCreateSheet(ss, 'Grupos', ['Grupo']);
      sheetGrp.clearContents();
      var rowsGrp = [['Grupo']];
      payload.grupos.forEach(function(g) {
        rowsGrp.push([g || '']);
      });
      if (rowsGrp.length > 0) {
        sheetGrp.getRange(1, 1, rowsGrp.length, 1).setValues(rowsGrp);
      }
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
        trabajadores: [],
        usuarios: [],
        lideres: [],
        grupos: []
      };

      function formatDateVal(val) {
        if (!val) return '';
        if (val instanceof Date) {
          var y = val.getFullYear();
          var m = ('0' + (val.getMonth() + 1)).slice(-2);
          var d = ('0' + val.getDate()).slice(-2);
          return y + '-' + m + '-' + d;
        }
        var str = String(val).trim();
        if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
          var parts = str.split(/[-/]/);
          var dayPart = parts[2].split('T')[0].split(' ')[0];
          return parts[0] + '-' + ('0' + parts[1]).slice(-2) + '-' + ('0' + dayPart).slice(-2);
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
          var sParts = str.split('/');
          return sParts[2] + '-' + ('0' + sParts[1]).slice(-2) + '-' + ('0' + sParts[0]).slice(-2);
        }
        var pDate = new Date(str);
        if (!isNaN(pDate.getTime())) {
          var py = pDate.getFullYear();
          var pm = ('0' + (pDate.getMonth() + 1)).slice(-2);
          var pd = ('0' + pDate.getDate()).slice(-2);
          return py + '-' + pm + '-' + pd;
        }
        return str.split('T')[0].split(' ')[0];
      }

      // 1. Leer Registro_Avance
      var sheetJabas = ss.getSheetByName('Registro_Avance');
      if (sheetJabas && sheetJabas.getLastRow() > 1) {
        var values = sheetJabas.getRange(2, 1, sheetJabas.getLastRow() - 1, 11).getValues();
        result.detalleJabas = values
          .filter(function(r) {
            return String(r[0] || '').trim() !== '' || String(r[8] || '').trim() !== '' || String(r[9] || '').trim() !== '';
          })
          .map(function(r) {
            return {
              id: String(r[0] || ''),
              fecha: formatDateVal(r[1]),
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

      // 2. Leer Validaciones_Supervisor (Filtrar filas vacías)
      var sheetVal = ss.getSheetByName('Validaciones_Supervisor');
      if (sheetVal && sheetVal.getLastRow() > 1) {
        var maxCols = Math.max(17, sheetVal.getLastColumn());
        var valValues = sheetVal.getRange(2, 1, sheetVal.getLastRow() - 1, maxCols).getValues();
        result.validaciones = valValues
          .filter(function(r) {
            var id = String(r[0] || '').trim();
            var fecha = String(r[1] || '').trim();
            var sup = String(r[3] || '').trim();
            var totTrab = Number(r[8]) || 0;
            var totJab = Number(r[11]) || 0;
            return id !== '' || fecha !== '' || sup !== '' || totTrab > 0 || totJab > 0;
          })
          .map(function(r) {
            var itemsParsed = [];
            if (r[16]) {
              try {
                itemsParsed = JSON.parse(String(r[16]));
              } catch (e) {}
            }
            return {
              id: String(r[0] || ''),
              fecha: formatDateVal(r[1]),
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
              creadoPor: String(r[15] || ''),
              items: itemsParsed
            };
          });
      }

      // 3. Leer Programas
      var sheetProg = ss.getSheetByName('Programas');
      if (sheetProg && sheetProg.getLastRow() > 1) {
        var progValues = sheetProg.getRange(2, 1, sheetProg.getLastRow() - 1, 7).getValues();
        result.programas = progValues
          .filter(function(r) {
            return String(r[0] || '').trim() !== '' || String(r[1] || '').trim() !== '';
          })
          .map(function(r) {
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
        result.programaGeneral = genValues
          .filter(function(r) {
            return String(r[0] || '').trim() !== '' || String(r[1] || '').trim() !== '';
          })
          .map(function(r) {
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
        result.trabajadores = trabValues
          .filter(function(r) {
            return String(r[0] || '').trim() !== '' || String(r[1] || '').trim() !== '';
          })
          .map(function(r) {
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

      // 6. Leer Usuarios
      var sheetUsers = ss.getSheetByName('Usuarios');
      if (sheetUsers && sheetUsers.getLastRow() > 1) {
        var userValues = sheetUsers.getRange(2, 1, sheetUsers.getLastRow() - 1, 5).getValues();
        result.usuarios = userValues.map(function(r) {
          return {
            user: String(r[0] || ''),
            pass: String(r[1] || ''),
            nombre: String(r[2] || ''),
            rol: String(r[3] || 'Trabajador'),
            creado: String(r[4] || '')
          };
        }).filter(function(u) { return u.user !== ''; });
      }

      // 7. Leer Lideres
      var sheetLid = ss.getSheetByName('Lideres');
      if (sheetLid && sheetLid.getLastRow() > 1) {
        var lidValues = sheetLid.getRange(2, 1, sheetLid.getLastRow() - 1, 5).getValues();
        result.lideres = lidValues
          .filter(function(r) {
            return String(r[0] || '').trim() !== '' || String(r[2] || '').trim() !== '';
          })
          .map(function(r) {
            return {
              lider: String(r[0] || ''),
              dni: String(r[1] || ''),
              nombres: String(r[2] || ''),
              grupo: String(r[3] || ''),
              fechaAlta: String(r[4] || '')
            };
          });
      }

      // 8. Leer Grupos
      var sheetGrp = ss.getSheetByName('Grupos');
      if (sheetGrp && sheetGrp.getLastRow() > 1) {
        var grpValues = sheetGrp.getRange(2, 1, sheetGrp.getLastRow() - 1, 1).getValues();
        result.grupos = grpValues.map(function(r) {
          return String(r[0] || '');
        }).filter(function(g) { return g !== ''; });
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
  onResetData,
  onDataLoadedFromCloud
}) => {
  const [gsheetUrl, setGsheetUrl] = useState(getGsheetUrl());
  const [autoSync, setAutoSync] = useState(isAutoSyncEnabled());
  const [fbConfigText, setFbConfigText] = useState(() => {
    const existing = getFirebaseConfig();
    return existing ? JSON.stringify(existing, null, 2) : '';
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingFirebase, setTestingFirebase] = useState(false);
  const [syncingFirebase, setSyncingFirebase] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(() => auth.currentUser);

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  const handleTestFirebase = async () => {
    setTestingFirebase(true);
    onAddLog('🔥 Probando conexión con Firebase Firestore (recojo-fruto-campo)...', 'info');
    try {
      const ok = await testConnection();
      if (ok) {
        onAddLog('✅ Conexión con Firebase Firestore verificada con éxito. Base de datos lista en us-east1.', 'ok');
        onToast('✅ Firebase Firestore conectado y activo', 'success');
      } else {
        onAddLog('⚠️ Conexión con Firebase Firestore no disponible o en modo sin conexión.', 'err');
        onToast('⚠️ No se pudo verificar Firebase', 'warning');
      }
    } catch (e: any) {
      onAddLog(`❌ Error en Firebase: ${e.message || String(e)}`, 'err');
      onToast('❌ Error al conectar con Firebase', 'error');
    } finally {
      setTestingFirebase(false);
    }
  };

  const handlePushToFirebase = async () => {
    setSyncingFirebase(true);
    onAddLog('🔥 Subiendo datos locales a Firebase Firestore...', 'info');
    try {
      const payload = {
        trabajadores: JSON.parse(localStorage.getItem('recojoFrutosTrabajadores') || '[]'),
        programas: JSON.parse(localStorage.getItem('recojoFrutosProgramas') || '[]'),
        programaGeneral: JSON.parse(localStorage.getItem('recojoFrutosProgramaGeneral') || '[]'),
        detalleJabas: JSON.parse(localStorage.getItem('recojoFrutosDetalleJabas') || '[]'),
        validaciones: JSON.parse(localStorage.getItem('recojoFrutosValidaciones') || '[]'),
        grupos: JSON.parse(localStorage.getItem('recojoFrutosGrupos') || '[]'),
        lideres: JSON.parse(localStorage.getItem('recojoFrutosLideres') || '[]'),
        usuarios: JSON.parse(localStorage.getItem('recojoFrutosUsuarios') || '[]'),
      };
      await syncAllDataToFirestore(payload);
      onAddLog('✅ Datos sincronizados y guardados en Firebase Firestore con éxito', 'ok');
      onToast('✅ Sincronizado con Firebase Firestore', 'success');
    } catch (e: any) {
      onAddLog(`❌ Error al subir a Firebase: ${e.message || String(e)}`, 'err');
      onToast('❌ Error al sincronizar con Firebase', 'error');
    } finally {
      setSyncingFirebase(false);
    }
  };

  const handlePullFromFirebase = async () => {
    setSyncingFirebase(true);
    onAddLog('🔥 Descargando datos desde Firebase Firestore...', 'info');
    try {
      const data = await fetchAllDataFromFirestore();
      if (data && onDataLoadedFromCloud) {
        onDataLoadedFromCloud(data);
        onAddLog('✅ Datos de Firebase Firestore aplicados con éxito al sistema local', 'ok');
        onToast('✅ Datos descargados de Firebase', 'success');
      } else if (!data) {
        onAddLog('ℹ️ No se encontraron datos en Firebase Firestore aún. Puedes hacer "Subir Todo".', 'info');
        onToast('ℹ️ Firebase sin datos previos', 'info');
      }
    } catch (e: any) {
      onAddLog(`❌ Error al descargar de Firebase: ${e.message || String(e)}`, 'err');
      onToast('❌ Error al consultar Firebase', 'error');
    } finally {
      setSyncingFirebase(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      onAddLog(`✅ Sesión iniciada con Google en Firebase: ${user.email}`, 'ok');
      onToast(`✅ Conectado como ${user.email}`, 'success');
    } catch (e: any) {
      const code = e?.code || '';
      const msg = e?.message || String(e);
      let userFriendlyMsg = 'No se completó el inicio con Google.';

      if (code === 'auth/unauthorized-domain') {
        userFriendlyMsg = 'Dominio no autorizado en Firebase Console (Authentication > Sign-in method > Authorized domains).';
        onAddLog(`⚠️ Firebase Auth: El dominio actual no está en la lista de "Authorized Domains" de Firebase Console. Agrega este dominio en la consola de Firebase o usa la app directamente (Firestore funciona sin requerir login).`, 'err');
      } else if (code === 'auth/popup-blocked') {
        userFriendlyMsg = 'El navegador bloqueó la ventana emergente. Ábrela en una pestaña nueva o permite popups.';
        onAddLog(`⚠️ Ventana emergente bloqueada por el navegador o por el visor (iframe).`, 'err');
      } else if (code === 'auth/popup-closed-by-user') {
        userFriendlyMsg = 'Se cerró la ventana de Google antes de finalizar.';
        onAddLog(`ℹ️ Ventana de inicio de sesión cerrada por el usuario.`, 'info');
      } else if (code === 'auth/operation-not-allowed') {
        userFriendlyMsg = 'El proveedor Google no está habilitado en Firebase Authentication.';
        onAddLog(`⚠️ Ve a Firebase Console > Authentication > Sign-in method y habilita "Google".`, 'err');
      } else {
        onAddLog(`⚠️ Error al autenticar con Google (${code || 'desconocido'}): ${msg}`, 'err');
      }

      onToast(`⚠️ ${userFriendlyMsg}`, 'warning');
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      const user = await signInGuest();
      onAddLog(`✅ Conectado a Firebase en modo invitado/dispositivo: ${user.uid.slice(0, 8)}...`, 'ok');
      onToast('✅ Conectado a Firebase', 'success');
    } catch (e: any) {
      onAddLog(`⚠️ Error en modo invitado: ${e.message || String(e)}`, 'err');
      onToast('⚠️ No se pudo conectar como invitado', 'warning');
    }
  };

  const handleFirebaseLogout = async () => {
    try {
      await firebaseLogOut();
      onAddLog('Sesión de Google en Firebase cerrada.', 'info');
      onToast('Sesión de Firebase cerrada', 'info');
    } catch (e: any) {
      onToast('Error al cerrar sesión', 'error');
    }
  };

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
      {/* Firebase Firestore Cloud Card */}
      <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-emerald-500/10 rounded-2xl shadow-sm border border-amber-300/60 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-amber-200/60 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-950 flex items-center gap-2">
                Firebase Firestore Cloud
                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Activo
                </span>
              </h2>
              <p className="text-xs text-amber-900/80">
                Base de datos en la nube en tiempo real (Proyecto: <strong>recojo-fruto-campo</strong> · Región: <strong>us-east1</strong>)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {firebaseUser ? (
              <div className="flex items-center gap-2 bg-white/90 border border-amber-300 px-3 py-1 rounded-full text-xs font-semibold text-amber-900 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="max-w-[160px] truncate">{firebaseUser.email || `Dispositivo (${firebaseUser.uid.slice(0, 6)})`}</span>
                <button
                  onClick={handleFirebaseLogout}
                  className="text-amber-800 hover:text-red-700 ml-1 font-bold cursor-pointer"
                  title="Cerrar sesión de Firebase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleGoogleSignIn}
                  className="bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Iniciar sesión con tu cuenta de Google"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-600" />
                  <span>Acceder con Google</span>
                </button>
                <button
                  onClick={handleAnonymousSignIn}
                  className="bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                  title="Conectar sesión de este dispositivo a Firebase"
                >
                  <span>Conectar Dispositivo</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Firebase Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          <button
            onClick={handlePushToFirebase}
            disabled={syncingFirebase}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <UploadCloud className={`w-4 h-4 ${syncingFirebase ? 'animate-bounce' : ''}`} />
            <span>🔥 Subir Todo a Firebase</span>
          </button>

          <button
            onClick={handlePullFromFirebase}
            disabled={syncingFirebase}
            className="bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <DownloadCloud className={`w-4 h-4 ${syncingFirebase ? 'animate-bounce' : ''}`} />
            <span>📥 Descargar de Firebase</span>
          </button>

          <button
            onClick={handleTestFirebase}
            disabled={testingFirebase}
            className="bg-white hover:bg-gray-50 border border-amber-300 text-amber-950 p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${testingFirebase ? 'animate-spin text-amber-600' : ''}`} />
            <span>🔍 Probar Firebase</span>
          </button>
        </div>

        <div className="bg-white/60 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2">
          <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Sincronización en vivo:</strong> Cualquier escaneo de jabas, validación de supervisor o cambio en el programa se sincroniza de forma automática con Firestore para que todos los dispositivos vean los mismos datos al instante.
          </p>
        </div>
      </div>

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

