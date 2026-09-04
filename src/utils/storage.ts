import { 
  Usuario, 
  Trabajador, 
  Programa, 
  ProgramaGeneral, 
  DetalleJaba, 
  Lider, 
  UserSession, 
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
  AUDITORIA_INGRESOS: 'recojoFrutosAuditoriaIngresos'
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

  // 3. If JavaScript Date string (e.g. "Tue Aug 25 2026 00:00:00 GMT-0500" or similar)
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
    const TARGET_VERSION = 'v105_clean_wipe_all_backups_require_login';
    
    // Check if this browser needs a clean wipe of all backup and cached data
    if (typeof localStorage !== 'undefined' && localStorage.getItem(WIPE_VERSION_KEY) !== TARGET_VERSION) {
      wipeAllBackupData();
      clearSession();
      localStorage.setItem(WIPE_VERSION_KEY, TARGET_VERSION);
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
export function wipeAllBackupData() {
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
    localStorage.setItem(KEYS.USUARIOS, JSON.stringify(INITIAL_USUARIOS));

    // 2. Remove any old sheet URLs or sync caches that might re-import backups
    localStorage.removeItem(KEYS.GSHEET_URL);
    localStorage.removeItem(KEYS.AUTO_SYNC);
    localStorage.removeItem(KEYS.LAST_SYNC);

    // 3. Scan and delete any ad-hoc backup keys in localStorage
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

    // 4. Also clear session so authentication is freshly required
    clearSession();
  } catch (e) {
    console.error('Error wiping backup data:', e);
  }
}

// Reset all test records to a completely clean state
export function resetAllData() {
  wipeAllBackupData();
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

// Trabajadores
export function getTrabajadores(): Trabajador[] {
  try {
    const raw = localStorage.getItem(KEYS.TRABAJADORES);
    const list: Trabajador[] = raw ? JSON.parse(raw) : INITIAL_TRABAJADORES;
    const seen = new Set<string>();
    const unique: Trabajador[] = [];
    list.forEach((t, i) => {
      const cleanDni = String(t.dni || '').replace(/\s+/g, '').trim();
      const key = t.id || (cleanDni ? `${cleanDni}__${t.nombres}` : `idx_${i}__${t.nombres}`);
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
    return INITIAL_TRABAJADORES;
  }
}

export function saveTrabajadores(trabajadores: Trabajador[]) {
  const seen = new Set<string>();
  const unique: Trabajador[] = [];
  trabajadores.forEach((t, i) => {
    const cleanDni = String(t.dni || '').replace(/\s+/g, '').trim();
    const key = t.id || (cleanDni ? `${cleanDni}__${t.nombres}` : `idx_${i}__${t.nombres}`);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        ...t,
        dni: cleanDni || String(t.dni || '').trim()
      });
    }
  });
  localStorage.setItem(KEYS.TRABAJADORES, JSON.stringify(unique));
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

// Detalle Jabas
export function getDetalleJabas(): DetalleJaba[] {
  try {
    const raw = localStorage.getItem(KEYS.DETALLE_JABAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDetalleJabas(list: DetalleJaba[]) {
  localStorage.setItem(KEYS.DETALLE_JABAS, JSON.stringify(list));
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
    return raw ? JSON.parse(raw) : INITIAL_GRUPOS;
  } catch {
    return INITIAL_GRUPOS;
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
  // Default derive from trabajadores
  const workers = getTrabajadores();
  const liderMap = new Map<string, Lider>();
  workers.forEach(w => {
    const name = (w.lider || '').trim();
    if (name) {
      const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (!liderMap.has(key)) {
        liderMap.set(key, {
          lider: name,
          dni: w.tipo === 'Líder' ? w.dni : '',
          nombres: name,
          fechaAlta: w.fecha ? w.fecha.slice(0, 10) : getLocalToday()
        });
      }
    }
  });
  return Array.from(liderMap.values());
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

    // Check if there is an existing reservation with the same date, supervisor, fundo, and modulo
    const normSup = normalizeSupervisorKey(item.supervisor);
    const existingMatch = Array.from(map.values()).find(
      (e) =>
        e.fecha === item.fecha &&
        normalizeSupervisorKey(e.supervisor) === normSup &&
        e.fundo === item.fundo &&
        e.modulo === item.modulo
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
  const cleanDetalle = rawDetalle.filter(
    d => d && (d.dni?.trim() || d.trabajador?.trim()) && (Number(d.jabas) > 0 || d.fecha?.trim())
  );
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
