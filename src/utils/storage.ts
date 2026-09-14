import { 
  Usuario, 
  Trabajador, 
  Programa, 
  ProgramaGeneral, 
  DetalleJaba, 
  Lider, 
  UserSession, 
  UserRole,
  SyncLogEntry, 
  FirebaseConfig,
  ValidacionSupervisor,
  ReservaCuadrilla,
  AuditoriaIngreso
} from '../types';
import { 
  INITIAL_USUARIOS, 
  INITIAL_TRABAJADORES, 
  INITIAL_PROGRAMAS, 
  INITIAL_PROGRAMA_GENERAL, 
  INITIAL_GRUPOS,
  INITIAL_MODULOS_POR_FUNDO 
} from '../data/initialData';

const KEYS = {
  SESSION: 'recojoFrutosSesion',
  USUARIOS: 'recojoFrutosUsuarios',
  PROGRAMAS: 'recojoFrutosProgramas',
  PROGRAMA_GENERAL: 'recojoFrutosProgramaGeneral',
  TRABAJADORES: 'recojoFrutosTrabajadores',
  AVANCE: 'recojoFrutosAvance',
  DETALLE_JABAS: 'recojoFrutosDetalleJabas',
  GRUPOS: 'recojoFrutosGrupos',
  LIDERES: 'recojoFrutosLideres',
  MODULOS_POR_FUNDO: 'recojoFrutosModulosPorFundo',
  GSHEET_URL: 'recojoFrutosGsheetUrl',
  AUTO_SYNC: 'recojoFrutosAutoSync',
  AUTO_SYNC_QUEUE: 'recojoFrutosAutoSyncCola',
  LAST_SYNC: 'recojoFrutosLastSync',
  FIREBASE_CONFIG: 'recojoFrutosFirebaseConfig',
  VALIDACIONES: 'recojoFrutosValidaciones',
  RESERVAS: 'recojoFrutosReservas',
  AUDITORIA_INGRESOS: 'recojoFrutosAuditoriaIngresos',
  OFFLINE_NOMINA_LOCKED: 'recojoFrutosOfflineNominaLocked',
  TRABAJADORES_OFFLINE_CACHE: 'recojoFrutosTrabajadoresOfflineCache',
  FECHA_ULTIMA_DEPURACION: 'recojoFrutosFechaUltimaDepuracion'
};

// Date helpers
export function getLocalToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalISO(): string {
  return new Date().toISOString();
}

export function normalizeDateString(d?: any): string {
  if (!d) return '';
  if (typeof d !== 'string') {
    if (d instanceof Date && !isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    d = String(d);
  }
  const str = d.trim();
  if (!str) return '';

  // 1. If starts with YYYY-MM-DD (e.g. "2026-08-25", "2026-08-25T01:23:45.000Z")
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // 2. If starts with DD/MM/YYYY (e.g. "25/08/2026", "25/8/2026")
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }

  // 3. If textual month format e.g. "Fri Sep 11 2026 00:00:00 GMT-0500" or "Sep 11 2026"
  const textDateMatch = str.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
  if (textDateMatch) {
    const mStr = textDateMatch[1].toLowerCase();
    const months: Record<string, string> = {
      jan: '01', ene: '01', feb: '02', mar: '03', apr: '04', abr: '04',
      may: '05', jun: '06', jul: '07', aug: '08', ago: '08', sep: '09',
      set: '09', oct: '10', nov: '11', dec: '12', dic: '12'
    };
    const m = months[mStr];
    if (m) {
      const day = textDateMatch[2].padStart(2, '0');
      const year = textDateMatch[3];
      return `${year}-${m}-${day}`;
    }
  }

  // 4. If textual format e.g. "11 Sep 2026" or "11 de Septiembre de 2026"
  const textDateMatch2 = str.match(/(\d{1,2})\s+(?:de\s+)?([A-Za-z]{3,})\s+(?:de\s+)?(\d{4})/);
  if (textDateMatch2) {
    const day = textDateMatch2[1].padStart(2, '0');
    const mStr = textDateMatch2[2].slice(0, 3).toLowerCase();
    const months: Record<string, string> = {
      jan: '01', ene: '01', feb: '02', mar: '03', apr: '04', abr: '04',
      may: '05', jun: '06', jul: '07', aug: '08', ago: '08', sep: '09',
      set: '09', oct: '10', nov: '11', dec: '12', dic: '12'
    };
    const m = months[mStr];
    if (m) {
      const year = textDateMatch2[3];
      return `${year}-${m}-${day}`;
    }
  }

  // 5. If JavaScript Date string that can be parsed
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str.split('T')[0].split(' ')[0].trim();
}

/** Formats any date string (YYYY-MM-DD, ISO timestamp, DD/MM/YYYY) to DD/MM/YYYY (ej: 25/08/2026) */
export function formatDateDDMMAAAA(d?: string): string {
  if (!d) return '';
  const trimmed = d.split('T')[0].split(' ')[0].trim();
  if (!trimmed) return '';
  
  // If already DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  
  // If YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  
  // If Date object parsable
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  return trimmed;
}

