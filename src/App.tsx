/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  DeviceViewMode,
  ReservaCuadrilla,
  ProgramacionDiaria
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
  getProgramacionesDiarias,
  saveProgramacionesDiarias,
  deleteProgramacionDiariaFromStorage,
  getTrabajadores, 
  saveTrabajadores, 
  getDetalleJabas, 
  saveDetalleJabas, 
  sanitizeAndDeduplicateDetalleJabas,
  sanitizeAndDeduplicateTrabajadores,
  getUsuarios, 
  saveUsuarios, 
  getGrupos, 
  saveGrupos,
  getLideres, 
  saveLideres,
  getModulosPorFundo,
  saveModulosPorFundo,
  addModuloToFundo,
  getLocalToday,
  getValidaciones,
  saveValidaciones,
  saveSingleValidacion,
  getReservas,
  saveReservas,
  saveSingleReserva,
  mergeReservasArrays,
  getGsheetUrl, 
  isAutoSyncEnabled, 
  getLastSyncTime, 
  setLastSyncTime, 
  getFirebaseConfig,
  cleanValidacionesList,
  purgeAllEmptyRecords,
  normalizeSupervisorKey,
  getAuditoriaIngresos,
  saveAuditoriaIngresos,
  mergeAuditoriasArrays,
  isOfflineNominaLocked,
  setOfflineNominaLocked,
  restoreTrabajadoresFromOfflineCache,
  depurarTrabajadoresDiaAnterior,
  normalizeDateString,
  replicarTrabajadoresAlSheet,
  replicarAvanceAlSheet,
  getNominaTimestamp,
  setNominaTimestamp,
  getNominaVersion,
  setNominaVersion
} from './utils/storage';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LoginScreen } from './components/LoginScreen';
import { ProgramaGeneralTab } from './components/ProgramaGeneralTab';
import { ProgramacionDiariaTab } from './components/ProgramacionDiariaTab';
import { ProgramaWizardTab } from './components/ProgramaWizardTab';
import { TrabajadoresTab } from './components/TrabajadoresTab';
import { ValidacionTab } from './components/ValidacionTab';
import { DashboardTab } from './components/DashboardTab';
import { ReportesTab } from './components/ReportesTab';
import { UsuariosTab } from './components/UsuariosTab';
import { ImportarTab } from './components/ImportarTab';
import { GruposLideresTab } from './components/GruposLideresTab';
import { ConexionTab } from './components/ConexionTab';
import { ShareAppModal } from './components/ShareAppModal';
import { InstructivoModal } from './components/InstructivoModal';
import { Toast, ToastMessage } from './components/Toast';
import { 
  subscribeToFirestoreMasterData, 
  syncAllDataToFirestore,
  fetchAllDataFromFirestore
} from './lib/firebase';

