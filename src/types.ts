export type UserRole = 'Administrador' | 'Supervisor' | 'Trabajador';

export interface UserSession {
  user: string;
  nombre: string;
  rol: UserRole;
  horaLogin?: string;
  fechaLogin?: string;
  ultimoIngreso?: string;
  horaIngreso?: string;
  fechaIngreso?: string;
  horaAsignada?: string;
}

export interface Usuario {
  user: string;
  pass: string;
  nombre: string;
  rol: UserRole;
  creado: string;
  ultimoLogin?: string;        // Timestamp ISO del último login
  ultimaHoraLogin?: string;    // Hora HH:MM:SS del login
  ultimaFechaLogin?: string;   // Fecha YYYY-MM-DD del login
  ultimoIngreso?: string;      // Timestamp ISO
  ultimaHoraAcceso?: string;   // Hora HH:MM:SS
  ultimaFechaAcceso?: string;  // Fecha YYYY-MM-DD
  horaIngreso?: string;        // Opcional
  turno?: string;
  toleranciaMinutos?: number;
}

export interface AuditoriaIngreso {
  id: string;
  user: string;
  nombre: string;
  rol: UserRole;
  fecha: string;               // YYYY-MM-DD de login
  horaIngreso: string;         // HH:MM:SS hora de login
  dispositivo?: 'PC' | 'Celular' | 'Desconocido';
  timestamp: string;           // ISO timestamp
  horaAsignada?: string;
  estado?: string;
  diferenciaMinutos?: number;
  metodo?: string;
  observaciones?: string;
}

export interface LoteItem {
  id?: string;
  fundo: string;
  modulo: string;
  turno: string;
  lote: string;
}

export interface Trabajador {
  id: string;
  fecha: string;
  dni: string;
  nombres: string;
  fundo: string;
  modulo: string;
  supervisor: string;
  grupo?: string;
  lider?: string;
  tipo?: string;
  jabas?: number;
}

export interface SelectedLote {
  turno: string;
  lote: string;
}

export interface Programa {
  id?: string;
  fecha: string;
  fundo: string;
  modulo: string;
  haTotal: string;
  numTrab: string;
  tipo: string;
  jabas: string | number;
  ddc: string | number;
  lotes: SelectedLote[];
  totalLotes: number;
  fechaRegistro: string;
  supervisor?: string;
  avance?: Record<string, number>;
  _demo?: boolean;
}

export interface ProgramaGeneral {
  id: string;
  fundo: string;
  modulo: string;
  haTotal: string;
  numTrabajadores: string;
  observaciones: string;
  fechaRegistro: string;
  createdAt?: string;
  updatedAt?: string;
  supervisor?: string;
}

export interface DetalleJaba {
  id: string;
  fecha: string;
  dni: string;
  trabajador: string;
  fundo: string;
  modulo: string;
  jabas: number;
  supervisor: string;
  grupo?: string;
  lider?: string;
  timestamp?: string;
}

export interface Lider {
  lider: string;
  dni: string;
  nombres?: string;
  grupo?: string;
  fechaAlta?: string;
}

export interface ReservaItemTrabajador {
  id?: string;
  dni: string;
  nombres: string;
  grupo?: string;
}

export interface ReservaCuadrilla {
  id: string;
  fecha: string;
  hora?: string;
  supervisor: string;
  fundo: string;
  modulo: string;
  grupo?: string;
  lider?: string;
  totalTrabajadores: number;
  trabajadores: ReservaItemTrabajador[];
  timestamp: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  mensaje: string;
  tipo: 'ok' | 'err' | 'info';
}

export interface ValidacionTrabajadorItem {
  dni: string;
  nombres: string;
  tipo?: string;
  jabas: number;
  conforme: boolean;
  observacion?: string;
}

export interface ValidacionSupervisor {
  id: string;
  fecha: string;
  supervisor: string;
  fundo: string;
  modulo: string;
  grupo: string;
  lider?: string;
  totalTrabajadores: number;
  trabajadoresConformes: number;
  trabajadoresAnulados: number;
  totalJabas: number;
  jabasConformes: number;
  items: ValidacionTrabajadorItem[];
  estado: 'Validado' | 'Enviado' | 'Pendiente';
  fechaRegistro: string;
  observacionesGenerales?: string;
  creadoPor: string;
}

export type TabId = 
  | 'programaGeneral'
  | 'programa'
  | 'trabajadores'
  | 'validacion'
  | 'dashboard'
  | 'reportes'
  | 'usuarios'
  | 'importar'
  | 'conexion';

export type DeviceViewMode = 'pc' | 'celular';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  databaseURL: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}