// Auto-repair, wipe backup data & sanity check
export function initializeStorage() {
  try {
    const WIPE_VERSION_KEY = 'recojoFrutosDataVersion';
    const TARGET_VERSION = 'v107_reset_realtime_trabajadores_table';
    
    // Check if this browser needs a clean wipe of all backup and cached data
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(KEYS.OFFLINE_NOMINA_LOCKED);
      if (localStorage.getItem(WIPE_VERSION_KEY) !== TARGET_VERSION) {
        wipeAllBackupData(false);
        localStorage.setItem(WIPE_VERSION_KEY, TARGET_VERSION);
      }
    }

    // Always ensure login screen is required on shared links or when login parameter is present
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isSharedOrExplicitLogin = 
        urlParams.get('shared') === '1' || 
        urlParams.get('login') === '1' || 
        urlParams.get('auth') === '1' ||
        window.location.hostname.includes('ais-pre-');
        
      if (isSharedOrExplicitLogin) {
        clearSession();
      }

      const cloudUrl = urlParams.get('cloud') || urlParams.get('gsheet');
      if (cloudUrl) {
        try {
          const decoded = decodeURIComponent(cloudUrl);
          if (decoded.startsWith('http')) {
            localStorage.setItem(KEYS.GSHEET_URL, decoded);
            localStorage.setItem(KEYS.AUTO_SYNC, '1');
          }
        } catch {}
      }
    }

    // Check & Seed Usuarios (Clean Admin Only)
    const rawUsers = localStorage.getItem(KEYS.USUARIOS);
    if (!rawUsers) {
      localStorage.setItem(KEYS.USUARIOS, JSON.stringify(INITIAL_USUARIOS));
    } else {
      try {
        const parsed = JSON.parse(rawUsers);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          localStorage.setItem(KEYS.USUARIOS, JSON.stringify(INITIAL_USUARIOS));
        }
      } catch {
        localStorage.setItem(KEYS.USUARIOS, JSON.stringify(INITIAL_USUARIOS));
      }
    }

    // Check & Seed Trabajadores
    if (!localStorage.getItem(KEYS.TRABAJADORES)) {
      localStorage.setItem(KEYS.TRABAJADORES, JSON.stringify(INITIAL_TRABAJADORES));
    }

    // Check & Seed Programas
    if (!localStorage.getItem(KEYS.PROGRAMAS)) {
      localStorage.setItem(KEYS.PROGRAMAS, JSON.stringify(INITIAL_PROGRAMAS));
    }

    // Check & Seed Programa General
    if (!localStorage.getItem(KEYS.PROGRAMA_GENERAL)) {
      localStorage.setItem(KEYS.PROGRAMA_GENERAL, JSON.stringify(INITIAL_PROGRAMA_GENERAL));
    }

    // Check & Seed Grupos
    if (!localStorage.getItem(KEYS.GRUPOS)) {
      localStorage.setItem(KEYS.GRUPOS, JSON.stringify(INITIAL_GRUPOS));
    }

    // Sanitize Avance & DetalleJabas if corrupt
    const avRaw = localStorage.getItem(KEYS.AVANCE);
    if (avRaw) {
      try {
        const parsed = JSON.parse(avRaw);
        if (typeof parsed !== 'object') {
          localStorage.setItem(KEYS.AVANCE, JSON.stringify({}));
        }
      } catch {
        localStorage.setItem(KEYS.AVANCE, JSON.stringify({}));
      }
    } else {
      localStorage.setItem(KEYS.AVANCE, JSON.stringify({}));
    }

    // Initialize DetalleJabas (clean start)
    if (!localStorage.getItem(KEYS.DETALLE_JABAS)) {
      localStorage.setItem(KEYS.DETALLE_JABAS, JSON.stringify([]));
    }
  } catch (e) {
    console.warn('Storage init fallback:', e);
  }
}

// Completely wipe all backup, test, and historical data from localStorage
export function wipeAllBackupData(clearAuth: boolean = false) {
  try {
    if (typeof localStorage === 'undefined') return;

    // 1. Reset standard app datasets to clean empty arrays
    localStorage.setItem(KEYS.TRABAJADORES, JSON.stringify([]));
    localStorage.setItem(KEYS.PROGRAMAS, JSON.stringify([]));
    localStorage.setItem(KEYS.PROGRAMA_GENERAL, JSON.stringify([]));
    localStorage.setItem(KEYS.DETALLE_JABAS, JSON.stringify([]));
    localStorage.setItem(KEYS.AVANCE, JSON.stringify({}));
    localStorage.setItem(KEYS.VALIDACIONES, JSON.stringify([]));
    localStorage.setItem(KEYS.LIDERES, JSON.stringify([]));
    localStorage.setItem(KEYS.GRUPOS, JSON.stringify([]));
    localStorage.setItem(KEYS.RESERVAS, JSON.stringify([]));
    localStorage.setItem(KEYS.AUTO_SYNC_QUEUE, JSON.stringify([]));
    localStorage.removeItem(KEYS.TRABAJADORES_OFFLINE_CACHE);
    localStorage.removeItem(KEYS.FECHA_ULTIMA_DEPURACION);

    // Reset sync timestamps so fresh sync pulls cleanly
    localStorage.removeItem(KEYS.LAST_SYNC);

    // 2. Scan and delete any ad-hoc backup keys in localStorage
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const lower = k.toLowerCase();
        if (
          lower.includes('backup') || 
          lower.includes('bak') || 
          lower.includes('temp') || 
          lower.includes('historial') ||
          lower.includes('old')
        ) {
          keysToDelete.push(k);
        }
      }
    }
    keysToDelete.forEach(k => localStorage.removeItem(k));

    if (clearAuth) {
      clearSession();
    }
  } catch (e) {
    console.error('Error wiping backup data:', e);
  }
}

// Reset all test records to a completely clean state
export function resetAllData() {
  wipeAllBackupData(false);
}


// Session Management (Uses sessionStorage to strictly require login on shared links & new browser tabs)
export function getSession(): UserSession | null {
  try {
    // 1. Check sessionStorage (active tab session)
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(KEYS.SESSION);
      if (raw) {
        return JSON.parse(raw);
      }
    }
    // Shared or fresh links do not inherit sessions from localStorage
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession) {
  try {
    // Active session stored in sessionStorage for current tab
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    }
    // Clean any persistent localStorage session to guarantee that shared links ask for login
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(KEYS.SESSION);
    }
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

export function clearSession() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(KEYS.SESSION);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(KEYS.SESSION);
    }
  } catch {}
}

// Usuarios
export function getUsuarios(): Usuario[] {
  try {
    const raw = localStorage.getItem(KEYS.USUARIOS);
    if (!raw) return INITIAL_USUARIOS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_USUARIOS;
  } catch {
    return INITIAL_USUARIOS;
  }
}

export function saveUsuarios(usuarios: Usuario[]) {
  localStorage.setItem(KEYS.USUARIOS, JSON.stringify(usuarios));
}

// Auditoría de Ingresos
export function getAuditoriaIngresos(): AuditoriaIngreso[] {
  try {
    const raw = localStorage.getItem(KEYS.AUDITORIA_INGRESOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuditoriaIngresos(auditoria: AuditoriaIngreso[]) {
  try {
    localStorage.setItem(KEYS.AUDITORIA_INGRESOS, JSON.stringify(auditoria));
  } catch (e) {
    console.error('Error saving auditoria de ingresos:', e);
  }
}

export function addAuditoriaIngreso(entry: AuditoriaIngreso) {
  try {
    const current = getAuditoriaIngresos();
    // Prepend new audit entry, limit to last 1000 items
    const updated = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 1000);
    saveAuditoriaIngresos(updated);
  } catch (e) {
    console.error('Error adding auditoria de ingreso:', e);
  }
}

export function mergeAuditoriasArrays(base: AuditoriaIngreso[], incoming: AuditoriaIngreso[]): AuditoriaIngreso[] {
  const map = new Map<string, AuditoriaIngreso>();
  (base || []).forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });
  (incoming || []).forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });
  return Array.from(map.values()).sort((a, b) => {
    return new Date(b.timestamp || b.fecha).getTime() - new Date(a.timestamp || a.fecha).getTime();
  });
}

