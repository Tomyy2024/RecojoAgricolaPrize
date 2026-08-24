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

// Auto-repair & sanity check
export function initializeStorage() {
  try {
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

    // Initialize DetalleJabas from initial programs
    if (!localStorage.getItem(KEYS.DETALLE_JABAS)) {
      const initialDetalle: DetalleJaba[] = [
        {
          id: '2026-08-20_72345678_M01',
          fecha: '2026-08-20',
          dni: '72345678',
          trabajador: 'JUAN PÉREZ ROJAS',
          fundo: 'Arena Azul',
          modulo: 'M01',
          jabas: 45,
          supervisor: 'Carlos Mendoza',
          timestamp: '2026-08-20T10:30:00.000Z'
        },
        {
          id: '2026-08-20_45892134_M01',
          fecha: '2026-08-20',
          dni: '45892134',
          trabajador: 'MARÍA GONZÁLEZ VÁSQUEZ',
          fundo: 'Arena Azul',
          modulo: 'M01',
          jabas: 52,
          supervisor: 'Carlos Mendoza',
          timestamp: '2026-08-20T10:35:00.000Z'
        },
        {
          id: '2026-08-20_39482019_M01',
          fecha: '2026-08-20',
          dni: '39482019',
          trabajador: 'LUIS TORRES CHÁVEZ',
          fundo: 'Vivadis',
          modulo: 'M01',
          jabas: 55,
          supervisor: 'María Quispe',
          timestamp: '2026-08-20T11:40:00.000Z'
        }
      ];
      localStorage.setItem(KEYS.DETALLE_JABAS, JSON.stringify(initialDetalle));
    }
  } catch (e) {
    console.warn('Storage init fallback:', e);
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
    return raw ? JSON.parse(raw) : INITIAL_USUARIOS;
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
    return raw ? JSON.parse(raw) : INITIAL_TRABAJADORES;
  } catch {
    return INITIAL_TRABAJADORES;
  }
}

export function saveTrabajadores(trabajadores: Trabajador[]) {
  localStorage.setItem(KEYS.TRABAJADORES, JSON.stringify(trabajadores));
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
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default derive from trabajadores
  const workers = getTrabajadores();
  const liderList: Lider[] = [];
  workers.forEach(w => {
    if (w.lider && !liderList.some(l => l.dni === w.dni && l.grupo === (w.grupo || ''))) {
      liderList.push({
        lider: w.lider,
        dni: w.dni,
        nombres: w.nombres,
        grupo: w.grupo || 'Grupo 01',
        fechaAlta: w.fecha ? w.fecha.slice(0, 10) : getLocalToday()
      });
    }
  });
  return liderList;
}

export function saveLideres(lideres: Lider[]) {
  localStorage.setItem(KEYS.LIDERES, JSON.stringify(lideres));
}

// Google Sheets Web App Config
export function getGsheetUrl(): string {
  try {
    return localStorage.getItem(KEYS.GSHEET_URL) || '';
  } catch {
    return '';
  }
}

export function saveGsheetUrl(url: string) {
  if (!url) {
    localStorage.removeItem(KEYS.GSHEET_URL);
  } else {
    localStorage.setItem(KEYS.GSHEET_URL, url);
  }
}

// Auto-Sync Settings
export function isAutoSyncEnabled(): boolean {
  try {
    return localStorage.getItem(KEYS.AUTO_SYNC) === '1';
  } catch {
    return false;
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

// Validaciones por Supervisor
export function getValidaciones(): ValidacionSupervisor[] {
  try {
    const raw = localStorage.getItem(KEYS.VALIDACIONES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveValidaciones(list: ValidacionSupervisor[]) {
  localStorage.setItem(KEYS.VALIDACIONES, JSON.stringify(list));
}

export function saveSingleValidacion(val: ValidacionSupervisor) {
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
