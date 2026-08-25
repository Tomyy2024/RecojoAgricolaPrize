/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserSession, 
  TabId, 
  Programa, 
  ProgramaGeneral, 
  Trabajador, 
  DetalleJaba, 
  Usuario, 
  Lider, 
  SyncLogEntry,
  ValidacionSupervisor,
  DeviceViewMode
} from './types';
import { 
  initializeStorage, 
  resetAllData,
  getSession, 
  saveSession, 
  clearSession, 
  getProgramas, 
  saveProgramas, 
  getProgramaGeneral, 
  saveProgramaGeneral, 
  getTrabajadores, 
  saveTrabajadores, 
  getDetalleJabas, 
  saveDetalleJabas, 
  getUsuarios, 
  saveUsuarios, 
  getGrupos, 
  saveGrupos,
  getLideres, 
  saveLideres,
  getValidaciones,
  saveValidaciones,
  saveSingleValidacion,
  getGsheetUrl, 
  isAutoSyncEnabled, 
  getLastSyncTime, 
  setLastSyncTime, 
  getFirebaseConfig 
} from './utils/storage';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LoginScreen } from './components/LoginScreen';
import { ProgramaGeneralTab } from './components/ProgramaGeneralTab';
import { ProgramaWizardTab } from './components/ProgramaWizardTab';
import { TrabajadoresTab } from './components/TrabajadoresTab';
import { ValidacionTab } from './components/ValidacionTab';
import { DashboardTab } from './components/DashboardTab';
import { ReportesTab } from './components/ReportesTab';
import { UsuariosTab } from './components/UsuariosTab';
import { ImportarTab } from './components/ImportarTab';
import { ConexionTab } from './components/ConexionTab';
import { ShareAppModal } from './components/ShareAppModal';
import { Toast, ToastMessage } from './components/Toast';