// Trabajadores & Modo Offline Nómina
export function isOfflineNominaLocked(): boolean {
  try {
    const val = localStorage.getItem(KEYS.OFFLINE_NOMINA_LOCKED);
    if (val !== null) {
      return val === 'true';
    }
    return false;
  } catch {
    return false;
  }
}

export function setOfflineNominaLocked(locked: boolean): void {
  try {
    localStorage.setItem(KEYS.OFFLINE_NOMINA_LOCKED, locked ? 'true' : 'false');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline-nomina-changed', { detail: { locked } }));
    }
  } catch (e) {
    console.error('Error saving offline nomina lock:', e);
  }
}

export function getFechaUltimaDepuracion(): string {
  try {
    return localStorage.getItem(KEYS.FECHA_ULTIMA_DEPURACION) || '';
  } catch {
    return '';
  }
}

export function setFechaUltimaDepuracion(fecha: string): void {
  try {
    localStorage.setItem(KEYS.FECHA_ULTIMA_DEPURACION, fecha);
  } catch {}
}

export function getTrabajadoresOfflineCache(): Trabajador[] {
  try {
    const raw = localStorage.getItem(KEYS.TRABAJADORES_OFFLINE_CACHE);
    if (!raw) return [];
    const list: Trabajador[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function restoreTrabajadoresFromOfflineCache(): Trabajador[] {
  const cached = getTrabajadoresOfflineCache();
  if (cached.length > 0) {
    saveTrabajadores(cached);
    setOfflineNominaLocked(true);
  }
  return cached;
}

export function getTrabajadores(): Trabajador[] {
  try {
    const raw = localStorage.getItem(KEYS.TRABAJADORES);
    let list: Trabajador[] = [];

    if (raw === null) {
      // Primera vez absoluto sin inicializar
      list = [];
      try {
        localStorage.setItem(KEYS.TRABAJADORES, JSON.stringify([]));
      } catch {}
    } else {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }

    if (!Array.isArray(list)) {
      list = [];
    }

    const seen = new Set<string>();
    const unique: Trabajador[] = [];
    (Array.isArray(list) ? list : []).forEach((t, i) => {
      const cleanDni = String(t.dni || '').replace(/\s+/g, '').trim();
      const tFecha = t.fecha ? normalizeDateString(t.fecha) : '';
      const key = cleanDni ? `${cleanDni}__${tFecha || 's_f'}` : (t.id ? `${t.id}__${tFecha}` : `idx_${i}__${tFecha}__${t.nombres}`);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          ...t,
          dni: cleanDni || String(t.dni || '').trim()
        });
      }
    });
    return unique;
  } catch {
    return [];
  }
}

export function saveTrabajadores(trabajadores: Trabajador[]) {
  const seen = new Set<string>();
  const unique: Trabajador[] = [];
  (Array.isArray(trabajadores) ? trabajadores : []).forEach((t, i) => {
    const cleanDni = String(t.dni || '').replace(/\s+/g, '').trim();
    const tFecha = t.fecha ? normalizeDateString(t.fecha) : '';
    const key = cleanDni ? `${cleanDni}__${tFecha || 's_f'}` : (t.id ? `${t.id}__${tFecha}` : `idx_${i}__${tFecha}__${t.nombres}`);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        ...t,
        dni: cleanDni || String(t.dni || '').trim()
      });
    }
  });
  localStorage.setItem(KEYS.TRABAJADORES, JSON.stringify(unique));
  // Respaldo permanente offline solo si hay trabajadores cargados válidos
  if (unique.length > 0) {
    try {
      localStorage.setItem(KEYS.TRABAJADORES_OFFLINE_CACHE, JSON.stringify(unique));
    } catch {}
  } else {
    // Si la nómina está vacía (borrada o depurada), limpiar caché offline para que no reviva
    try {
      localStorage.removeItem(KEYS.TRABAJADORES_OFFLINE_CACHE);
    } catch {}
  }
}

/**
 * Agrupa los trabajadores por fecha y devuelve el desglose de conteos.
 */
