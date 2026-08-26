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
  ValidacionSupervisor
} from '../types';
import { 
  INITIAL_USUARIOS, 
  INITIAL_TRABAJADORES, 
  INITIAL_PROGRAMAS, 
  INITIAL_PROGRAMA_GENERAL, 
  INITIAL_GRUPOS 
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
  GSHEET_URL: 'recojoFrutosGsheetUrl',
  AUTO_SYNC: 'recojoFrutosAutoSync',
  AUTO_SYNC_QUEUE: 'recojoFrutosAutoSyncCola',
  LAST_SYNC: 'recojoFrutosLastSync',
  FIREBASE_CONFIG: 'recojoFrutosFirebaseConfig',
  VALIDACIONES: 'recojoFrutosValidaciones'
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

export function normalizeDateString(d?: string): string {
  if (!d) return '';
  const trimmed = d.split('T')[0].split(' ')[0].trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return trimmed;
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

// Auto-repair & sanity check
export function initializeStorage() {
  try {
    // Check URL parameters for instant Cloud Sync setup from shared link or QR code
    if (typeof window !== 'undefined' && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
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

    // Check & Seed Usuarios
    if (!localStorage.getItem(KEYS.USUARIOS)) {
      localStorage.setItem(KEYS.USUARIOS, JSON.stringify(INITIAL_USUARIOS));
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

// Reset all test records to a completely clean state
export function resetAllData() {
  try {
    localStorage.setItem(KEYS.TRABAJADORES, JSON.stringify([]));
    localStorage.setItem(KEYS.PROGRAMAS, JSON.stringify([]));
    localStorage.setItem(KEYS.PROGRAMA_GENERAL, JSON.stringify([]));
    localStorage.setItem(KEYS.DETALLE_JABAS, JSON.stringify([]));
    localStorage.setItem(KEYS.AVANCE, JSON.stringify({}));
    localStorage.setItem(KEYS.VALIDACIONES, JSON.stringify([]));
  } catch (e) {
    console.error('Reset all data error:', e);
  }
}


// Session Management
export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession) {
  localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEYS.SESSION);
}

// Usuarios
export function getUsuarios(): Usuario[] {
  try {
    const raw = localStorage.getItem(KEYS.USUARIOS);
    const parsed: Usuario[] = raw ? JSON.parse(raw) : [];
    const map = new Map<string, Usuario>();
    
    // Seed defaults first
    INITIAL_USUARIOS.forEach((u) => map.set(u.user.toLowerCase(), u));
    // Overwrite with stored custom/edited users
    parsed.forEach((u) => {
      if (u && u.user) map.set(u.user.toLowerCase(), u);
    });

    return Array.from(map.values());
  } catch {
    return INITIAL_USUARIOS;
  }
}

export function saveUsuarios(usuarios: Usuario[]) {
  localStorage.setItem(KEYS.USUARIOS, JSON.stringify(usuarios));
}

// Trabajadores
export function getTrabajadores(): Trabajador[] {
  try {
    const raw = localStorage.getItem(KEYS.TRABAJADORES);
    const list: Trabajador[] = raw ? JSON.parse(raw) : INITIAL_TRABAJADORES;
    const seen = new Set<string>();
    const unique: Trabajador[] = [];
    list.forEach((t) => {
      const cleanDni = String(t.dni || '').trim();
      if (cleanDni && !seen.has(cleanDni)) {
        seen.add(cleanDni);
        unique.push(t);
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
  trabajadores.forEach((t) => {
    const cleanDni = String(t.dni || '').trim();
    if (cleanDni && !seen.has(cleanDni)) {
      seen.add(cleanDni);
      unique.push(t);
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