export default function App() {
  // Initialize storage defaults on first load
  useEffect(() => {
    initializeStorage();
  }, []);

  // State
  const [session, setSession] = useState<UserSession | null>(() => getSession());
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const initialSession = getSession();
    if (initialSession?.rol === 'Trabajador') return 'trabajadores';
    return 'programaGeneral';
  });

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [deviceMode, setDeviceMode] = useState<DeviceViewMode>(() => {
    const saved = localStorage.getItem('app_device_view_mode');
    return (saved === 'celular' || saved === 'pc') ? saved : 'pc';
  });

  const handleDeviceModeChange = (mode: DeviceViewMode) => {
    setDeviceMode(mode);
    localStorage.setItem('app_device_view_mode', mode);
    addToast(mode === 'celular' ? '📱 Modo Celular activado (Vista compacta)' : '💻 Modo PC activado (Pantalla completa)', 'info');
  };

  // Guard active tab according to role changes
  useEffect(() => {
    if (!session) return;
    if (session.rol === 'Trabajador' && activeTab !== 'trabajadores') {
      setActiveTab('trabajadores');
    } else if (
      session.rol === 'Supervisor' &&
      !['programaGeneral', 'programa', 'validacion'].includes(activeTab)
    ) {
      setActiveTab('programaGeneral');
    }
  }, [session, activeTab]);

  // Application Data States
  const [programas, setProgramasState] = useState<Programa[]>(() => getProgramas());
  const [programaGeneral, setProgramaGeneralState] = useState<ProgramaGeneral[]>(() => getProgramaGeneral());
  const [trabajadores, setTrabajadoresState] = useState<Trabajador[]>(() => getTrabajadores());
  const [detalleJabas, setDetalleJabasState] = useState<DetalleJaba[]>(() => getDetalleJabas());
  const [usuarios, setUsuariosState] = useState<Usuario[]>(() => getUsuarios());
  const [grupos, setGruposState] = useState<string[]>(() => getGrupos());
  const [lideres, setLideresState] = useState<Lider[]>(() => getLideres());
  const [validaciones, setValidacionesState] = useState<ValidacionSupervisor[]>(() => getValidaciones());

  // Cloud Sync & Logging States
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncTime());
  const [logs, setLogs] = useState<SyncLogEntry[]>([
    {
      id: 'log_0',
      timestamp: new Date().toLocaleTimeString(),
      mensaje: 'Sistema iniciado correctamente en modo almacenamiento local offline.',
      tipo: 'info'
    }
  ]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Helpers
  const addToast = useCallback((text: string, type?: 'success' | 'error' | 'warning' | 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const addLog = useCallback((mensaje: string, tipo: 'ok' | 'err' | 'info' = 'info') => {
    const newLog: SyncLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      mensaje,
      tipo
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  }, []);

  // Centralized Server Data Fetcher (Synchronizes all PCs and Users in Real-Time)
  const fetchCentralizedData = useCallback(async (silent = false) => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.status === 'ok' && json.data) {
        const d = json.data;
        if (Array.isArray(d.programas)) {
          setProgramasState(d.programas);
          saveProgramas(d.programas);
        }
        if (Array.isArray(d.programaGeneral)) {
          setProgramaGeneralState(d.programaGeneral);
          saveProgramaGeneral(d.programaGeneral);
        }
        if (Array.isArray(d.trabajadores)) {
          const seenDni = new Set<string>();
          const uniqueWorkers: Trabajador[] = [];
          d.trabajadores.forEach((t: Trabajador) => {
            const cleanDni = String(t.dni || '').trim();
            if (cleanDni && !seenDni.has(cleanDni)) {
              seenDni.add(cleanDni);
              uniqueWorkers.push(t);
            }
          });
          setTrabajadoresState(uniqueWorkers);
          saveTrabajadores(uniqueWorkers);
        }
        if (Array.isArray(d.detalleJabas)) {
          setDetalleJabasState(d.detalleJabas);
          saveDetalleJabas(d.detalleJabas);
        }
        if (Array.isArray(d.validaciones)) {
          setValidacionesState(d.validaciones);
          saveValidaciones(d.validaciones);
        }
        if (Array.isArray(d.usuarios) && d.usuarios.length > 0) {
          setUsuariosState(d.usuarios);
          saveUsuarios(d.usuarios);
        }
        if (Array.isArray(d.lideres)) {
          setLideresState(d.lideres);
          saveLideres(d.lideres);
        }
        if (!silent) {
          addLog('🟢 Datos sincronizados en vivo con el servidor central', 'ok');
        }
      }
    } catch {
      // Offline fallback to local state
    }
  }, [addLog]);

  // Server Sync Mutation Trigger
  const syncToServer = useCallback(async (payloadOverride?: any) => {
    try {
      const payload = payloadOverride || {
        programas: getProgramas(),
        programaGeneral: getProgramaGeneral(),
        trabajadores: getTrabajadores(),
        detalleJabas: getDetalleJabas(),
        usuarios: getUsuarios(),
        validaciones: getValidaciones(),
        lideres: getLideres()
      };
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Server sync offline:', e);
    }
  }, []);

  // Periodic Polling and Window Focus listener to keep all connected PCs up to date
  useEffect(() => {
    fetchCentralizedData(false);
    const interval = setInterval(() => {
      fetchCentralizedData(true);
    }, 4000);

    const onFocus = () => fetchCentralizedData(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchCentralizedData]);

  // Background Auto-fetch from Google Sheets if configured
  useEffect(() => {
    const autoPullOnStart = async () => {
      const url = getGsheetUrl();
      if (!url) return;
      try {
        const res = await fetch(`${url}?accion=export`);
        if (!res.ok) return;
        const json = await res.json();
        if (json && json.status === 'ok' && json.data) {
          const d = json.data;
          if (Array.isArray(d.programas) && d.programas.length > 0) {
            setProgramasState(d.programas);
            saveProgramas(d.programas);
          }
          if (Array.isArray(d.programaGeneral) && d.programaGeneral.length > 0) {
            setProgramaGeneralState(d.programaGeneral);
            saveProgramaGeneral(d.programaGeneral);
          }
          if (Array.isArray(d.trabajadores) && d.trabajadores.length > 0) {
            const seenDni = new Set<string>();
            const uniqueWorkers: Trabajador[] = [];
            d.trabajadores.forEach((t: Trabajador) => {
              const cleanDni = String(t.dni || '').trim();
              if (cleanDni && !seenDni.has(cleanDni)) {
                seenDni.add(cleanDni);
                uniqueWorkers.push(t);
              }
            });
            setTrabajadoresState(uniqueWorkers);
            saveTrabajadores(uniqueWorkers);
          }
          if (Array.isArray(d.detalleJabas) && d.detalleJabas.length > 0) {
            setDetalleJabasState(d.detalleJabas);
            saveDetalleJabas(d.detalleJabas);
          }
          if (Array.isArray(d.validaciones) && d.validaciones.length > 0) {
            setValidacionesState(d.validaciones);
            saveValidaciones(d.validaciones);
          }
          const nowIso = new Date().toISOString();
          setLastSyncTime(nowIso);
          setLastSync(nowIso);
          addLog('☁️ Datos sincronizados automáticamente con Google Sheets', 'ok');
          syncToServer();
        }
      } catch {
        // Silently use offline cache
      }
    };
    autoPullOnStart();
  }, [addLog, syncToServer]);

  // Background Auto-Sync Trigger
  const triggerAutoSync = useCallback(async (actionName: string, updatedPayload?: any) => {
    // 1. Always sync immediately to Central Server so other PCs see it instantly
    syncToServer(updatedPayload);

    // 2. Also sync to Google Sheets if configured
    if (!isAutoSyncEnabled()) return;
    const url = getGsheetUrl();
    if (!url) return;

    try {
      addLog(`⚡ Auto-guardado en curso (${actionName})...`, 'info');
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          accion: 'sync',
          data: {
            programas: getProgramas(),
            programaGeneral: getProgramaGeneral(),
            trabajadores: getTrabajadores(),
            detalleJabas: getDetalleJabas(),
            usuarios: getUsuarios(),
            validaciones: getValidaciones()
          }
        })
      });

      const nowIso = new Date().toISOString();
      setLastSyncTime(nowIso);
      setLastSync(nowIso);
      addLog(`✅ Auto-guardado completado en Google Sheets (${actionName})`, 'ok');
    } catch {
      addLog(`⏳ Sin conexión con Google Sheets: cambio guardado localmente en dispositivo.`, 'err');
    }
  }, [addLog, syncToServer]);

  // Reset all test data (Clean start)
  const handleResetAllData = useCallback(async () => {
    resetAllData();
    setTrabajadoresState([]);
    setProgramasState([]);
    setProgramaGeneralState([]);
    setDetalleJabasState([]);
    setValidacionesState([]);

    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {
      console.warn('Reset server api error:', e);
    }

    addToast('🧹 Base de datos limpiada correctamente. Sin datos de prueba.', 'success');
    addLog('🧹 Base de datos reiniciada a cero (sin registros de prueba)', 'ok');
  }, [addToast, addLog]);


  // Handlers
  const handleLogin = (userSession: UserSession) => {
    saveSession(userSession);
    setSession(userSession);
    if (userSession.rol === 'Trabajador') {
      setActiveTab('trabajadores');
    } else {
      setActiveTab('programaGeneral');
    }
    addLog(`👤 Sesión iniciada: ${userSession.nombre} (${userSession.rol})`, 'ok');
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    addToast('ℹ️ Sesión finalizada');
  };

  const handleSavePrograma = (newPrograma: Programa) => {
    const updated = [newPrograma, ...programas];
    setProgramasState(updated);
    saveProgramas(updated);
    addLog(`📋 Nuevo Programa registrado: ${newPrograma.id} (${newPrograma.fundo} - ${newPrograma.modulo})`, 'ok');
    triggerAutoSync('Nuevo Programa');
  };

  const handleSaveProgramaGeneral = (list: ProgramaGeneral[]) => {
    setProgramaGeneralState(list);
    saveProgramaGeneral(list);
    addLog(`🌾 Programa General actualizado (${list.length} registros)`, 'ok');
    triggerAutoSync('Programa General');
  };

  const handleSaveAvance = (avanceMap: Record<string, number>, newDetalleList: DetalleJaba[]) => {
    const mergedDetalle = [...newDetalleList, ...detalleJabas];
    setDetalleJabasState(mergedDetalle);
    saveDetalleJabas(mergedDetalle);

    // Update worker current group in state based on new dynamic assignment
    const groupUpdates: Record<string, string> = {};
    newDetalleList.forEach((d) => {
      if (d.dni && d.grupo) {
        groupUpdates[d.dni] = d.grupo;
      }
    });

    if (Object.keys(groupUpdates).length > 0) {
      const updatedWorkers = trabajadores.map((t) => {
        if (groupUpdates[t.dni]) {
          return { ...t, grupo: groupUpdates[t.dni] };
        }
        return t;
      });
      setTrabajadoresState(updatedWorkers);
      saveTrabajadores(updatedWorkers);
    }

    // Also update in latest programa if available
    if (programas.length > 0) {
      const updatedProg = [...programas];
      updatedProg[0] = {
        ...updatedProg[0],
        avance: { ...(updatedProg[0].avance || {}), ...avanceMap }
      };
      setProgramasState(updatedProg);
      saveProgramas(updatedProg);
    }

    addLog(`📊 Avance de jabas registrado (${newDetalleList.length} registros)`, 'ok');
    triggerAutoSync('Avance Jabas');
  };

  const handleSaveUsuarios = (updatedUsuarios: Usuario[]) => {
    setUsuariosState(updatedUsuarios);
    saveUsuarios(updatedUsuarios);
    addLog(`🔐 Nómina de usuarios actualizada (${updatedUsuarios.length} usuarios)`, 'ok');
    triggerAutoSync('Gestión Usuarios');
  };

  const handleSaveLider = (newLider: Lider) => {
    const updated = [newLider, ...lideres.filter((l) => !(l.dni === newLider.dni && l.grupo === newLider.grupo))];
    setLideresState(updated);
    saveLideres(updated);

    // Update worker role/leader tag if exists
    const updatedWorkers = trabajadores.map((t) => {
      if (t.dni === newLider.dni) {
        return { ...t, lider: newLider.lider, grupo: newLider.grupo, tipo: 'Líder' };
      }
      return t;
    });
    setTrabajadoresState(updatedWorkers);
    saveTrabajadores(updatedWorkers);

    addLog(`👑 Líder registrado: ${newLider.lider} en ${newLider.grupo}`, 'ok');
    triggerAutoSync('Registro Líder');
  };

  const handleSaveGrupo = (newGrupo: string) => {
    const clean = newGrupo.trim();
    if (!clean) return;
    if (!grupos.includes(clean)) {
      const updated = [...grupos, clean];
      setGruposState(updated);
      saveGrupos(updated);
      addLog(`👥 Nuevo Grupo registrado: ${clean}`, 'ok');
      triggerAutoSync('Registro Grupo', { grupos: updated });
    }
  };

  const handleSaveSupervisor = (supervisorName: string) => {
    const cleanName = supervisorName.trim();
    if (!cleanName) return;
    const exists = usuarios.some((u) => u.nombre.toLowerCase() === cleanName.toLowerCase());
    let updatedUsuarios = usuarios;
    if (!exists) {
      const generatedUser = cleanName.toLowerCase().replace(/\s+/g, '.').slice(0, 15);
      const newUser: Usuario = {
        user: generatedUser || `sup.${Date.now().toString().slice(-4)}`,
        pass: 'super123',
        nombre: cleanName,
        rol: 'Supervisor',
        creado: new Date().toISOString().slice(0, 10)
      };
      updatedUsuarios = [newUser, ...usuarios];
      setUsuariosState(updatedUsuarios);
      saveUsuarios(updatedUsuarios);
    }
    addLog(`👤 Nuevo Supervisor registrado: ${cleanName}`, 'ok');
    triggerAutoSync('Registro Supervisor', { usuarios: updatedUsuarios });
  };

  const handleSaveValidacion = (newValidacion: ValidacionSupervisor) => {
    const updated = saveSingleValidacion(newValidacion);
    setValidacionesState(updated);
    addLog(`📋 Validación oficial registrada: ${newValidacion.supervisor} - ${newValidacion.fundo} ${newValidacion.modulo} (${newValidacion.trabajadoresConformes} conformes / ${newValidacion.jabasConformes} jabas)`, 'ok');
    triggerAutoSync('Validación por Supervisor');
  };

  const handleImportTrabajadores = (newWorkers: Trabajador[]) => {
    const combined = [...newWorkers, ...trabajadores];
    const seenDni = new Set<string>();
    const uniqueWorkers: Trabajador[] = [];
    combined.forEach((t) => {
      const cleanDni = String(t.dni || '').trim();
      if (cleanDni && !seenDni.has(cleanDni)) {
        seenDni.add(cleanDni);
        uniqueWorkers.push(t);
      }
    });
    setTrabajadoresState(uniqueWorkers);
    saveTrabajadores(uniqueWorkers);
    addLog(`📥 Importados ${newWorkers.length} trabajadores a la nómina`, 'ok');
    triggerAutoSync('Importar Trabajadores');
  };

  const handleManualSyncPush = async () => {
    const url = getGsheetUrl();
    if (!url) {
      addToast('⚠️ Configura una URL de Web App primero');
      return;
    }

    addLog('📤 Iniciando subida manual completa a Google Sheets...', 'info');
    try {
      const payload = {
        accion: 'sync',
        data: {
          programas,
          programaGeneral,
          trabajadores,
          detalleJabas,
          usuarios,
          validaciones
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // Not JSON - might be HTML error from Google
      }

      if (responseJson && responseJson.status === 'ok') {
        const nowIso = new Date().toISOString();
        setLastSyncTime(nowIso);
        setLastSync(nowIso);
        addLog(`✅ Datos subidos y confirmados por Google Sheets (${responseJson.message || 'Sincronizado'})`, 'ok');
        addToast('✅ Subida a Google Sheets completada');
      } else if (responseJson && responseJson.status === 'error') {
        addLog(`❌ Error en Google Apps Script: ${responseJson.message}`, 'err');
        addToast('❌ Error en script de Google Sheets', 'error');
      } else if (responseText.includes('ScanTrabajadores')) {
        addLog('⚠️ Tu Apps Script tiene un código anterior ("ScanTrabajadores"). Copia el código oficial de la pestaña NUBE y haz clic en Implementar > Nueva Implementación.', 'err');
        addToast('⚠️ Debes actualizar el código en Apps Script', 'warning');
      } else if (responseText.includes('<!DOCTYPE html>') || responseText.includes('Page Not Found') || responseText.includes('unable to open')) {
        addLog('❌ Error de permisos de Google Apps Script: En Apps Script, ve a Implementar > Nueva Implementación y pon "Quién tiene acceso: Cualquier usuario (Anyone)".', 'err');
        addToast('❌ Permisos incorrectos en Google Apps Script', 'error');
      } else {
        const nowIso = new Date().toISOString();
        setLastSyncTime(nowIso);
        setLastSync(nowIso);
        addLog(`⚠️ Respuesta inesperada de Google Sheets (HTTP ${res.status}): ${responseText.slice(0, 100)}`, 'err');
        addToast('⚠️ Respuesta inesperada de Google Sheets', 'warning');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error de red';
      addLog(`❌ Error en subida manual: ${errorMsg}`, 'err');
      addToast('❌ Error al subir datos');
    }
  };

  const handleManualSyncPull = async () => {
    const url = getGsheetUrl();
    if (!url) {
      addToast('⚠️ Configura una URL de Web App primero');
      return;
    }

    addLog('📥 Descargando datos consolidados desde Google Sheets...', 'info');
    try {
      const res = await fetch(`${url}?accion=export`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json && json.status === 'ok' && json.data) {
        const d = json.data;
        if (Array.isArray(d.programas) && d.programas.length > 0) {
          setProgramasState(d.programas);
          saveProgramas(d.programas);
        }
        if (Array.isArray(d.programaGeneral) && d.programaGeneral.length > 0) {
          setProgramaGeneralState(d.programaGeneral);
          saveProgramaGeneral(d.programaGeneral);
        }
        if (Array.isArray(d.trabajadores) && d.trabajadores.length > 0) {
          setTrabajadoresState(d.trabajadores);
          saveTrabajadores(d.trabajadores);
        }
        if (Array.isArray(d.detalleJabas) && d.detalleJabas.length > 0) {
          setDetalleJabasState(d.detalleJabas);
          saveDetalleJabas(d.detalleJabas);
        }
        if (Array.isArray(d.validaciones) && d.validaciones.length > 0) {
          setValidacionesState(d.validaciones);
          saveValidaciones(d.validaciones);
        }

        const nowIso = new Date().toISOString();
        setLastSyncTime(nowIso);
        setLastSync(nowIso);
        addLog('✅ Datos sincronizados y actualizados en este dispositivo', 'ok');
        addToast('✅ Descarga desde Google Sheets completada');
      } else {
        throw new Error('Respuesta no válida');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error de red';
      addLog(`❌ Error en descarga: ${errorMsg}`, 'err');
      addToast('❌ No se pudo descargar desde Google Sheets');
    }
  };

  // If unauthenticated, show field-ready login
  if (!session) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} onToast={addToast} />
        <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </>
    );
  }

  const fbConfig = getFirebaseConfig();

  return (
    <div className={`min-h-screen bg-[#f0f2f5] text-[#212121] pb-24 flex flex-col font-sans transition-all duration-300 ${
      deviceMode === 'celular' ? 'bg-[#e0e0e0]/70' : 'bg-[#f5f5f5]'
    }`}>
      {/* Sticky Header */}
      <Header
        session={session}
        onLogout={handleLogout}
        lastSync={lastSync}
        firebaseConnected={!!fbConfig}
        autoSyncActive={isAutoSyncEnabled()}
        onRefresh={() => fetchCentralizedData(false)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        deviceMode={deviceMode}
        onChangeDeviceMode={handleDeviceModeChange}
      />

      {/* Sub Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userRole={session.rol}
        deviceMode={deviceMode}
      />

      {/* Main Container */}
      <main className={`w-full mx-auto flex-1 transition-all duration-300 ${
        deviceMode === 'celular'
          ? 'max-w-md px-3 pt-3'
          : 'max-w-6xl px-3 sm:px-6 pt-4 sm:pt-6'
      }`}>
        {/* Helper Banner when Modo Celular is active on larger screens */}
        {deviceMode === 'celular' && (
          <div className="hidden sm:flex items-center justify-between bg-emerald-900 text-white px-3 py-1.5 rounded-xl text-xs shadow-sm mb-3 border border-emerald-700/50">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-sm">📱</span>
              <span>Vista Modo Celular Activa (Ancho 448px)</span>
            </div>
            <button
              onClick={() => handleDeviceModeChange('pc')}
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[11px] transition-all cursor-pointer"
            >
              Cambiar a Modo PC
            </button>
          </div>
        )}

        {activeTab === 'programaGeneral' && (
          <ProgramaGeneralTab
            session={session}
            programasGenerales={programaGeneral}
            onSave={handleSaveProgramaGeneral}
            onToast={addToast}
          />
        )}

        {activeTab === 'programa' && (
          <ProgramaWizardTab
            session={session}
            onSavePrograma={handleSavePrograma}
            onToast={addToast}
          />
        )}

        {activeTab === 'trabajadores' && (
          <TrabajadoresTab
            session={session}
            trabajadores={trabajadores}
            grupos={grupos}
            lideres={lideres}
            usuarios={usuarios}
            onSaveLider={handleSaveLider}
            onSaveSupervisor={handleSaveSupervisor}
            onSaveGrupo={handleSaveGrupo}
            onSaveAvance={handleSaveAvance}
            onToast={addToast}
          />
        )}

        {activeTab === 'validacion' && (
          <ValidacionTab
            session={session}
            trabajadores={trabajadores}
            detalleJabas={detalleJabas}
            programas={programas}
            lideres={lideres}
            validaciones={validaciones}
            grupos={grupos}
            onSaveValidacion={handleSaveValidacion}
            onToast={addToast}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            programas={programas}
            detalleJabas={detalleJabas}
            trabajadores={trabajadores}
            validaciones={validaciones}
          />
        )}

        {activeTab === 'reportes' && (
          <ReportesTab
            programas={programas}
            detalleJabas={detalleJabas}
            trabajadores={trabajadores}
            onToast={addToast}
          />
        )}

        {activeTab === 'usuarios' && (
          <UsuariosTab
            usuarios={usuarios}
            onSaveUsuarios={handleSaveUsuarios}
            onToast={addToast}
          />
        )}

        {activeTab === 'importar' && (
          <ImportarTab
            trabajadores={trabajadores}
            onImportTrabajadores={handleImportTrabajadores}
            onToast={addToast}
          />
        )}

        {activeTab === 'conexion' && (
          <ConexionTab
            logs={logs}
            onAddLog={addLog}
            onManualSyncPush={handleManualSyncPush}
            onManualSyncPull={handleManualSyncPull}
            onToast={addToast}
            onResetData={handleResetAllData}
          />
        )}
      </main>

      {/* Share Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onToast={addToast}
      />

      {/* Global Toast Feedback */}
      <Toast
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