export function getFechasDisponiblesTrabajadores(list?: Trabajador[]): { fecha: string; count: number; display: string }[] {
  const workers = Array.isArray(list) ? list : getTrabajadores();
  const mapFechas = new Map<string, number>();
  workers.forEach((t) => {
    const fNorm = t.fecha ? normalizeDateString(t.fecha) : '';
    const key = fNorm || 'sin_fecha';
    mapFechas.set(key, (mapFechas.get(key) || 0) + 1);
  });

  const res: { fecha: string; count: number; display: string }[] = [];
  mapFechas.forEach((count, fechaKey) => {
    let display = fechaKey;
    if (fechaKey === 'sin_fecha') {
      display = 'Sin Fecha Asignada';
    } else {
      const parts = fechaKey.split('-');
      if (parts.length === 3) {
        display = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    res.push({ fecha: fechaKey, count, display });
  });

  // Ordenar de más reciente a más antiguo
  return res.sort((a, b) => {
    if (a.fecha === 'sin_fecha') return 1;
    if (b.fecha === 'sin_fecha') return -1;
    return b.fecha.localeCompare(a.fecha);
  });
}

/**
 * Obtiene los trabajadores filtrados por fecha específica.
 * Si fecha es vacía o 'todas', devuelve la lista completa.
 */
export function getTrabajadoresPorFecha(fecha?: string, list?: Trabajador[]): Trabajador[] {
  const workers = Array.isArray(list) ? list : getTrabajadores();
  if (!fecha || fecha === 'todas') return workers;
  const targetNorm = normalizeDateString(fecha);
  if (!targetNorm) return workers;

  const hoy = getLocalToday();
  return workers.filter((t) => {
    const fn = t.fecha ? normalizeDateString(t.fecha) : '';
    if (!fn) {
      // Los trabajadores sin fecha se consideran de hoy para compatibilidad
      return targetNorm === hoy;
    }
    return fn === targetNorm;
  });
}

/**
 * Actualiza únicamente el grupo y/o líder de trabajadores existentes en la nómina,
 * sin alterar la carga base de nómina (DNI, nombres, fecha, etc.).
 */
export function actualizarGruposYLideresTrabajadores(
  asignaciones: { dni: string; grupo?: string; lider?: string }[]
): Trabajador[] {
  const current = getTrabajadores();
  if (!Array.isArray(asignaciones) || asignaciones.length === 0) return current;

  const mapAsign = new Map<string, { grupo?: string; lider?: string }>();
  asignaciones.forEach((a) => {
    const cleanDni = String(a.dni || '').replace(/\D/g, '').trim();
    if (cleanDni) {
      mapAsign.set(cleanDni, a);
    }
  });

  const updated = current.map((t) => {
    const cleanDni = String(t.dni || '').replace(/\D/g, '').trim();
    const asig = mapAsign.get(cleanDni);
    if (asig) {
      return {
        ...t,
        grupo: asig.grupo !== undefined ? asig.grupo : (t.grupo || ''),
        lider: asig.lider !== undefined ? asig.lider : (t.lider || '')
      };
    }
    return t;
  });

  saveTrabajadores(updated);
  return updated;
}

/**
 * Depura los trabajadores de la nómina del día anterior o días previos.
 * Garantiza que no se queden guardados en la memoria local ni en el caché offline.
 */
export function depurarTrabajadoresDiaAnterior(targetDate?: string): { eliminados: number; restantes: Trabajador[]; depurados: Trabajador[] } {
  const hoy = targetDate || getLocalToday();
  const rawWorkers = getTrabajadores();

  const eliminadosList: Trabajador[] = [];
  const restantes: Trabajador[] = [];

  rawWorkers.forEach((t) => {
    const tFecha = t.fecha ? normalizeDateString(t.fecha) : '';
    // Si tiene fecha asignada y es anterior a hoy, se depura
    if (tFecha && tFecha < hoy) {
      eliminadosList.push(t);
    } else {
      restantes.push(t);
    }
  });

  // Guardar lista limpia
  saveTrabajadores(restantes);
  setFechaUltimaDepuracion(hoy);

  // Asegurar que el cache offline tampoco tenga trabajadores de fechas anteriores
  try {
    if (restantes.length > 0) {
      localStorage.setItem(KEYS.TRABAJADORES_OFFLINE_CACHE, JSON.stringify(restantes));
    } else {
      localStorage.removeItem(KEYS.TRABAJADORES_OFFLINE_CACHE);
    }
  } catch {}

  // Notificar por evento local
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('trabajadores-depurados', {
          detail: {
            fecha: hoy,
            eliminados: eliminadosList.length,
            restantes: restantes.length
          }
        })
      );
    } catch {}
  }

  return {
    eliminados: eliminadosList.length,
    restantes,
    depurados: restantes
  };
}

/**
 * Filtra los trabajadores según el rol del usuario actual.
 * Para el rol 'Trabajador', NUNCA deben mostrarse trabajadores con fecha del día anterior.
 */
export function filterTrabajadoresParaRol(trabajadores: Trabajador[], rol?: UserRole): Trabajador[] {
  if (!Array.isArray(trabajadores)) return [];
  if (rol === 'Trabajador') {
    const hoy = getLocalToday();
    return trabajadores.filter((t) => {
      if (!t.fecha) return true;
      const fNorm = normalizeDateString(t.fecha);
      // Excluir tajantemente trabajadores con fecha anterior a hoy para el rol Trabajador
      return fNorm >= hoy;
    });
  }
  return trabajadores;
}

// Programas
export function getProgramas(): Programa[] {
  try {
    const raw = localStorage.getItem(KEYS.PROGRAMAS);
    return raw ? JSON.parse(raw) : INITIAL_PROGRAMAS;
  } catch {
    return INITIAL_PROGRAMAS;
  }
}

export function saveProgramas(programas: Programa[]) {
  localStorage.setItem(KEYS.PROGRAMAS, JSON.stringify(programas));
}

// Programa General
export function getProgramaGeneral(): ProgramaGeneral[] {
  try {
    const raw = localStorage.getItem(KEYS.PROGRAMA_GENERAL);
    return raw ? JSON.parse(raw) : INITIAL_PROGRAMA_GENERAL;
  } catch {
    return INITIAL_PROGRAMA_GENERAL;
  }
}

export function saveProgramaGeneral(list: ProgramaGeneral[]) {
  localStorage.setItem(KEYS.PROGRAMA_GENERAL, JSON.stringify(list));
}

// Detalle Jabas - Sanitización, deduplicación y persistencia limpia
export function sanitizeAndDeduplicateDetalleJabas(list: DetalleJaba[]): DetalleJaba[] {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, DetalleJaba>();

  list.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const rawDni = String(item.dni || '').trim();
    const cleanDni = rawDni.replace(/\D/g, '') || rawDni;
    const trabajador = String(item.trabajador || '').trim();
    const jabas = Number(item.jabas) || 0;

    // Rechazar estrictamente registros fantasmas (sin persona o con jabas <= 0)
    if ((!cleanDni && !trabajador) || jabas <= 0 || isNaN(jabas)) {
      return;
    }

    let normFecha = normalizeDateString(item.fecha || '');
    if (!normFecha && item.timestamp) {
      normFecha = normalizeDateString(item.timestamp);
    }
    if (!normFecha) {
      normFecha = getLocalToday();
    }

    const normModulo = String(item.modulo || 'M01').trim().toUpperCase();
    const cleanId = String(item.id || '').trim();
    const primaryKey = cleanId || `${normFecha}_${cleanDni}_${normModulo}`;

    const cleanRecord: DetalleJaba = {
      id: cleanId || primaryKey,
      fecha: normFecha,
      timestamp: item.timestamp || new Date().toISOString(),
      supervisor: String(item.supervisor || '').trim(),
      fundo: String(item.fundo || 'Santa Teresa').trim(),
      modulo: normModulo,
      grupo: String(item.grupo || '').trim(),
      lider: String(item.lider || '').trim(),
      dni: cleanDni,
      trabajador: trabajador || (cleanDni ? `Trabajador ${cleanDni}` : 'Sin Nombre'),
      jabas: Math.round(jabas)
    };

    if (map.has(primaryKey)) {
      const existing = map.get(primaryKey)!;
      map.set(primaryKey, {
        ...existing,
        ...cleanRecord,
        id: existing.id || cleanRecord.id,
        jabas: Math.max(Number(existing.jabas) || 0, cleanRecord.jabas),
        trabajador: cleanRecord.trabajador && !cleanRecord.trabajador.startsWith('Trabajador ') ? cleanRecord.trabajador : existing.trabajador,
        supervisor: cleanRecord.supervisor || existing.supervisor,
        grupo: cleanRecord.grupo || existing.grupo,
        lider: cleanRecord.lider || existing.lider
      });
    } else {
      map.set(primaryKey, cleanRecord);
    }
  });

  return Array.from(map.values());
}