export default function App() {
  // Initialize storage defaults on first load
  useEffect(() => {
    initializeStorage();
  }, []);

  // State
  const [session, setSession] = useState<UserSession | null>(() => {
    // If opened via shared link, preview link or explicit login param, strictly enforce login screen
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isSharedOrPreview = 
        params.get('shared') === '1' || 
        params.get('login') === '1' || 
        params.get('auth') === '1' ||
        window.location.hostname.includes('ais-pre-');

      if (isSharedOrPreview) {
        clearSession();
        return null;
      }
    }
    return getSession();
  });
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const initialSession = getSession();
    if (initialSession?.rol === 'Trabajador') return 'trabajadores';
    if (initialSession?.rol === 'Jefe') return 'dashboard';
    return 'programaGeneral';
  });

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [showInstructivoModal, setShowInstructivoModal] = useState<boolean>(false);
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
    } else if (session.rol === 'Jefe' && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    } else if (
      session.rol === 'Supervisor' &&
      !['programaGeneral', 'programacionDiaria', 'programa', 'trabajadores', 'validacion', 'gruposLideres'].includes(activeTab)
    ) {
      setActiveTab('programaGeneral');
    }
  }, [session, activeTab]);

  // Application Data States
  const [programas, setProgramasState] = useState<Programa[]>(() => getProgramas());
  const [programaGeneral, setProgramaGeneralState] = useState<ProgramaGeneral[]>(() => getProgramaGeneral());
  const [programacionesDiarias, setProgramacionesDiariasState] = useState<ProgramacionDiaria[]>(() => getProgramacionesDiarias());
  const [initialProgramacionForEjecucion, setInitialProgramacionForEjecucion] = useState<ProgramacionDiaria | null>(null);
  const [trabajadores, setTrabajadoresState] = useState<Trabajador[]>(() => getTrabajadores());
  const [detalleJabas, setDetalleJabasState] = useState<DetalleJaba[]>(() => getDetalleJabas());
  const [usuarios, setUsuariosState] = useState<Usuario[]>(() => getUsuarios());
  const [grupos, setGruposState] = useState<string[]>(() => getGrupos());
  const [lideres, setLideresState] = useState<Lider[]>(() => getLideres());
  const [modulosPorFundo, setModulosPorFundo] = useState<Record<string, string[]>>(() => getModulosPorFundo());
  const [validaciones, setValidacionesState] = useState<ValidacionSupervisor[]>(() => getValidaciones());
  const [reservas, setReservasState] = useState<ReservaCuadrilla[]>(() => getReservas());

  // Offline Nomina Lock & Network Status (Paso 1 & Paso 2)
  const [offlineNomina, setOfflineNomina] = useState<boolean>(() => isOfflineNominaLocked());
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Cloud Sync & Logging States
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncTime());
  const [logs, setLogs] = useState<SyncLogEntry[]>([
    {
      id: 'log_0',
      timestamp: new Date().toLocaleTimeString(),
      mensaje: 'Sistema iniciado correctamente. Sincronización en tiempo real activa.',
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

  // Handlers for Offline Nomina Mode (Paso 2)
  const handleToggleOfflineNomina = useCallback((explicitVal?: boolean) => {
    setOfflineNomina((prev) => {
      const nextVal = typeof explicitVal === 'boolean' ? explicitVal : !prev;
      setOfflineNominaLocked(nextVal);
      if (nextVal) {
        addToast('🔒 Modo Offline Nómina ACTIVO: Trabajadores blindados contra pérdida de señal.', 'success');
        addLog('🔒 Modo Offline Nómina activado: Los trabajadores cargados quedan fijos en el dispositivo y no se re-sincronizarán.', 'ok');
      } else {
        addToast('🌐 Modo Online Nómina: Sincronización de trabajadores con la nube permitida.', 'info');
        addLog('🌐 Modo Online Nómina activado: Sincronización de trabajadores habilitada.', 'info');
      }
      return nextVal;
    });
  }, [addToast, addLog]);

  const handleRestoreOfflineCache = useCallback(() => {
    const cached = restoreTrabajadoresFromOfflineCache();
    if (cached.length > 0) {
      setTrabajadoresState(cached);
      setOfflineNomina(true);
      addToast(`✅ Copia offline restaurada: ${cached.length} trabajadores listos. Modo Offline activado.`, 'success');
      addLog(`♻️ Nómina restaurada desde el respaldo offline del dispositivo (${cached.length} trabajadores).`, 'ok');
    } else {
      addToast('⚠️ No hay respaldo offline previo de trabajadores guardado en este dispositivo.', 'warning');
    }
  }, [addToast, addLog]);

  // Referencia a syncToServer para que applyServerData pueda sincronizar trabajadores al servidor central sin dependencias circulares
  const syncToServerRef = useRef<(payloadOverride?: any) => Promise<void>>(async () => {});

  // Universal Data Applier from Server/Broadcast
  const applyServerData = useCallback((d: any, silent = true) => {
    if (!d || typeof d !== 'object') return;

    if (Array.isArray(d.programas)) {
      setProgramasState(d.programas);
      saveProgramas(d.programas);
    }
    if (Array.isArray(d.programaGeneral)) {
      setProgramaGeneralState(d.programaGeneral);
      saveProgramaGeneral(d.programaGeneral);
    }
    if (Array.isArray(d.programacionesDiarias) || Array.isArray(d.programacionDiaria)) {
      const pDiarias = d.programacionesDiarias || d.programacionDiaria;
      setProgramacionesDiariasState(pDiarias);
      saveProgramacionesDiarias(pDiarias);
    }
    if (Array.isArray(d.trabajadores)) {
      const isLocked = isOfflineNominaLocked();
      const currentWorkers = getTrabajadores();
      const isExplicitPurge = d.depurado === true || d.forceNominaUpdate === true;
      const activeSession = session || getSession();
      const userRol = activeSession?.rol;
      const isAdmin = userRol === 'Administrador';

      // Detectar si la lista local contiene la semilla de prueba inicial (446 de 2026-09-14)
      const isLocalMockSeed = currentWorkers.length === 446 && currentWorkers[0]?.fecha === '2026-09-14';

      // REGLA AUTORITATIVA DE NÓMINA CENTRAL:
      // La nómina cargada por el Administrador es la fuente de verdad.
      // Los usuarios con rol 'Trabajador' o 'Supervisor' SIEMPRE deben recibir y reflejar
      // la nómina autoritativa del servidor sin que queden bloqueados por caché o semillas viejas.
      const localTimestamp = getNominaTimestamp();
      const serverTimestamp = d.nominaTimestamp ? Number(d.nominaTimestamp) : 0;
      const isStaleServerBroadcast = serverTimestamp > 0 && localTimestamp > 0 && serverTimestamp < localTimestamp;

      const shouldApplyServerWorkers =
        !isStaleServerBroadcast &&
        d.trabajadores.length > 0 &&
        (isAdmin ||
         userRol === 'Trabajador' ||
         userRol === 'Supervisor' ||
         isLocalMockSeed ||
         isExplicitPurge ||
         !isLocked ||
         currentWorkers.length === 0 ||
         d.trabajadores.length !== currentWorkers.length ||
         Boolean(d.nominaVersion));

      if (d.trabajadores.length === 0 && currentWorkers.length > 0 && !isExplicitPurge) {
        // Preservar nómina local si la respuesta es vacía no intencionada (evita parpadeo)
        // Solo el Administrador puede enviar trabajadores al servidor si estuvieran vacíos
        if (isAdmin) {
          syncToServerRef.current({ trabajadores: currentWorkers });
        }
      } else if (shouldApplyServerWorkers) {
        // Mapa de trabajadores locales existentes para preservar grupo y líder si vienen sin definir
        const localWorkersMap = new Map<string, Trabajador>();
        currentWorkers.forEach((lw) => {
          const cDni = String(lw.dni || '').replace(/\s+/g, '').trim();
          if (cDni) localWorkersMap.set(cDni, lw);
          if (lw.id) localWorkersMap.set(lw.id, lw);
        });

        // NUNCA filtrar trabajadores de días anteriores para rol Trabajador: todos los roles reciben la nómina autoritativa
        const rawList = d.trabajadores;

        const seen = new Set<string>();
        const uniqueWorkers: Trabajador[] = [];
        rawList.forEach((t: Trabajador, i: number) => {
          const cleanDni = String(t.dni || '').replace(/\s+/g, '').trim();
          const rawDni = String(t.dni || '').trim();
          const tFecha = t.fecha ? (normalizeDateString(t.fecha) || t.fecha) : '';
          const tModulo = String(t.modulo || 'SM').trim().toUpperCase();
          const key = cleanDni
            ? `${cleanDni}__${tFecha || 's_f'}__${tModulo}`
            : t.id
            ? `${t.id}__${tFecha}__${tModulo}`
            : `idx_${i}__${tFecha}__${tModulo}__${t.nombres}`;

          const existingLocal = (cleanDni ? localWorkersMap.get(cleanDni) : null) || (t.id ? localWorkersMap.get(t.id) : null);
          const grupoFinal = t.grupo !== undefined && t.grupo !== null
            ? String(t.grupo).trim()
            : (existingLocal?.grupo ? String(existingLocal.grupo).trim() : '');
          const liderFinal = t.lider !== undefined && t.lider !== null
            ? String(t.lider).trim()
            : (existingLocal?.lider ? String(existingLocal.lider).trim() : '');
          const supFinal = t.supervisor !== undefined && t.supervisor !== null
            ? String(t.supervisor).trim()
            : (existingLocal?.supervisor ? String(existingLocal.supervisor).trim() : '');

          if (!seen.has(key)) {
            seen.add(key);
            uniqueWorkers.push({
              ...t,
              dni: cleanDni || rawDni || String(t.dni || '').trim(),
              nombres: t.nombres ? String(t.nombres).trim() : '',
              supervisor: supFinal,
              fundo: t.fundo ? String(t.fundo).trim() : (existingLocal?.fundo || ''),
              modulo: t.modulo ? String(t.modulo).trim() : (existingLocal?.modulo || ''),
              grupo: grupoFinal,
              lider: liderFinal,
              fecha: tFecha || (existingLocal?.fecha ? normalizeDateString(existingLocal.fecha) : '')
            });
          }
        });

        // Solo actualizar el estado si realmente hay cambios, evitando re-renders o parpadeos
        const isDifferent = uniqueWorkers.length !== currentWorkers.length ||
          uniqueWorkers.some((uw, idx) => {
            const cw = currentWorkers[idx];
            return !cw || cw.id !== uw.id || cw.grupo !== uw.grupo || cw.lider !== uw.lider || cw.dni !== uw.dni;
          });

        if (isDifferent) {
          setTrabajadoresState(uniqueWorkers);
          saveTrabajadores(uniqueWorkers, d.nominaVersion, serverTimestamp || localTimestamp);
        }
      }
    }
    if (Array.isArray(d.detalleJabas)) {
      const cleanJabas = sanitizeAndDeduplicateDetalleJabas(d.detalleJabas);
      setDetalleJabasState(cleanJabas);
      saveDetalleJabas(cleanJabas);
    }
    if (Array.isArray(d.validaciones)) {
      const cleanVal = cleanValidacionesList(d.validaciones);
      setValidacionesState(cleanVal);
      saveValidaciones(cleanVal);
    }
    if (Array.isArray(d.usuarios) && d.usuarios.length > 0) {
      setUsuariosState(d.usuarios);
      saveUsuarios(d.usuarios);
    }
    if (Array.isArray(d.auditoriaIngresos)) {
      const mergedAudit = mergeAuditoriasArrays(getAuditoriaIngresos(), d.auditoriaIngresos);
      saveAuditoriaIngresos(mergedAudit);
    }
    if (Array.isArray(d.lideres)) {
      const uniqueLideresMap = new Map<string, Lider>();
      d.lideres.forEach((l) => {
        const name = (l.lider || l.nombres || '').trim();
        if (name) {
          const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          if (!uniqueLideresMap.has(key)) {
            uniqueLideresMap.set(key, {
              ...l,
              lider: name,
              nombres: l.nombres || name
            });
          } else if (l.dni && !uniqueLideresMap.get(key)!.dni) {
            uniqueLideresMap.get(key)!.dni = l.dni;
          }
        }
      });
      const uniqueLideres = Array.from(uniqueLideresMap.values());
      setLideresState(uniqueLideres);
      saveLideres(uniqueLideres);
    }
    if (Array.isArray(d.grupos)) {
      setGruposState(d.grupos);
      saveGrupos(d.grupos);
    }
    if (Array.isArray(d.reservas)) {
      setReservasState(d.reservas);
      saveReservas(d.reservas);
    }
    if (d.modulos && typeof d.modulos === 'object') {
      const mergedMods = { ...getModulosPorFundo(), ...d.modulos };
      setModulosPorFundo(mergedMods);
      saveModulosPorFundo(mergedMods);
    }
    const nowIso = new Date().toISOString();
    setLastSyncTime(nowIso);
    setLastSync(nowIso);

    if (!silent) {
      addLog('🟢 Datos sincronizados en vivo con el servidor central', 'ok');
    }
  }, [addLog]);

  // Centralized Server & Cloud Data Fetcher (Synchronizes all PCs and Mobile Users)
  const fetchCentralizedData = useCallback(async (silent = false) => {
    // Si estamos offline según el navegador, no intentar llamadas de red
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    let fetchedFromServer = false;

    // 1. Try local express backend (if running in full-stack container)
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'ok' && json.data) {
          applyServerData(json.data, silent);
          fetchedFromServer = true;
        }
      }
    } catch {
      // Server not reachable (e.g. static host like Netlify)
    }

    // 2. Query Cloud Firestore directly (shared cross-device and cross-user database)
    if (!fetchedFromServer) {
      try {
        const cloudData = await fetchAllDataFromFirestore();
        if (cloudData) {
          applyServerData(cloudData, silent);
          fetchedFromServer = true;
        }
      } catch (err) {
        console.warn('Firestore fetch error in fetchCentralizedData:', err);
      }
    }

    // 3. Fallback: Google Sheets Cloud Backend (solo si el servidor central y Firestore no responden)
    if (!fetchedFromServer) {
      const url = getGsheetUrl();
      if (url) {
        try {
          const gRes = await fetch(`${url}?accion=export`);
          if (gRes.ok) {
            const gJson = await gRes.json();
            if (gJson && gJson.status === 'ok' && gJson.data) {
              const gData = gJson.data;
              applyServerData(gData, silent);
              syncToServerRef.current(gData);
            }
          }
        } catch {
          // Offline fallback
        }
      }
    }
  }, [applyServerData]);

  // Network Online/Offline Detection (Paso 1)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('📶 Conexión de red restablecida. Nómina cargada protegida.', 'success');
      addLog('📶 Señal de red restablecida. La nómina de trabajadores permanece intacta.', 'ok');
      fetchCentralizedData(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast('⚠️ Sin señal de red: Operando en Modo Offline. Todos tus trabajadores y datos siguen intactos.', 'warning');
      addLog('⚠️ Pérdida de señal de red detectada: Modo Offline activo. No se perderá ningún dato.', 'warn');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleNominaLockEvent = (e: any) => {
      if (e && e.detail && typeof e.detail.locked === 'boolean') {
        setOfflineNomina(e.detail.locked);
      }
    };
    window.addEventListener('offline-nomina-changed', handleNominaLockEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-nomina-changed', handleNominaLockEvent);
    };
  }, [addToast, addLog, fetchCentralizedData]);

  // Broadcast Channel reference for instant cross-tab sync
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Server Sync Mutation Trigger
  const syncToServer = useCallback(async (payloadOverride?: any) => {
    try {
      const activeSession = session || getSession();
      const currentRole = activeSession?.rol || 'Administrador';
      const currentName = activeSession?.nombre || 'Administrador';
      const isAdmin = currentRole === 'Administrador';

      // SEGURIDAD CRÍTICA: NUNCA incluir trabajadores en un sync ordinario a menos que:
      // 1. El usuario sea Administrador
      // 2. Se haya pasado expresamente en payloadOverride (ej. al importar o editar trabajadores)
      // Esto impide totalmente que cualquier usuario que no sea Administrador sobrescriba o restablezca la nómina.
      const shouldSendWorkers = isAdmin && payloadOverride && Array.isArray(payloadOverride.trabajadores);

      const basePayload: Record<string, any> = {
        userRole: currentRole,
        userName: currentName,
        programas: getProgramas(),
        programaGeneral: getProgramaGeneral(),
        programacionesDiarias: getProgramacionesDiarias(),
        detalleJabas: getDetalleJabas(),
        usuarios: getUsuarios(),
        validaciones: getValidaciones(),
        lideres: getLideres(),
        grupos: getGrupos(),
        reservas: getReservas()
      };

      if (shouldSendWorkers) {
        basePayload.trabajadores = payloadOverride.trabajadores;
      }

      const payload = payloadOverride
        ? { ...basePayload, ...payloadOverride, userRole: payloadOverride.userRole || currentRole }
        : basePayload;

      // Blindaje adicional: si el rol NO es Administrador, eliminar cualquier campo 'trabajadores'
      if (!isAdmin) {
        delete payload.trabajadores;
      }

      // Broadcast to all tabs on this machine instantly
      try {
        broadcastChannelRef.current?.postMessage({ type: 'sync', data: payload });
      } catch {}

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          applyServerData(json.data, true);
        }
      }
    } catch (e) {
      console.warn('Server sync offline:', e);
    }
  }, [applyServerData, session]);

  // Mantener la referencia a syncToServer sincronizada
  useEffect(() => {
    syncToServerRef.current = syncToServer;
  }, [syncToServer]);

  // Live Real-Time Polling + SSE + BroadcastChannel + Window Focus
  useEffect(() => {
    // 1. Initial immediate pull
    fetchCentralizedData(false);

    // 2. Broadcast Channel for instant multi-tab sync
    try {
      const bc = new BroadcastChannel('recojo_fruta_sync_channel');
      broadcastChannelRef.current = bc;
      bc.onmessage = (e) => {
        if (e.data && e.data.type === 'sync' && e.data.data) {
          applyServerData(e.data.data, true);
        }
      };
    } catch {}

    // 3. Server-Sent Events (SSE) for instant cross-device updates
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/stream');
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && (parsed.type === 'sync' || parsed.type === 'usuarios_updated')) {
            if (parsed.data) {
              applyServerData(parsed.data, true);
            } else {
              fetchCentralizedData(true);
            }
          }
        } catch {}
      };
    } catch {}

    // 4. Polling fallback (15s) que calza con el indicador 'Auto Sync 15s' garantizando cero desincronización y cero parpadeo
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      fetchCentralizedData(true);
    }, 15000);

    const onFocusOrVisible = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      fetchCentralizedData(true);
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    // 5. Firebase Firestore Real-Time Listener
    let unsubscribeFirestoreMaster: (() => void) | null = null;
    try {
      unsubscribeFirestoreMaster = subscribeToFirestoreMasterData((firestoreData) => {
        if (firestoreData) {
          applyServerData(firestoreData, true);
        }
      });
    } catch (err) {
      console.warn('Firestore subscription error:', err);
    }

    return () => {
      broadcastChannelRef.current?.close();
      es?.close();
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      unsubscribeFirestoreMaster?.();
    };
  }, [fetchCentralizedData, applyServerData]);

  const autoPullDoneRef = useRef(false);

  // Background Auto-fetch from Google Sheets if configured and server not authoritative (ejecutado 1 sola vez al inicio)
  useEffect(() => {
    if (autoPullDoneRef.current) return;
    autoPullDoneRef.current = true;

    const autoPullOnStart = async () => {
      const url = getGsheetUrl();
      if (!url) return;
      try {
        // Verificar si el servidor ya tiene datos de trabajadores
        const sRes = await fetch('/api/data').catch(() => null);
        if (sRes && sRes.ok) {
          const sJson = await sRes.json().catch(() => null);
          if (sJson && sJson.status === 'ok' && sJson.data && (sJson.data.trabajadores || []).length > 0) {
            // El servidor central ya cuenta con la nómina autoritativa más reciente
            return;
          }
        }

        const res = await fetch(`${url}?accion=export`);
        if (!res.ok) return;
        const json = await res.json();
        if (json && json.status === 'ok' && json.data) {
          const d = json.data;
          applyServerData(d, true);
          addLog('☁️ Datos sincronizados automáticamente con Google Sheets', 'ok');
          syncToServer(d);
        }
      } catch {
        // Silently use offline cache
      }
    };
    autoPullOnStart();
  }, [addLog, syncToServer, applyServerData]);

  // Background Auto-Sync Trigger
  const triggerAutoSync = useCallback(async (actionName: string, updatedPayload?: any) => {
    // 1. Always sync immediately to Central Server so other PCs see it instantly
    syncToServer(updatedPayload);

    // 2. Sync to Firebase Firestore in real-time
    try {
      const activeSession = session || getSession();
      const currentRole = activeSession?.rol || 'Administrador';
      const isAdmin = currentRole === 'Administrador';

      const firestoreData: Record<string, any> = {
        programas: getProgramas(),
        programaGeneral: getProgramaGeneral(),
        detalleJabas: getDetalleJabas(),
        usuarios: getUsuarios(),
        validaciones: getValidaciones(),
        lideres: getLideres(),
        grupos: getGrupos(),
        reservas: getReservas(),
        userRole: currentRole,
        isAdmin: isAdmin,
        userEmail: activeSession?.email || activeSession?.user || 'admin',
        ...updatedPayload
      };
      // Únicamente el Administrador puede enviar nómina de trabajadores a Firestore
      if (!isAdmin || !updatedPayload?.trabajadores) {
        delete firestoreData.trabajadores;
      }
      syncAllDataToFirestore(firestoreData).catch(() => {});
    } catch {
      // Offline fallback
    }

    // 3. Also sync to Google Sheets if configured
    if (!isAutoSyncEnabled()) return;
    const url = getGsheetUrl();
    if (!url) return;

    try {
      const activeSession = session || getSession();
      const currentRole = activeSession?.rol || 'Administrador';
      const isAdmin = currentRole === 'Administrador';

      addLog(`⚡ Auto-guardado en curso (${actionName})...`, 'info');
      const gSheetData: Record<string, any> = {
        programas: getProgramas(),
        programaGeneral: getProgramaGeneral(),
        detalleJabas: getDetalleJabas(),
        usuarios: getUsuarios(),
        validaciones: getValidaciones(),
        lideres: getLideres(),
        grupos: getGrupos(),
        reservas: getReservas()
      };
      if (isAdmin && updatedPayload?.trabajadores) {
        gSheetData.trabajadores = updatedPayload.trabajadores;
      }
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          accion: 'sync',
          data: gSheetData
        })
      });

      const nowIso = new Date().toISOString();
      setLastSyncTime(nowIso);
      setLastSync(nowIso);
      addLog(`✅ Auto-guardado completado en Google Sheets (${actionName})`, 'ok');
    } catch {
      addLog(`⏳ Sin conexión con Google Sheets: cambio guardado localmente en servidor y dispositivo.`, 'err');
    }
  }, [addLog, syncToServer]);

  // Reset all test data (Clean start)
  const handleResetAllData = useCallback(async () => {
    resetAllData();
    setTrabajadoresState([]);
    setProgramasState([]);
    setProgramaGeneralState([]);
    setProgramacionesDiariasState([]);
    setDetalleJabasState([]);
    setValidacionesState([]);
    setGruposState([]);
    setLideresState([]);
    setReservasState([]);
    setUsuariosState(getUsuarios());

    // Clear central node server and wipe all backups
    try {
      await fetch('/api/wipe-backups', { method: 'POST' });
    } catch (e) {
      console.warn('Reset server api error:', e);
    }

    // Clear Firebase Firestore
    try {
      await syncAllDataToFirestore({
        programas: [],
        programaGeneral: [],
        trabajadores: [],
        detalleJabas: [],
        validaciones: [],
        grupos: [],
        lideres: [],
        reservas: [],
        usuarios: getUsuarios()
      });
    } catch (e) {
      console.warn('Reset firestore error:', e);
    }

    addToast('🧹 Base de datos limpiada. Sin backups históricos. Listo para nómina fresca del Sheet.', 'success');
    addLog('🧹 Base de datos y backups históricos reiniciados a cero (sin distorsión histórica)', 'ok');
  }, [addToast, addLog]);


  // Handlers
  const handleLogin = (userSession: UserSession) => {
    saveSession(userSession);
    setSession(userSession);
    if (userSession.rol === 'Trabajador') {
      setActiveTab('trabajadores');
    } else if (userSession.rol === 'Jefe') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('programaGeneral');
    }
    addLog(`👤 Sesión iniciada: ${userSession.nombre} (${userSession.rol})`, 'ok');
    fetchCentralizedData(false);

    // Remove shared/login query params from browser address bar smoothly
    if (typeof window !== 'undefined' && window.history && window.location.search) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('shared');
        url.searchParams.delete('login');
        url.searchParams.delete('auth');
        const remainingQuery = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (remainingQuery ? `?${remainingQuery}` : ''));
      } catch {}
    }
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
    triggerAutoSync('Nuevo Programa', { programas: updated });
  };

  const handleSaveProgramaGeneral = (list: ProgramaGeneral[]) => {
    setProgramaGeneralState(list);
    saveProgramaGeneral(list);
    addLog(`🌾 Programa Semanal actualizado (${list.length} registros)`, 'ok');
    triggerAutoSync('Programa General', { programaGeneral: list });
  };

  const handleSaveProgramacionDiaria = (item: ProgramacionDiaria) => {
    const updated = [item, ...programacionesDiarias.filter((p) => p.id !== item.id)];
    setProgramacionesDiariasState(updated);
    saveProgramacionesDiarias(updated);
    addLog(`📅 Programación Diaria guardada: ${item.id} (${item.fundo} - ${item.modulo})`, 'ok');
    triggerAutoSync('Programacion Diaria', { programacionesDiarias: updated });
  };

  const handleDeleteProgramacionDiaria = (id: string) => {
    const updated = programacionesDiarias.filter((p) => p.id !== id);
    setProgramacionesDiariasState(updated);
    deleteProgramacionDiariaFromStorage(id);
    addLog(`🗑️ Programación Diaria eliminada: ${id}`, 'info');
    triggerAutoSync('Eliminar Programacion Diaria', { programacionesDiarias: updated });
  };

  const handleGoToEjecucionFromProgramacion = (item: ProgramacionDiaria) => {
    setInitialProgramacionForEjecucion(item);
    setActiveTab('programa');
    addToast(`🚀 Cargando Programación Diaria ${item.id} en Ejecución...`, 'info');
  };

  const handleSaveAvance = (avanceMap: Record<string, number>, newDetalleList: DetalleJaba[]) => {
    // Sanitizar y deduplicar estrictamente para evitar duplicados o multiplicaciones
    const mergedDetalle = sanitizeAndDeduplicateDetalleJabas([...newDetalleList, ...detalleJabas]);
    setDetalleJabasState(mergedDetalle);
    saveDetalleJabas(mergedDetalle);

    // Update full worker context (Supervisor, Fundo, Modulo, Grupo, Lider, Jabas) based on this cuadrilla record
    const workerUpdates: Record<string, { supervisor?: string; fundo?: string; modulo?: string; grupo?: string; lider?: string; nombres?: string; fecha?: string; jabas?: number }> = {};
    const hoy = getLocalToday();
    const workerJabasByModToday: Record<string, number> = {};
    const workerJabasTotalToday: Record<string, number> = {};

    mergedDetalle.forEach((d) => {
      const dFecha = String(d.fecha || '').trim();
      const dTimestamp = String(d.timestamp || '').slice(0, 10);
      if (dFecha === hoy || dTimestamp === hoy) {
        const j = Number(d.jabas) || 0;
        if (d.dni) {
          const cleanD = String(d.dni).replace(/\s+/g, '').trim();
          const rawD = String(d.dni).trim();
          const modD = String(d.modulo || '').trim().toUpperCase();
          if (cleanD && modD) workerJabasByModToday[`${cleanD}__${modD}`] = j;
          if (rawD && modD) workerJabasByModToday[`${rawD}__${modD}`] = j;
          if (cleanD) workerJabasTotalToday[cleanD] = (workerJabasTotalToday[cleanD] || 0) + j;
          if (rawD && rawD !== cleanD) workerJabasTotalToday[rawD] = (workerJabasTotalToday[rawD] || 0) + j;
        }
      }
    });

    newDetalleList.forEach((d) => {
      if (d.dni) {
        const cleanD = String(d.dni).replace(/\s+/g, '').trim();
        const rawD = String(d.dni).trim();
        const modD = String(d.modulo || '').trim().toUpperCase();
        const obj = {
          supervisor: d.supervisor,
          fundo: d.fundo,
          modulo: d.modulo,
          grupo: d.grupo,
          lider: d.lider,
          nombres: d.trabajador,
          fecha: d.fecha || hoy,
          jabas: Number(d.jabas) || 0
        };
        if (modD) {
          if (cleanD) workerUpdates[`${cleanD}__${modD}`] = obj;
          if (rawD) workerUpdates[`${rawD}__${modD}`] = obj;
        }
        if (cleanD) workerUpdates[cleanD] = obj;
        if (rawD) workerUpdates[rawD] = obj;
        if (d.trabajador) {
          const normName = d.trabajador.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
          if (modD) workerUpdates[`NAME_${normName}__${modD}`] = obj;
          workerUpdates[`NAME_${normName}`] = obj;
        }
      }
    });

    let updatedWorkers = trabajadores.map((t) => {
      const cleanD = String(t.dni || '').replace(/\s+/g, '').trim();
      const rawD = String(t.dni || '').trim();
      const tMod = String(t.modulo || '').trim().toUpperCase();
      const normName = t.nombres ? t.nombres.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';

      // Match by DNI and module first, so workers in different modules keep their own module & jabas
      const u =
        (tMod && cleanD && workerUpdates[`${cleanD}__${tMod}`]) ||
        (tMod && rawD && workerUpdates[`${rawD}__${tMod}`]) ||
        (tMod && normName && workerUpdates[`NAME_${normName}__${tMod}`]) ||
        (t.id && workerUpdates[t.id]) ||
        (cleanD && workerUpdates[cleanD]) ||
        (rawD && workerUpdates[rawD]) ||
        (normName && workerUpdates[`NAME_${normName}`]);

      const specificJabasToday =
        (tMod && cleanD && workerJabasByModToday[`${cleanD}__${tMod}`]) ||
        (tMod && rawD && workerJabasByModToday[`${rawD}__${tMod}`]);
      const currentJabasToday =
        specificJabasToday !== undefined
          ? specificJabasToday
          : (cleanD && workerJabasTotalToday[cleanD]) || (rawD && workerJabasTotalToday[rawD]) || 0;

      if (u) {
        return {
          ...t,
          supervisor: u.supervisor || t.supervisor,
          fundo: u.fundo || t.fundo,
          modulo: t.modulo || u.modulo,
          grupo: u.grupo || t.grupo,
          lider: u.lider || t.lider,
          fecha: u.fecha || t.fecha,
          jabas: specificJabasToday !== undefined ? specificJabasToday : (Number(u.jabas) || Number(t.jabas) || 0)
        };
      }
      if (specificJabasToday !== undefined) {
        return {
          ...t,
          jabas: specificJabasToday
        };
      }
      return t;
    });

    // Add any workers not previously in the roster (keyed strictly by clean DNI to avoid duplicates)
    const existingWorkerDniSet = new Set(
      trabajadores.map((t) => String(t.dni || '').replace(/\D/g, '') || String(t.dni || '').trim())
    );
    newDetalleList.forEach((d) => {
      if (d.dni) {
        const cleanD = String(d.dni).replace(/\D/g, '') || String(d.dni).trim();
        const modD = d.modulo || 'M01';
        if (cleanD && !existingWorkerDniSet.has(cleanD)) {
          existingWorkerDniSet.add(cleanD);
          updatedWorkers = [
            {
              id: `TRAB_${cleanD}_${Date.now()}`,
              fecha: d.fecha || getLocalToday(),
              dni: cleanD,
              nombres: d.trabajador || `Trabajador ${cleanD}`,
              fundo: d.fundo || 'Santa Teresa',
              modulo: modD,
              supervisor: d.supervisor || '',
              grupo: d.grupo || '',
              lider: d.lider || '',
              tipo: 'Ingreso Adicional',
              jabas: Number(d.jabas) || 0
            },
            ...updatedWorkers
          ];
        }
      }
    });

    const finalWorkers = sanitizeAndDeduplicateTrabajadores(updatedWorkers);
    setTrabajadoresState(finalWorkers);
    saveTrabajadores(finalWorkers);

    // Actualizar reservas de hoy vinculadas a los trabajadores guardados con jabas para marcarlas como completadas
    const savedDnisSet = new Set(newDetalleList.map((d) => String(d.dni || '').replace(/\s+/g, '').trim()));
    const updatedReservas = reservas.map((res) => {
      if (res.fecha !== hoy) return res;
      const resDnis = (res.trabajadores || []).map((tw) => String(tw.dni || '').replace(/\s+/g, '').trim());
      const hasSavedWorker = resDnis.some((dni) => savedDnisSet.has(dni));
      if (hasSavedWorker) {
        return {
          ...res,
          estado: 'completada' as const
        };
      }
      return res;
    });
    setReservasState(updatedReservas);
    saveReservas(updatedReservas);

    let updatedProg = programas;
    if (programas.length > 0) {
      updatedProg = [...programas];
      updatedProg[0] = {
        ...updatedProg[0],
        avance: { ...(updatedProg[0].avance || {}), ...avanceMap }
      };
      setProgramasState(updatedProg);
      saveProgramas(updatedProg);
    }

    addLog(`📊 Avance registrado con Supervisor, Fundo, Módulo, Grupo y Líder para ${newDetalleList.length} trabajadores`, 'ok');
    triggerAutoSync('Avance Jabas', { 
      detalleJabas: mergedDetalle, 
      trabajadores: updatedWorkers,
      programas: updatedProg
    });

    // Subida directa inmediata a Google Sheets ('Registro_Avance' y 'Trabajadores')
    try {
      const totalJabas = newDetalleList.reduce((acc, d) => acc + (Number(d.jabas) || 0), 0);
      addToast(`☁️ Subiendo ${totalJabas} jabas y ${newDetalleList.length} trabajadores asignados directo a Google Sheets...`, 'info');
      replicarAvanceAlSheet(mergedDetalle, updatedWorkers).then((sheetRes) => {
        if (sheetRes.sheetOk) {
          addToast(`✅ Avance (${totalJabas} jabas) y trabajadores subidos directo a Google Sheets ('Registro_Avance' y 'Trabajadores')`, 'success');
          addLog(`🌐 Avance subido a Google Sheet con éxito: ${newDetalleList.length} registros`, 'ok');
        } else {
          addToast(`⚠️ Avance guardado en el sistema. Aviso Google Sheet: ${sheetRes.error || 'Verificar conexión'}`, 'warning');
          addLog(`⚠️ Aviso Google Sheets al subir avance: ${sheetRes.error || 'Verificar webhook'}`, 'warn');
        }
      }).catch((e: any) => {
        console.warn('Error subiendo avance a Google Sheet:', e);
      });
    } catch (e: any) {
      console.warn('Error iniciando subida de avance a Google Sheet:', e);
    }
  };

  const handleReplicarAvanceSheet = async (
    customDetalle?: DetalleJaba[],
    customWorkers?: Trabajador[],
    customUrl?: string
  ) => {
    const dList = customDetalle && customDetalle.length > 0 ? customDetalle : detalleJabas;
    const wList = customWorkers && customWorkers.length > 0 ? customWorkers : trabajadores;
    addToast('☁️ Subiendo registros de avance y asignaciones a Google Sheets...', 'info');
    const res = await replicarAvanceAlSheet(dList, wList, customUrl);
    if (res.sheetOk) {
      addToast(`✅ Sincronizado directo con Google Sheet: ${res.countJabas} jabas en 'Registro_Avance' y cuadrilla actualizada.`, 'success');
      addLog(`🌐 Subida de avance a Google Sheet exitosa (${res.countJabas} jabas, ${wList.length} trabajadores)`, 'ok');
    } else {
      addToast(`⚠️ Guardado en sistema. Aviso Google Sheet: ${res.error || 'Verificar conexión'}`, 'warning');
    }
    return res;
  };

  const handleSaveModulo = (fundo: string, modulo: string) => {
    const cleanFundo = fundo || 'General';
    const cleanMod = modulo.trim().toUpperCase();
    if (!cleanMod) return;
    const updated = addModuloToFundo(cleanFundo, cleanMod);
    setModulosPorFundo(updated);
    saveModulosPorFundo(updated);
    addLog(`📍 Nuevo Módulo registrado: ${cleanMod} para fundo ${cleanFundo}`, 'ok');
    triggerAutoSync('Registro Módulo', { modulos: updated });
    addToast(`✅ Módulo "${cleanMod}" registrado para el fundo "${cleanFundo}"`, 'success');
  };

  const handleUpdateTrabajadores = (updatedWorkers: Trabajador[]) => {
    const newTimestamp = Date.now();
    const newVersion = getNominaVersion() + 1;
    setTrabajadoresState(updatedWorkers);
    saveTrabajadores(updatedWorkers, newVersion, newTimestamp);
    addLog(`👥 Nómina de personal actualizada (${updatedWorkers.length} trabajadores)`, 'ok');

    const activeSession = session || getSession();
    const currentRole = activeSession?.rol || 'Administrador';
    const currentName = activeSession?.nombre || 'Administrador';

    // Fast direct push to server API so other devices and SSE receive immediately
    fetch('/api/trabajadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trabajadores: updatedWorkers,
        append: false,
        userRole: currentRole,
        userName: currentName,
        nominaTimestamp: newTimestamp,
        nominaVersion: newVersion
      })
    }).catch(() => {});

    triggerAutoSync('Actualización Personal', {
      trabajadores: updatedWorkers,
      userRole: currentRole,
      userName: currentName,
      nominaTimestamp: newTimestamp,
      nominaVersion: newVersion
    });
  };

  const handleSaveTrabajador = (worker: Trabajador) => {
    const exists = trabajadores.some((t) => t.dni === worker.dni);
    let updated: Trabajador[];
    if (exists) {
      updated = trabajadores.map((t) => (t.dni === worker.dni ? { ...t, ...worker } : t));
    } else {
      updated = [worker, ...trabajadores];
    }
    setTrabajadoresState(updated);
    saveTrabajadores(updated);

    const activeSession = session || getSession();
    const currentRole = activeSession?.rol || 'Administrador';
    const currentName = activeSession?.nombre || 'Administrador';

    // Fast direct push to server API
    fetch('/api/trabajadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trabajadores: updated,
        append: false,
        userRole: currentRole,
        userName: currentName
      })
    }).catch(() => {});

    addLog(`👷 Trabajador registrado con Supervisor, Fundo, Módulo, Grupo y Líder: ${worker.nombres} (DNI: ${worker.dni})`, 'ok');
    triggerAutoSync('Registro Trabajador', {
      trabajadores: updated,
      userRole: currentRole,
      userName: currentName
    });
    addToast(`✅ Trabajador "${worker.nombres}" guardado con éxito`, 'success');
  };

  const handleSaveUsuarios = async (updatedUsuarios: Usuario[]) => {
    setUsuariosState(updatedUsuarios);
    saveUsuarios(updatedUsuarios);
    addLog(`🔐 Nómina de usuarios actualizada (${updatedUsuarios.length} usuarios)`, 'ok');
    
    // Direct push to server user registry
    try {
      await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarios: updatedUsuarios })
      });
    } catch (e) {
      console.warn('Direct usuarios POST error:', e);
    }

    triggerAutoSync('Gestión Usuarios', { usuarios: updatedUsuarios });
  };

  const handleSaveLider = (newLider: Lider) => {
    const updated = [
      newLider,
      ...lideres.filter(
        (l) =>
          !(
            (newLider.dni && l.dni && l.dni === newLider.dni) ||
            (l.lider && newLider.lider && l.lider.toLowerCase() === newLider.lider.toLowerCase())
          )
      )
    ];
    setLideresState(updated);
    saveLideres(updated);

    // Update worker role/leader tag if exists
    const updatedWorkers = trabajadores.map((t) => {
      if (t.dni === newLider.dni) {
        return { ...t, lider: newLider.lider, tipo: 'Líder' };
      }
      return t;
    });
    setTrabajadoresState(updatedWorkers);
    saveTrabajadores(updatedWorkers);

    addLog(`👑 Líder registrado: ${newLider.lider} (habilitado para todos los grupos)`, 'ok');
    triggerAutoSync('Registro Líder', { lideres: updated, trabajadores: updatedWorkers });
  };

  const handleDeleteLider = (liderNameOrDni: string) => {
    const clean = (liderNameOrDni || '').trim();
    if (!clean) return;
    const cleanNorm = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const updatedLideres = lideres.filter((l) => {
      const name = (l.lider || l.nombres || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const dni = (l.dni || '').trim();
      return name !== cleanNorm && dni !== clean;
    });

    setLideresState(updatedLideres);
    saveLideres(updatedLideres);

    // Also update workers who had this leader assigned
    const updatedWorkers = trabajadores.map((t) => {
      const tLeadNorm = (t.lider || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const isMatch = tLeadNorm === cleanNorm || (t.dni && t.dni === clean);
      if (isMatch) {
        return {
          ...t,
          lider: '',
          tipo: t.tipo === 'Líder' ? 'Cosechero' : t.tipo
        };
      }
      return t;
    });
    setTrabajadoresState(updatedWorkers);
    saveTrabajadores(updatedWorkers);

    addLog(`🗑️ Líder eliminado: ${clean}`, 'warn');
    triggerAutoSync('Eliminar Líder', { lideres: updatedLideres, trabajadores: updatedWorkers });
    addToast(`🗑️ Líder "${clean}" eliminado del sistema`);
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

  const handleDeleteGrupo = (grupoToDelete: string) => {
    const clean = (grupoToDelete || '').trim();
    if (!clean) return;
    const updated = grupos.filter((g) => g.trim().toLowerCase() !== clean.toLowerCase());
    setGruposState(updated);
    saveGrupos(updated);

    // Remove this group from workers who were in this group
    const updatedWorkers = trabajadores.map((t) => {
      if ((t.grupo || '').trim().toLowerCase() === clean.toLowerCase()) {
        return { ...t, grupo: '' };
      }
      return t;
    });
    setTrabajadoresState(updatedWorkers);
    saveTrabajadores(updatedWorkers);

    addLog(`🗑️ Grupo eliminado: ${clean}`, 'warn');
    triggerAutoSync('Eliminar Grupo', { grupos: updated, trabajadores: updatedWorkers });
    addToast(`🗑️ Grupo "${clean}" eliminado`);
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

  const handleDeleteSupervisor = (supervisorName: string) => {
    const clean = (supervisorName || '').trim();
    if (!clean) return;
    const cleanNorm = normalizeSupervisorKey(clean);

    // 1. Quitar supervisor de la lista de usuarios (si tiene rol Supervisor)
    const updatedUsuarios = usuarios.filter((u) => {
      if (u.rol !== 'Supervisor') return true;
      const uNameNorm = normalizeSupervisorKey(u.nombre);
      const uUserNorm = normalizeSupervisorKey(u.user);
      return uNameNorm !== cleanNorm && uUserNorm !== cleanNorm;
    });
    setUsuariosState(updatedUsuarios);
    saveUsuarios(updatedUsuarios);

    // 2. Desvincular supervisor de los trabajadores asociados
    let workersUpdated = false;
    const updatedTrabajadores = trabajadores.map((t) => {
      if (t.supervisor && normalizeSupervisorKey(t.supervisor) === cleanNorm) {
        workersUpdated = true;
        return { ...t, supervisor: '' };
      }
      return t;
    });
    if (workersUpdated) {
      setTrabajadoresState(updatedTrabajadores);
      saveTrabajadores(updatedTrabajadores);
    }

    // 3. Eliminar reservas vinculadas a este supervisor
    const currentReservas = getReservas();
    const updatedReservas = currentReservas.filter(
      (r) => normalizeSupervisorKey(r.supervisor) !== cleanNorm
    );
    if (updatedReservas.length !== currentReservas.length) {
      setReservasState(updatedReservas);
      saveReservas(updatedReservas);
    }

    // 4. Actualizar servidor central mediante POST directo para sincronización inmediata
    fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarios: updatedUsuarios })
    }).catch(() => {});

    addLog(`🗑️ Supervisor eliminado del sistema: ${clean}`, 'warn');
    triggerAutoSync('Eliminar Supervisor', {
      usuarios: updatedUsuarios,
      ...(workersUpdated ? { trabajadores: updatedTrabajadores } : {}),
      reservas: updatedReservas
    });
    addToast(`🗑️ Supervisor "${clean}" eliminado del sistema`);
  };

  const handleSaveValidacion = (newValidacion: ValidacionSupervisor) => {
    const updated = saveSingleValidacion(newValidacion);
    setValidacionesState(updated);
    addLog(`📋 Validación oficial registrada: ${newValidacion.supervisor} - ${newValidacion.fundo} ${newValidacion.modulo} (${newValidacion.trabajadoresConformes} conformes / ${newValidacion.jabasConformes} jabas)`, 'ok');

    // Sincronizar también detalleJabas para que los trabajadores asignados/validados y sus jabas queden guardados en el registro de cosecha
    const currentDetalle = getDetalleJabas();
    const updatedDetalle = [...currentDetalle];
    let detalleChanged = false;

    if (Array.isArray(newValidacion.items) && newValidacion.items.length > 0) {
      newValidacion.items.forEach((item) => {
        if (!item.dni || item.conforme === false) return;
        const cleanDni = String(item.dni).trim();
        const normFecha = normalizeDateString(newValidacion.fecha);
        const normMod = String(newValidacion.modulo || 'M01').trim();
        const existingIdx = updatedDetalle.findIndex((dj) => {
          return String(dj.dni || '').trim() === cleanDni &&
                 normalizeDateString(dj.fecha) === normFecha &&
                 String(dj.modulo || '').trim().toUpperCase() === normMod.toUpperCase();
        });

        const jVal = Number(item.jabas) || 0;
        if (existingIdx >= 0) {
          updatedDetalle[existingIdx] = {
            ...updatedDetalle[existingIdx],
            jabas: jVal,
            validado: true,
            supervisor: newValidacion.supervisor,
            fundo: newValidacion.fundo,
            modulo: newValidacion.modulo,
            grupo: newValidacion.grupo,
            lider: newValidacion.lider || updatedDetalle[existingIdx].lider
          };
          detalleChanged = true;
        } else if (jVal > 0) {
          updatedDetalle.push({
            id: `DJ_${normFecha}_${cleanDni}_${normMod}`,
            fecha: newValidacion.fecha,
            fundo: newValidacion.fundo,
            modulo: newValidacion.modulo,
            grupo: newValidacion.grupo,
            lider: newValidacion.lider || '',
            dni: cleanDni,
            trabajador: item.nombres,
            jabas: jVal,
            tipo: item.tipo || 'Cosechador',
            supervisor: newValidacion.supervisor,
            timestamp: new Date().toISOString()
          });
          detalleChanged = true;
        }
      });
    }

    if (detalleChanged) {
      const sanitized = sanitizeAndDeduplicateDetalleJabas(updatedDetalle);
      setDetalleJabasState(sanitized);
      saveDetalleJabas(sanitized);
      triggerAutoSync('Validación por Supervisor', { validaciones: updated, detalleJabas: sanitized });
    } else {
      triggerAutoSync('Validación por Supervisor', { validaciones: updated });
    }
  };

  const handleDeleteValidacion = (valId: string) => {
    const updated = validaciones.filter((v) => v.id !== valId);
    setValidacionesState(updated);
    saveValidaciones(updated);
    addLog(`🗑️ Validación eliminada del historial: ${valId}`, 'warn');
    triggerAutoSync('Eliminar Validación', { validaciones: updated });
    addToast(`🗑️ Validación eliminada del historial`);
  };

  const handleSaveReserva = (newReserva: ReservaCuadrilla) => {
    const updated = saveSingleReserva(newReserva);
    setReservasState(updated);
    addLog(`💾 Reserva guardada por Supervisor: ${newReserva.totalTrabajadores} trabajadores para ${newReserva.supervisor} (${newReserva.fundo} - ${newReserva.modulo})`, 'ok');

    // Direct server POST to immediately persist and broadcast to other devices
    fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reserva: newReserva })
    }).catch(() => {});

    triggerAutoSync('Guardar Reserva por Supervisor', { reservas: updated });
    addToast(`💾 Reserva guardada para ${newReserva.supervisor} (${newReserva.totalTrabajadores} trabajadores en ${newReserva.fundo} - ${newReserva.modulo})`, 'success');
  };

  const handleDeleteReserva = (reservaId: string) => {
    const current = getReservas();
    const updated = current.filter((r) => r.id !== reservaId);
    setReservasState(updated);
    saveReservas(updated);

    fetch(`/api/reservas/${encodeURIComponent(reservaId)}`, {
      method: 'DELETE'
    }).catch(() => {});

    triggerAutoSync('Eliminar Reserva', { reservas: updated });
    addToast(`🗑️ Reserva eliminada del sistema`);
  };

  const handleImportTrabajadores = async (
    newWorkers: Trabajador[],
    mode: 'reemplazar_fecha' | 'append' | 'reemplazar_todo' | boolean = 'reemplazar_fecha',
    targetDate?: string
  ) => {
    const effectiveModo: 'reemplazar_fecha' | 'append' | 'reemplazar_todo' =
      typeof mode === 'boolean'
        ? (mode ? 'reemplazar_fecha' : 'append')
        : mode;

    const fechaFinal = normalizeDateString(targetDate) || (newWorkers[0]?.fecha ? normalizeDateString(newWorkers[0].fecha) : getLocalToday());

    // Asegurar que los trabajadores tengan su fecha asignada
    const workersWithFecha = newWorkers.map((w, idx) => {
      const cleanDni = String(w.dni || '').trim();
      const wFecha = w.fecha ? (normalizeDateString(w.fecha) || fechaFinal) : fechaFinal;
      return {
        ...w,
        dni: cleanDni,
        fecha: wFecha,
        id: w.id || `w_${cleanDni || idx}_${wFecha}`
      };
    });

    let mergedList: Trabajador[] = [];
    if (effectiveModo === 'reemplazar_fecha') {
      // Conservar trabajadores de otras fechas
      const otrasFechas = trabajadores.filter((t) => {
        const tf = normalizeDateString(t.fecha);
        return tf && tf !== fechaFinal;
      });
      // Deduplicar dentro de la fecha seleccionada
      const seenDni = new Set<string>();
      const deduplicatedNew: Trabajador[] = [];
      workersWithFecha.forEach((t) => {
        const cleanDni = String(t.dni || '').trim();
        const key = cleanDni || t.id;
        if (!seenDni.has(key)) {
          seenDni.add(key);
          deduplicatedNew.push(t);
        }
      });
      mergedList = [...otrasFechas, ...deduplicatedNew];
    } else if (effectiveModo === 'append') {
      const existingMap = new Map<string, Trabajador>();
      trabajadores.forEach((t) => {
        const cleanDni = String(t.dni || '').trim();
        const tf = normalizeDateString(t.fecha) || 'sin_fecha';
        const mod = String(t.modulo || 'SM').trim().toUpperCase();
        const key = cleanDni ? `${cleanDni}__${tf}__${mod}` : (t.id ? `${t.id}__${mod}` : `idx_${t.nombres}__${mod}`);
        existingMap.set(key, t);
      });
      workersWithFecha.forEach((t) => {
        const cleanDni = String(t.dni || '').trim();
        const tf = normalizeDateString(t.fecha) || 'sin_fecha';
        const mod = String(t.modulo || 'SM').trim().toUpperCase();
        const key = cleanDni ? `${cleanDni}__${tf}__${mod}` : (t.id ? `${t.id}__${mod}` : `idx_${t.nombres}__${mod}`);
        existingMap.set(key, t);
      });
      mergedList = Array.from(existingMap.values());
    } else {
      // 'reemplazar_todo'
      mergedList = workersWithFecha;
    }

    const newTimestamp = Date.now();
    const newVersion = getNominaVersion() + 1;
    setTrabajadoresState(mergedList);
    saveTrabajadores(mergedList, newVersion, newTimestamp);

    // PASO 2: Activar Modo Offline con los trabajadores cargados para que no se vuelva a sincronizar la nómina
    setOfflineNominaLocked(true);
    setOfflineNomina(true);

    const descModo =
      effectiveModo === 'reemplazar_fecha'
        ? `Nómina de fecha ${fechaFinal} actualizada (${workersWithFecha.length} trabajadores)`
        : effectiveModo === 'append'
        ? `Trabajadores añadidos a fecha ${fechaFinal} (${workersWithFecha.length} trabajadores)`
        : `Nómina global reemplazada (${workersWithFecha.length} trabajadores)`;

    addLog(`📥 ${descModo}. Total histórico en sistema: ${mergedList.length}. 🔒 Modo Offline activo: nómina asegurada en el dispositivo.`, 'ok');
    addToast(`🔒 ${descModo}. Total en sistema: ${mergedList.length}.`, 'success');

    // Fast-path direct push to dedicated trabajadores endpoint
    try {
      await fetch('/api/trabajadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabajadores: mergedList,
          modo: effectiveModo,
          fechaTarget: fechaFinal,
          userRole: session?.rol || 'Administrador',
          userName: session?.nombre || 'Administrador',
          nominaTimestamp: newTimestamp,
          nominaVersion: newVersion
        })
      });
    } catch (err) {
      console.warn('Direct trabajadores sync error:', err);
    }

    triggerAutoSync('Importar Trabajadores', {
      trabajadores: mergedList,
      forceNominaUpdate: true,
      depurado: effectiveModo === 'reemplazar_todo',
      modo: effectiveModo,
      fechaTarget: fechaFinal,
      nominaTimestamp: newTimestamp,
      nominaVersion: newVersion
    });
  };

  const handleReplicarTrabajadoresSheet = async (
    newWorkers: Trabajador[],
    modo: 'reemplazar_fecha' | 'append' | 'reemplazar_todo' = 'reemplazar_fecha',
    targetDate?: string,
    customUrl?: string
  ) => {
    const fechaFinal = normalizeDateString(targetDate) || (newWorkers[0]?.fecha ? normalizeDateString(newWorkers[0].fecha) : getLocalToday());

    // 1. Guardar primero en el aplicativo y estado local
    handleImportTrabajadores(newWorkers, modo, fechaFinal);

    // 2. Replicar al Google Sheet vía backend y fallback
    const res = await replicarTrabajadoresAlSheet(
      newWorkers,
      customUrl || getGsheetUrl(),
      modo,
      fechaFinal,
      session?.rol || 'Administrador'
    );

    if (res.sheetOk) {
      addLog(`🌐 Nómina cargada y replicada a Google Sheets (${newWorkers.length} registros para ${fechaFinal}).`, 'ok');
    } else {
      addLog(`⚠️ Nómina guardada en el aplicativo. Aviso Google Sheets: ${res.error || 'Verificar conexión'}`, 'warn');
    }

    return res;
  };

  const handleDepurarTrabajadoresAyer = async () => {
    try {
      const hoy = getLocalToday();
      addLog(`🧹 Iniciando depuración de trabajadores del día anterior (< ${hoy})...`, 'info');

      // 1. Depuración local instantánea en memoria, localStorage y caché offline
      const { depurados, eliminados } = depurarTrabajadoresDiaAnterior();
      setTrabajadoresState(depurados);

      // 2. Depuración en el servidor central
      let serverEliminados = 0;
      try {
        const res = await fetch('/api/depurar-trabajadores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fechaReferencia: hoy,
            userRole: session?.rol || 'Administrador',
            userName: session?.nombre || 'Administrador'
          })
        });

        if (res.ok) {
          const resJson = await res.json();
          serverEliminados = resJson.eliminadosCount ?? 0;
        }
      } catch (err) {
        console.warn('Servidor offline al depurar:', err);
      }

      const total = Math.max(eliminados, serverEliminados);
      addLog(`🧹 Depuración completada: ${total} registros del día anterior eliminados del sistema central y dispositivos.`, 'ok');
      addToast(`✅ Se depuraron ${total} trabajadores del día anterior. Ya no volverán a restablecerse.`, 'success');

      // 3. Notificar a otros dispositivos via broadcast/sync con bandera depurado: true
      triggerAutoSync('Depurar Trabajadores Día Anterior', {
        trabajadores: depurados,
        depurado: true
      });
    } catch (err: any) {
      console.error('Error depurando trabajadores:', err);
      addToast('Error ejecutando la depuración', 'error');
    }
  };

  const handleRecargarNominaServidor = useCallback(async () => {
    try {
      addLog('🔄 Sincronizando nómina completa desde el servidor central...', 'info');
      // Intentar primero el endpoint dedicado de nómina /api/trabajadores
      let serverList: Trabajador[] | null = null;
      try {
        const resTrab = await fetch('/api/trabajadores?t=' + Date.now(), { cache: 'no-store' });
        if (resTrab.ok) {
          const jsonTrab = await resTrab.json();
          if (Array.isArray(jsonTrab.trabajadores)) {
            serverList = jsonTrab.trabajadores;
          }
        }
      } catch {}

      // Fallback a /api/data
      if (!serverList) {
        const res = await fetch('/api/data?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.trabajadores && Array.isArray(json.data.trabajadores)) {
            serverList = json.data.trabajadores;
          }
        }
      }

      if (serverList && Array.isArray(serverList)) {
        // Desactivar cualquier bloqueo offline anterior que impida ver la nómina completa
        setOfflineNominaLocked(false);
        setOfflineNomina(false);
        setTrabajadoresState(serverList);
        saveTrabajadores(serverList);
        addToast(`✅ Nómina sincronizada: ${serverList.length} trabajadores cargados desde el servidor central.`, 'success');
        addLog(`✅ Nómina de trabajadores actualizada con éxito (${serverList.length} trabajadores totales).`, 'ok');
        return;
      }
      addToast('⚠️ No se pudo obtener la nómina desde el servidor.', 'warning');
    } catch (err: any) {
      addToast('❌ Error de conexión con el servidor central.', 'error');
    }
  }, [addToast, addLog]);

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
          validaciones,
          lideres,
          grupos
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
        // Si Google Sheets no trae nómina, usar la local de respaldo; de lo contrario respetar la hoja Trabajadores
        if (!Array.isArray(d.trabajadores) || d.trabajadores.length === 0) {
          const currentLocal = getTrabajadores();
          if (currentLocal.length > 0) {
            d.trabajadores = currentLocal;
          }
        }
        applyServerData(d, false);
        syncToServer({ ...d, trabajadores: getTrabajadores() });
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

  // Función dedicada para conectar directamente con la hoja 'Trabajadores' del Google Sheet
  const handleCargarNominaDesdeSheet = async (
    customUrl?: string,
    targetDate?: string,
    modo: 'reemplazar_fecha' | 'append' | 'reemplazar_todo' = 'reemplazar_fecha'
  ) => {
    const url = customUrl || getGsheetUrl();
    const effectiveFecha = normalizeDateString(targetDate) || getLocalToday();
    addToast(`📥 Conectando con Google Sheets para cargar nómina de fecha ${effectiveFecha}...`);
    addLog(`📥 Cargando nómina (${modo}) para fecha ${effectiveFecha} desde Google Sheets...`, 'info');

    try {
      // 1. Intentar cargar vía endpoint backend central
      const res = await fetch('/api/cargar-nomina-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          userRole: session?.rol,
          fechaTarget: effectiveFecha,
          modo
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'ok' && Array.isArray(json.trabajadores)) {
          applyServerData({
            trabajadores: json.trabajadores,
            forceNominaUpdate: true,
            action: 'cargar_nomina'
          }, false);
          addToast(`✅ Nómina sincronizada: ${json.count} trabajadores para ${effectiveFecha} (Total en sistema: ${json.totalEnSistema || json.trabajadores.length})`);
          addLog(`✅ Nómina actualizada desde hoja 'Trabajadores': ${json.count} trabajadores (${json.pendientes} pendientes, ${json.asignados} asignados). Total acumulado: ${json.trabajadores.length}`, 'ok');
          return {
            success: true,
            count: json.count,
            totalEnSistema: json.totalEnSistema || json.trabajadores.length,
            pendientes: json.pendientes,
            asignados: json.asignados
          };
        }
      }

      // 2. Si el backend proxy falla o es offline, intentar fetch directo a Google Sheets
      const gRes = await fetch(`${url}?accion=export`);
      if (gRes.ok) {
        const gJson = await gRes.json();
        if (gJson && gJson.status === 'ok' && gJson.data && Array.isArray(gJson.data.trabajadores)) {
          const incoming = gJson.data.trabajadores.map((t: any, idx: number) => {
            const cleanDni = String(t.dni || '').trim();
            const wFecha = t.fecha ? (normalizeDateString(t.fecha) || effectiveFecha) : effectiveFecha;
            return {
              ...t,
              id: t.id || `w_${cleanDni || idx}_${wFecha}`,
              dni: cleanDni,
              fecha: wFecha,
              grupo: t.grupo && String(t.grupo).trim().toLowerCase() !== 'sin grupo' ? String(t.grupo).trim() : '',
              lider: t.lider && !String(t.lider).trim().toLowerCase().includes('sin') ? String(t.lider).trim() : '',
            };
          });

          // Integrar respetando el modo
          handleImportTrabajadores(incoming, modo, effectiveFecha);

          const isAssigned = (w: any) => {
            const g = String(w.grupo || '').trim().toLowerCase();
            const l = String(w.lider || '').trim().toLowerCase();
            const hasG = g && g !== 'sin grupo' && g !== 'sin asignar' && g !== 'ninguno';
            const hasL = l && !l.includes('sin') && l !== 'ninguno' && l !== 'sin asignar';
            return Boolean(hasG && hasL);
          };
          const countAsig = incoming.filter(isAssigned).length;
          const countPend = incoming.length - countAsig;
          addToast(`✅ Nómina cargada directamente: ${incoming.length} trabajadores procesados`);
          return { success: true, count: incoming.length, pendientes: countPend, asignados: countAsig };
        }
      }
      throw new Error('No se pudo obtener la hoja Trabajadores de Google Sheets. Verifica la URL configurada.');
    } catch (err: any) {
      const errMsg = err?.message || 'Error de conexión';
      addToast(`❌ Error al cargar nómina: ${errMsg}`);
      addLog(`❌ Error cargando nómina desde Google Sheets: ${errMsg}`, 'err');
      return { success: false, error: errMsg };
    }
  };

  const handleUpdateDetalleJabas = (updated: DetalleJaba[]) => {
    setDetalleJabasState(updated);
    saveDetalleJabas(updated);
    triggerAutoSync('DetalleJabas Actualizado', { detalleJabas: updated });
  };

  const handleCargarAvanceDesdeSheet = async (customUrl?: string, avanceRows?: any[]) => {
    const url = customUrl || getGsheetUrl();
    addToast('📥 Sincronizando registros de la hoja "Registro_Avance"...');
    addLog('📥 Cargando datos desde la hoja "Registro_Avance" de Google Sheets...', 'info');

    try {
      const res = await fetch('/api/cargar-avance-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, avanceRows, userRole: session?.rol })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'ok' && Array.isArray(json.detalleJabas)) {
          const cleanJabas = sanitizeAndDeduplicateDetalleJabas(json.detalleJabas);
          setDetalleJabasState(cleanJabas);
          saveDetalleJabas(cleanJabas);
          if (Array.isArray(json.trabajadores)) {
            setTrabajadoresState(json.trabajadores);
            saveTrabajadores(json.trabajadores);
          }
          addToast(`✅ Registro de Avance sincronizado: ${json.personasConJabasEnFecha} personas con jabas (${json.jabasEnFecha} jabas)`);
          addLog(`✅ Avance actualizado desde Sheet: ${json.totalRegistros} registros totales (${json.personasConJabasEnFecha} personas con jabas)`, 'ok');
          return {
            success: true,
            totalRegistros: json.totalRegistros,
            personasConJabasEnFecha: json.personasConJabasEnFecha,
            jabasEnFecha: json.jabasEnFecha,
            fechaConsultada: json.fechaConsultada
          };
        }
      }
      throw new Error('No se pudo cargar el Registro de Avance.');
    } catch (err: any) {
      const errMsg = err?.message || 'Error de conexión';
      addToast(`❌ Error al cargar Registro de Avance: ${errMsg}`);
      addLog(`❌ Error cargando avance desde Google Sheets: ${errMsg}`, 'err');
      return { success: false, error: errMsg };
    }
  };

  // If unauthenticated, show field-ready login
  if (!session) {
    return (
      <>
        <LoginScreen 
          onLogin={handleLogin} 
          onToast={addToast} 
          onOpenInstructivo={() => setShowInstructivoModal(true)} 
        />
        <InstructivoModal
          isOpen={showInstructivoModal}
          onClose={() => setShowInstructivoModal(false)}
          onToast={addToast}
        />
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
        firebaseConnected={true}
        autoSyncActive={isAutoSyncEnabled()}
        onRefresh={session.rol === 'Administrador' ? () => fetchCentralizedData(false) : undefined}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenInstructivo={() => setShowInstructivoModal(true)}
        deviceMode={deviceMode}
        onChangeDeviceMode={handleDeviceModeChange}
        offlineNomina={offlineNomina}
        onToggleOfflineNomina={handleToggleOfflineNomina}
        isOnline={isOnline}
        trabajadoresCount={trabajadores.length}
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

        {activeTab === 'programacionDiaria' && (
          <ProgramacionDiariaTab
            session={session}
            programacionesDiarias={programacionesDiarias}
            onSaveProgramacion={handleSaveProgramacionDiaria}
            onDeleteProgramacion={handleDeleteProgramacionDiaria}
            onGoToEjecucion={handleGoToEjecucionFromProgramacion}
            onToast={addToast}
          />
        )}

        {activeTab === 'programa' && (
          <ProgramaWizardTab
            session={session}
            onSavePrograma={handleSavePrograma}
            onToast={addToast}
            programacionesDiarias={programacionesDiarias}
            initialProgramacion={initialProgramacionForEjecucion}
            onClearInitialProgramacion={() => setInitialProgramacionForEjecucion(null)}
          />
        )}

        {activeTab === 'trabajadores' && (
          <TrabajadoresTab
            session={session}
            trabajadores={trabajadores}
            grupos={grupos}
            lideres={lideres}
            usuarios={usuarios}
            modulosPorFundo={modulosPorFundo}
            onSaveModulo={handleSaveModulo}
            onUpdateTrabajadores={handleUpdateTrabajadores}
            onImportTrabajadores={handleImportTrabajadores}
            onReplicarTrabajadoresSheet={handleReplicarTrabajadoresSheet}
            onSaveTrabajador={handleSaveTrabajador}
            onSaveLider={handleSaveLider}
            onDeleteLider={handleDeleteLider}
            onSaveSupervisor={handleSaveSupervisor}
            onDeleteSupervisor={handleDeleteSupervisor}
            onSaveGrupo={handleSaveGrupo}
            onSaveAvance={handleSaveAvance}
            onReplicarAvanceSheet={handleReplicarAvanceSheet}
            detalleJabas={detalleJabas}
            onUpdateDetalleJabas={handleUpdateDetalleJabas}
            reservas={reservas}
            onSaveReserva={handleSaveReserva}
            onDeleteReserva={handleDeleteReserva}
            onToast={addToast}
            offlineNomina={offlineNomina}
            onToggleOfflineNomina={handleToggleOfflineNomina}
            onRestoreOfflineCache={handleRestoreOfflineCache}
            isOnline={isOnline}
            onDepurarTrabajadoresAyer={handleDepurarTrabajadoresAyer}
            onCargarNominaDesdeSheet={handleCargarNominaDesdeSheet}
            onCargarAvanceDesdeSheet={handleCargarAvanceDesdeSheet}
            onRecargarNominaServidor={handleRecargarNominaServidor}
            onOpenInstructivo={() => setShowInstructivoModal(true)}
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
            reservas={reservas}
            onSaveValidacion={handleSaveValidacion}
            onDeleteValidacion={handleDeleteValidacion}
            onDeleteLider={handleDeleteLider}
            onToast={addToast}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            programas={programas}
            programaGeneral={programaGeneral}
            detalleJabas={detalleJabas}
            trabajadores={trabajadores}
            validaciones={validaciones}
            onRefresh={() => fetchCentralizedData(false)}
            onToast={addToast}
          />
        )}

        {activeTab === 'reportes' && (
          <ReportesTab
            programas={programas}
            programaGeneral={programaGeneral}
            detalleJabas={detalleJabas}
            trabajadores={trabajadores}
            validaciones={validaciones}
            userRole={session?.rol}
            onUpdateDetalleJabas={handleUpdateDetalleJabas}
            onRefresh={() => fetchCentralizedData(false)}
            onToast={addToast}
          />
        )}

        {activeTab === 'usuarios' && (
          <UsuariosTab
            usuarios={usuarios}
            onSaveUsuarios={handleSaveUsuarios}
            onToast={addToast}
            session={session}
          />
        )}

        {activeTab === 'importar' && (
          <ImportarTab
            session={session}
            trabajadores={trabajadores}
            onImportTrabajadores={handleImportTrabajadores}
            onToast={addToast}
            offlineNomina={offlineNomina}
            onToggleOfflineNomina={handleToggleOfflineNomina}
            onDepurarTrabajadoresAyer={handleDepurarTrabajadoresAyer}
            onNavigateToGruposLideres={() => setActiveTab('gruposLideres')}
          />
        )}

        {activeTab === 'gruposLideres' && (
          <GruposLideresTab
            session={session}
            trabajadores={trabajadores}
            grupos={grupos}
            lideres={lideres}
            onSaveGrupo={handleSaveGrupo}
            onDeleteGrupo={handleDeleteGrupo}
            onSaveLider={handleSaveLider}
            onDeleteLider={handleDeleteLider}
            onUpdateTrabajadores={handleUpdateTrabajadores}
            onToast={addToast}
            onNavigateToCargaNomina={() => setActiveTab('importar')}
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
            onDataLoadedFromCloud={(data) => applyServerData(data, true)}
            offlineNomina={offlineNomina}
            onToggleOfflineNomina={handleToggleOfflineNomina}
            isOnline={isOnline}
          />
        )}
      </main>

      {/* Share Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onToast={addToast}
      />

      {/* Instructivo Modal */}
      <InstructivoModal
        isOpen={showInstructivoModal}
        onClose={() => setShowInstructivoModal(false)}
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