export function getDetalleJabas(): DetalleJaba[] {
  try {
    const raw = localStorage.getItem(KEYS.DETALLE_JABAS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeAndDeduplicateDetalleJabas(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export function saveDetalleJabas(list: DetalleJaba[]) {
  const sanitized = sanitizeAndDeduplicateDetalleJabas(list);
  localStorage.setItem(KEYS.DETALLE_JABAS, JSON.stringify(sanitized));
}

export function deleteDetalleJabaFromStorage(id: string): DetalleJaba[] {
  const current = getDetalleJabas();
  const targetId = String(id || '').trim();
  const updated = current.filter(d => String(d.id || '').trim() !== targetId);
  saveDetalleJabas(updated);
  return updated;
}

export function deleteDetalleJabasFromStorage(ids: string[]): DetalleJaba[] {
  const current = getDetalleJabas();
  const targetSet = new Set(ids.map(i => String(i || '').trim()));
  const updated = current.filter(d => !targetSet.has(String(d.id || '').trim()));
  saveDetalleJabas(updated);
  return updated;
}

// Avance Actual
export function getAvanceMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEYS.AVANCE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAvanceMap(map: Record<string, number>) {
  localStorage.setItem(KEYS.AVANCE, JSON.stringify(map));
}

// Grupos
export function getGrupos(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.GRUPOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveGrupos(grupos: string[]) {
  localStorage.setItem(KEYS.GRUPOS, JSON.stringify(grupos));
}

// Lideres
export function getLideres(): Lider[] {
  try {
    const raw = localStorage.getItem(KEYS.LIDERES);
    if (raw) {
      const parsed: Lider[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Clean & deduplicate by normalized name
        const map = new Map<string, Lider>();
        parsed.forEach((l) => {
          const name = (l.lider || l.nombres || '').trim();
          if (name) {
            const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if (!map.has(key)) {
              map.set(key, {
                lider: name,
                dni: l.dni || '',
                nombres: l.nombres || name,
                fechaAlta: l.fechaAlta || getLocalToday()
              });
            } else if (l.dni && !map.get(key)!.dni) {
              map.get(key)!.dni = l.dni;
            }
          }
        });
        return Array.from(map.values());
      }
    }
  } catch {}
  return [];
}

export function saveLideres(lideres: Lider[]) {
  localStorage.setItem(KEYS.LIDERES, JSON.stringify(lideres));
}

// Modulos por Fundo
export function getModulosPorFundo(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(KEYS.MODULOS_POR_FUNDO);
    const customMap: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    
    // Merge defaults with custom modulos
    const merged: Record<string, string[]> = { ...INITIAL_MODULOS_POR_FUNDO };
    Object.keys(customMap).forEach((fundo) => {
      const existing = merged[fundo] || [];
      const set = new Set<string>(existing);
      if (Array.isArray(customMap[fundo])) {
        customMap[fundo].forEach((m) => {
          if (m && typeof m === 'string' && m.trim()) {
            set.add(m.trim().toUpperCase());
          }
        });
      }
      merged[fundo] = Array.from(set).sort();
    });

    return merged;
  } catch {
    return { ...INITIAL_MODULOS_POR_FUNDO };
  }
}

export function saveModulosPorFundo(map: Record<string, string[]>) {
  try {
    localStorage.setItem(KEYS.MODULOS_POR_FUNDO, JSON.stringify(map));
  } catch (e) {
    console.warn('Error saving modulos:', e);
  }
}

export function addModuloToFundo(fundo: string, modulo: string): Record<string, string[]> {
  const current = getModulosPorFundo();
  const cleanFundo = (fundo || 'General').trim();
  const cleanMod = modulo.trim().toUpperCase();
  if (!cleanMod) return current;

  const currentList = current[cleanFundo] || [];
  if (!currentList.includes(cleanMod)) {
    current[cleanFundo] = [...currentList, cleanMod].sort();
    saveModulosPorFundo(current);
  }
  return current;
}

// Reservas de Cuadrilla por Supervisor
export function normalizeSupervisorKey(sup?: string): string {
  if (!sup) return '';
  return sup
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function mergeReservasArrays(
  listA: ReservaCuadrilla[] = [],
  listB: ReservaCuadrilla[] = []
): ReservaCuadrilla[] {
  const map = new Map<string, ReservaCuadrilla>();
  const all = [...(listA || []), ...(listB || [])];

  for (const item of all) {
    if (!item || !item.id) continue;

    if (map.has(item.id)) {
      const prev = map.get(item.id)!;
      if ((item.timestamp || '') >= (prev.timestamp || '')) {
        map.set(item.id, item);
      }
      continue;
    }

    // Check if there is an existing reservation with the same date, supervisor, fundo, modulo and grupo
    const normSup = normalizeSupervisorKey(item.supervisor);
    const itemGrp = (item.grupo || 'Grupo 01').trim().toLowerCase();
    const existingMatch = Array.from(map.values()).find(
      (e) =>
        e.fecha === item.fecha &&
        normalizeSupervisorKey(e.supervisor) === normSup &&
        e.fundo === item.fundo &&
        e.modulo === item.modulo &&
        (e.grupo || 'Grupo 01').trim().toLowerCase() === itemGrp
    );

    if (existingMatch) {
      if ((item.timestamp || '') >= (existingMatch.timestamp || '')) {
        map.delete(existingMatch.id);
        map.set(item.id, item);
      }
    } else {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    (b.timestamp || '').localeCompare(a.timestamp || '')
  );
}

export function getReservas(): ReservaCuadrilla[] {
  try {
    const raw = localStorage.getItem(KEYS.RESERVAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReservas(reservas: ReservaCuadrilla[]) {
  try {
    localStorage.setItem(KEYS.RESERVAS, JSON.stringify(reservas));
  } catch (e) {
    console.warn('Error saving reservas:', e);
  }
}

export function saveSingleReserva(newReserva: ReservaCuadrilla): ReservaCuadrilla[] {
  const current = getReservas();
  const merged = mergeReservasArrays(current, [newReserva]);
  saveReservas(merged);
  return merged;
}

// Google Sheets Web App Config
export const DEFAULT_GSHEET_URL = 'https://script.google.com/macros/s/AKfycbwUwC4PwsVrEGdGItPkAwu8-k8lJePnEIwitNhakUGqHEKWLZLr_i49FMMDh-fog0y2/exec';

export function getGsheetUrl(): string {
  try {
    const saved = localStorage.getItem(KEYS.GSHEET_URL);
    return saved !== null && saved !== '' ? saved : DEFAULT_GSHEET_URL;
  } catch {
    return DEFAULT_GSHEET_URL;
  }
}

export function saveGsheetUrl(url: string) {
  if (!url) {
    localStorage.removeItem(KEYS.GSHEET_URL);
  } else {
    localStorage.setItem(KEYS.GSHEET_URL, url);
  }
}

// Auto-Sync Settings - default to enabled
export function isAutoSyncEnabled(): boolean {
  try {
    const setting = localStorage.getItem(KEYS.AUTO_SYNC);
    return setting !== '0'; // Defaults to true unless explicitly disabled
  } catch {
    return true;
  }
}

export function setAutoSyncEnabled(enabled: boolean) {
  localStorage.setItem(KEYS.AUTO_SYNC, enabled ? '1' : '0');
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(KEYS.LAST_SYNC);
  } catch {
    return null;
  }
}

export function setLastSyncTime(isoDate: string) {
  localStorage.setItem(KEYS.LAST_SYNC, isoDate);
}

// Firebase Config
export function getFirebaseConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(KEYS.FIREBASE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.databaseURL) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveFirebaseConfig(cfg: FirebaseConfig | null) {
  if (!cfg) {
    localStorage.removeItem(KEYS.FIREBASE_CONFIG);
  } else {
    localStorage.setItem(KEYS.FIREBASE_CONFIG, JSON.stringify(cfg));
  }
}

// Validaciones por Supervisor Sanitizer
export function isValidValidacion(v: any): boolean {
  if (!v || typeof v !== 'object') return false;
  const id = typeof v.id === 'string' ? v.id.trim() : '';
  const fecha = typeof v.fecha === 'string' ? v.fecha.trim() : '';
  const supervisor = typeof v.supervisor === 'string' ? v.supervisor.trim() : '';
  const totalTrab = Number(v.totalTrabajadores) || 0;
  const totalJab = Number(v.totalJabas) || 0;
  const confJab = Number(v.jabasConformes) || 0;
  const itemsCount = Array.isArray(v.items) ? v.items.length : 0;

  // Strict check: An empty record has no id (or empty ID), no date, no supervisor, 0 workers and 0 jabas
  if (!id && !fecha && !supervisor) return false;
  if (!id && totalTrab === 0 && totalJab === 0 && itemsCount === 0) return false;
  if (id === '' && fecha === '' && totalTrab === 0 && totalJab === 0 && confJab === 0 && itemsCount === 0) return false;
  
  // If id starts with 'VAL_' or has actual content, and has at least some data
  return true;
}

export function cleanValidacionesList(list: any[]): ValidacionSupervisor[] {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set<string>();
  const cleaned: ValidacionSupervisor[] = [];

  list.forEach((v) => {
    if (!v || typeof v !== 'object') return;
    const rawId = typeof v.id === 'string' ? v.id.trim() : '';
    const rawFecha = typeof v.fecha === 'string' ? v.fecha.trim() : '';
    const rawSup = typeof v.supervisor === 'string' ? v.supervisor.trim() : '';
    const rawFundo = typeof v.fundo === 'string' ? v.fundo.trim() : '';
    const rawMod = typeof v.modulo === 'string' ? v.modulo.trim() : '';
    const rawGrp = typeof v.grupo === 'string' ? v.grupo.trim() : '';
    const totalTrab = Number(v.totalTrabajadores) || 0;
    const totalJab = Number(v.totalJabas) || 0;
    const confJab = Number(v.jabasConformes) || 0;
    const itemsCount = Array.isArray(v.items) ? v.items.length : 0;

    // Discard empty phantom records (like in user screenshot where ID is empty, Fundo/Modulo are empty, 0 Jabas, 0 personal)
    if (!rawId && !rawFecha && !rawSup && !rawFundo && totalTrab === 0 && totalJab === 0 && confJab === 0 && itemsCount === 0) {
      return;
    }
    if (rawId === '' && totalTrab === 0 && totalJab === 0 && confJab === 0 && itemsCount === 0) {
      return;
    }

    const effectiveId = rawId || `VAL_${rawFecha || 'GEN'}_${rawMod || 'M'}_${Date.now()}`;
    const dedupeKey = `${effectiveId}_${rawFecha}_${rawMod}_${rawSup}`;

    if (!seenIds.has(dedupeKey)) {
      seenIds.add(dedupeKey);
      cleaned.push({
        id: effectiveId,
        fecha: rawFecha || getLocalToday(),
        fechaRegistro: v.fechaRegistro || getLocalISO(),
        supervisor: rawSup || 'Supervisor de Campo',
        fundo: rawFundo || 'Fundo General',
        modulo: rawMod || 'M01',
        grupo: rawGrp || 'Grupo 01',
        lider: typeof v.lider === 'string' ? v.lider.trim() : '',
        totalTrabajadores: totalTrab || itemsCount,
        trabajadoresConformes: Number(v.trabajadoresConformes) || 0,
        trabajadoresAnulados: Number(v.trabajadoresAnulados) || 0,
        totalJabas: totalJab,
        jabasConformes: confJab,
        items: Array.isArray(v.items) ? v.items : [],
        estado: v.estado || 'Validado',
        observacionesGenerales: v.observacionesGenerales || '',
        creadoPor: v.creadoPor || ''
      });
    }
  });

  return cleaned;
}

// Validaciones por Supervisor
export function getValidaciones(): ValidacionSupervisor[] {
  try {
    const raw = localStorage.getItem(KEYS.VALIDACIONES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const cleaned = cleanValidacionesList(parsed);
    // If raw contained corrupted/empty phantom records, heal storage immediately
    if (Array.isArray(parsed) && parsed.length !== cleaned.length) {
      localStorage.setItem(KEYS.VALIDACIONES, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveValidaciones(list: ValidacionSupervisor[]) {
  const cleaned = cleanValidacionesList(list);
  localStorage.setItem(KEYS.VALIDACIONES, JSON.stringify(cleaned));
}

export function saveSingleValidacion(val: ValidacionSupervisor) {
  if (!isValidValidacion(val)) return getValidaciones();
  const current = getValidaciones();
  const existingIdx = current.findIndex(v => v.id === val.id);
  let updated: ValidacionSupervisor[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = val;
  } else {
    updated = [val, ...current];
  }
  saveValidaciones(updated);
  return updated;
}

// Purge all phantom empty records from all localStorage keys
export function purgeAllEmptyRecords() {
  const validaciones = getValidaciones();
  saveValidaciones(validaciones);

  const rawDetalle = getDetalleJabas();
  const cleanDetalle = sanitizeAndDeduplicateDetalleJabas(rawDetalle);
  saveDetalleJabas(cleanDetalle);

  const rawTrabajadores = getTrabajadores();
  const cleanTrabajadores = rawTrabajadores.filter(t => t && t.dni?.trim());
  saveTrabajadores(cleanTrabajadores);

  return {
    validacionesCount: validaciones.length,
    detalleCount: cleanDetalle.length,
    trabajadoresCount: cleanTrabajadores.length
  };
}

// Export all local database as JSON backup
export function generateBackupJson(): string {
  const backup = {
    version: 'AQUANQA Prize v23 / AgroField',
    exportedAt: new Date().toISOString(),
    usuarios: getUsuarios(),
    trabajadores: getTrabajadores(),
    programas: getProgramas(),
    programaGeneral: getProgramaGeneral(),
    detalleJabas: getDetalleJabas(),
    avance: getAvanceMap(),
    grupos: getGrupos(),
    lideres: getLideres(),
    validaciones: getValidaciones()
  };
  return JSON.stringify(backup, null, 2);
}

export interface ParsedWorkerResult {
  list: Omit<Trabajador, 'id'>[];
  totalLines: number;
  validCount: number;
  ignoredLines: number;
  hasHeader: boolean;
  samplePreview: Omit<Trabajador, 'id'>[];
}

/**
 * Parser inteligente de trabajadores copiados desde Excel, Google Sheets, TSV, CSV o texto libre.
 * Detecta automáticamente encabezados, separadores y campos como DNI, Nombres, Fundo, Módulo, Grupo, etc.
 */
export function parsePastedWorkers(
  text: string,
  defaultFecha?: string
): ParsedWorkerResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      list: [],
      totalLines: 0,
      validCount: 0,
      ignoredLines: 0,
      hasHeader: false,
      samplePreview: []
    };
  }

  const todayIso = normalizeDateString(defaultFecha) || getLocalToday();

  // Detectar si la primera fila es encabezado
  const firstLineLower = lines[0].toLowerCase();
  const hasHeader =
    firstLineLower.includes('dni') ||
    firstLineLower.includes('documento') ||
    firstLineLower.includes('nombre') ||
    firstLineLower.includes('trabajador') ||
    firstLineLower.includes('supervisor') ||
    firstLineLower.includes('cuadrilla');

  let headerCols: string[] = [];
  let dataLines = lines;

  if (hasHeader) {
    const sep = lines[0].includes('\t')
      ? '\t'
      : lines[0].includes(';')
      ? ';'
      : lines[0].includes(',')
      ? ','
      : /\s{2,}/;
    headerCols = lines[0].split(sep).map((c) => c.trim().toLowerCase());
    dataLines = lines.slice(1);
  }

  // Identificar columnas si hay encabezado
  let colDni = -1;
  let colNombre = -1;
  let colFundo = -1;
  let colModulo = -1;
  let colGrupo = -1;
  let colSupervisor = -1;
  let colLider = -1;
  let colTipo = -1;
  let colFecha = -1;

  if (hasHeader && headerCols.length > 0) {
    headerCols.forEach((h, idx) => {
      if (colDni === -1 && (h.includes('dni') || h.includes('doc') || h.includes('cedula') || h.includes('ident'))) {
        colDni = idx;
      } else if (colNombre === -1 && (h.includes('nom') || h.includes('apel') || h.includes('trabajador') || h.includes('persona'))) {
        colNombre = idx;
      } else if (colFundo === -1 && (h.includes('fundo') || h.includes('sede') || h.includes('campo'))) {
        colFundo = idx;
      } else if (colModulo === -1 && (h.includes('mod') || h.includes('lote') || h.includes('cuartel'))) {
        colModulo = idx;
      } else if (colGrupo === -1 && (h.includes('grup') || h.includes('cuadrilla'))) {
        colGrupo = idx;
      } else if (colSupervisor === -1 && (h.includes('superv') || h.includes('sup'))) {
        colSupervisor = idx;
      } else if (colLider === -1 && (h.includes('lider') || h.includes('líd') || h.includes('capataz'))) {
        colLider = idx;
      } else if (colTipo === -1 && (h.includes('tipo') || h.includes('cargo') || h.includes('rol') || h.includes('puesto'))) {
        colTipo = idx;
      } else if (colFecha === -1 && (h.includes('fec') || h.includes('date'))) {
        colFecha = idx;
      }
    });
  }

  const list: Omit<Trabajador, 'id'>[] = [];
  let ignoredCount = hasHeader ? 1 : 0;
  const seenDni = new Set<string>();

  dataLines.forEach((line) => {
    if (!line.trim()) return;

    let cols: string[] = [];
    if (line.includes('\t')) {
      cols = line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    } else if (line.includes(';')) {
      cols = line.split(';').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    } else if (line.includes(',')) {
      cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    } else {
      const parts = line.split(/\s{2,}/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (parts.length > 1) {
        cols = parts;
      } else {
        const matchDni = line.match(/\b\d{7,9}\b/);
        if (matchDni) {
          const dniFound = matchDni[0];
          const nameFound = line
            .replace(dniFound, '')
            .replace(/[-–—,:;|]/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
          cols = [dniFound, nameFound];
        } else {
          cols = [line];
        }
      }
    }

    if (cols.length === 0) {
      ignoredCount++;
      return;
    }

    let dni = '';
    let nombres = '';
    let fundo = 'Arena Azul';
    let modulo = 'M01';
    let supervisor = '';
    let grupo = '';
    let lider = '';
    let tipo = 'Cosechador';
    let fecha = todayIso;

    if (hasHeader && colDni !== -1) {
      dni = cols[colDni] ? cols[colDni].replace(/\s+/g, '').replace(/\D/g, '') : '';
      if (!dni && cols[colDni]) dni = cols[colDni].trim();
      nombres = colNombre !== -1 && cols[colNombre] ? cols[colNombre].trim().toUpperCase() : '';
      fundo = colFundo !== -1 && cols[colFundo] ? cols[colFundo].trim() : 'Arena Azul';
      modulo = colModulo !== -1 && cols[colModulo] ? cols[colModulo].trim() : 'M01';
      grupo = colGrupo !== -1 && cols[colGrupo] ? cols[colGrupo].trim() : '';
      supervisor = colSupervisor !== -1 && cols[colSupervisor] ? cols[colSupervisor].trim() : '';
      lider = colLider !== -1 && cols[colLider] ? cols[colLider].trim() : '';
      tipo = colTipo !== -1 && cols[colTipo] ? cols[colTipo].trim() : 'Cosechador';
      fecha = colFecha !== -1 && cols[colFecha] ? (normalizeDateString(cols[colFecha]) || todayIso) : todayIso;
    } else {
      if (cols.length >= 2) {
        const isCol0Dni = /^\d{6,10}$/.test(cols[0].replace(/\s+/g, ''));
        const isCol1Dni = /^\d{6,10}$/.test(cols[1].replace(/\s+/g, ''));

        if (isCol0Dni) {
          dni = cols[0].replace(/\s+/g, '');
          nombres = cols[1].trim().toUpperCase();
          fundo = cols[2] || 'Arena Azul';
          modulo = cols[3] || 'M01';
          grupo = cols[4] || '';
          supervisor = cols[5] || '';
          lider = cols[6] || '';
          tipo = cols[7] || 'Cosechador';
        } else if (isCol1Dni) {
          dni = cols[1].replace(/\s+/g, '');
          nombres = cols[0].trim().toUpperCase();
          fundo = cols[2] || 'Arena Azul';
          modulo = cols[3] || 'M01';
          grupo = cols[4] || '';
          supervisor = cols[5] || '';
          lider = cols[6] || '';
          tipo = cols[7] || 'Cosechador';
        } else {
          dni = cols[0].replace(/\s+/g, '').replace(/\D/g, '');
          nombres = cols[1].trim().toUpperCase();
        }
      } else if (cols.length === 1) {
        const match = cols[0].match(/\b\d{7,9}\b/);
        if (match) {
          dni = match[0];
          nombres = cols[0].replace(dni, '').replace(/[-–—,:;|]/g, ' ').trim().replace(/\s+/g, ' ').toUpperCase();
        } else {
          dni = cols[0].replace(/\D/g, '');
        }
      }
    }

    if (!dni && !nombres) {
      ignoredCount++;
      return;
    }

    if (!dni && nombres) {
      ignoredCount++;
      return;
    }

    if (!nombres) {
      nombres = `TRABAJADOR ${dni}`;
    }

    // Normalizar si dice 'sin grupo' o 'sin lider'
    if (grupo.toLowerCase() === 'sin grupo' || grupo.toLowerCase() === 'sin asignar') grupo = '';
    if (lider.toLowerCase().includes('sin') || lider.toLowerCase() === 'ninguno') lider = '';

    const dedupeKey = `${dni}__${fecha}`;
    if (!seenDni.has(dedupeKey)) {
      seenDni.add(dedupeKey);
      list.push({
        dni,
        nombres,
        fundo: fundo || 'Arena Azul',
        modulo: modulo || 'M01',
        supervisor: supervisor || '',
        grupo: grupo || '',
        lider: lider || '',
        tipo: tipo || 'Cosechador',
        jabas: 0,
        fecha: fecha || todayIso
      });
    }
  });

  return {
    list,
    totalLines: lines.length,
    validCount: list.length,
    ignoredLines: ignoredCount,
    hasHeader,
    samplePreview: list.slice(0, 5)
  };
}

/**
 * Replicar trabajadores guardados hacia la hoja 'Trabajadores' de Google Sheets.
 * Envía la petición tanto al servidor local backend como directamente al Web App de Google Sheets como fallback.
 */
export async function replicarTrabajadoresAlSheet(
  trabajadores: Trabajador[],
  customUrl?: string,
  modo: 'reemplazar_fecha' | 'append' | 'reemplazar_todo' = 'reemplazar_fecha',
  fechaTarget?: string,
  userRole?: string
): Promise<{
  success: boolean;
  message: string;
  sheetOk: boolean;
  count: number;
  totalEnSistema?: number;
  error?: string;
}> {
  const effectiveUrl = customUrl || getGsheetUrl();
  const effectiveFecha = normalizeDateString(fechaTarget) || (trabajadores[0]?.fecha ? normalizeDateString(trabajadores[0].fecha) : getLocalToday());

  // 1. Intentar primero a través del endpoint backend del servidor central (resuelve CORS y sigue 302 redirects)
  try {
    const serverRes = await fetch('/api/replicar-trabajadores-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trabajadores,
        url: effectiveUrl,
        modo,
        fechaTarget: effectiveFecha,
        userRole: userRole || 'Administrador',
        replicarSheet: true
      })
    });

    if (serverRes.ok) {
      const sJson = await serverRes.json();
      if (sJson && sJson.status === 'ok') {
        return {
          success: true,
          message: sJson.message || `Trabajadores guardados y replicados al Google Sheet exitosamente (${sJson.count} trabajadores).`,
          sheetOk: Boolean(sJson.sheetReplicated !== false),
          count: sJson.count || trabajadores.length,
          totalEnSistema: sJson.totalEnSistema,
          error: sJson.sheetError
        };
      }
    }
  } catch (backendErr) {
    console.warn('Backend proxy no disponible para réplica a Google Sheets, intentando conexión directa...', backendErr);
  }

  // 2. Fallback de réplica directa desde el navegador al Web App de Google Sheets
  if (effectiveUrl) {
    try {
      const payload = {
        accion: 'sync',
        data: {
          trabajadores: trabajadores.map((t) => ({
            dni: t.dni || '',
            nombres: t.nombres || '',
            fundo: t.fundo || '',
            modulo: t.modulo || '',
            grupo: t.grupo || '',
            supervisor: t.supervisor || '',
            lider: t.lider || '',
            tipo: t.tipo || 'Cosechador'
          }))
        }
      };

      const directRes = await fetch(effectiveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const responseText = await directRes.text().catch(() => '');
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {}

      if (directRes.ok || (responseJson && responseJson.status === 'ok')) {
        return {
          success: true,
          message: `Trabajadores replicados a la hoja 'Trabajadores' de Google Sheets exitosamente (${trabajadores.length} registros).`,
          sheetOk: true,
          count: trabajadores.length
        };
      }
    } catch (directErr: any) {
      console.error('Error en réplica directa a Google Sheets:', directErr);
      return {
        success: true,
        message: `Trabajadores guardados en el aplicativo (${trabajadores.length}), pero la réplica al Google Sheet tuvo un aviso de red.`,
        sheetOk: false,
        count: trabajadores.length,
        error: directErr?.message || 'Error de conexión con Google Sheets'
      };
    }
  }

  return {
    success: true,
    message: `Trabajadores guardados en el aplicativo (${trabajadores.length}). No hay URL de Google Sheets configurada.`,
    sheetOk: false,
    count: trabajadores.length
  };
}
