import { LoteItem, Trabajador, Programa, ProgramaGeneral, Usuario } from '../types';

export const INITIAL_FUNDOS: string[] = [
  "Ampliacion",
  "Arena Azul",
  "Ayllu Allpa",
  "Santa Teresa",
  "Vivadis"
];

export const INITIAL_MODULOS_POR_FUNDO: Record<string, string[]> = {
  "Ampliacion": ["M16", "M17", "M18"],
  "Arena Azul": ["M01", "M02", "M03", "M04"],
  "Ayllu Allpa": ["M12", "M13", "M14", "M15"],
  "Santa Teresa": ["M01", "M06", "M07", "M08", "M09", "M10A", "M10B", "M11"],
  "Vivadis": ["M01", "M02", "M03", "M04", "M05"]
};

export const INITIAL_GRUPOS: string[] = [
  "Grupo01", "Grupo 01", "Grupo 02", "Grupo 03", "Grupo 04", "Grupo 05",
  "Grupo 06", "Grupo 07", "Grupo 08", "Grupo 09", "Grupo 10"
];

export const INITIAL_LOTES: LoteItem[] = [
  // Arena Azul M01
  { fundo: "Arena Azul", modulo: "M01", turno: "T01", lote: "L39" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T02", lote: "L57" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T02", lote: "L58" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T03", lote: "L51" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T03", lote: "L52" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T04", lote: "L45" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T04", lote: "L46" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T05", lote: "L44" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T05", lote: "L47" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T06", lote: "L50" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T06", lote: "L53" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T07", lote: "L56" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T07", lote: "L59" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T08", lote: "L55" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T08", lote: "L60" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T09", lote: "L49" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T09", lote: "L54" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T10", lote: "L43" },
  { fundo: "Arena Azul", modulo: "M01", turno: "T10", lote: "L48" },

  // Arena Azul M02
  { fundo: "Arena Azul", modulo: "M02", turno: "T01", lote: "L19" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T01", lote: "L20" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T01", lote: "L26" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T02", lote: "L27" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T02", lote: "L34" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T03", lote: "L35" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T03", lote: "L42" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T04", lote: "L36" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T04", lote: "L41" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T05", lote: "L28" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T05", lote: "L33" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T06", lote: "L24" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T06", lote: "L25" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T07", lote: "L29" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T07", lote: "L32" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T08", lote: "L37" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T08", lote: "L40" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T09", lote: "L31" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T09", lote: "L38" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T10", lote: "L23" },
  { fundo: "Arena Azul", modulo: "M02", turno: "T10", lote: "L30" },

  // Arena Azul M03
  { fundo: "Arena Azul", modulo: "M03", turno: "T01", lote: "L1" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T01", lote: "L6" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T02", lote: "L2" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T02", lote: "L5" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T03", lote: "L3" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T03", lote: "L4" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T04", lote: "L9" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T04", lote: "L10" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T05", lote: "L8" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T05", lote: "L11" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T06", lote: "L7" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T06", lote: "L12" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T07", lote: "L13" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T07", lote: "L18" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T08", lote: "L14" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T08", lote: "L17" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T09", lote: "L15" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T09", lote: "L16" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T10", lote: "L21" },
  { fundo: "Arena Azul", modulo: "M03", turno: "T10", lote: "L22" },

  // Vivadis M01
  { fundo: "Vivadis", modulo: "M01", turno: "T01", lote: "L1" },
  { fundo: "Vivadis", modulo: "M01", turno: "T01", lote: "L2" },
  { fundo: "Vivadis", modulo: "M01", turno: "T01", lote: "L3" },
  { fundo: "Vivadis", modulo: "M01", turno: "T02", lote: "L5" },
  { fundo: "Vivadis", modulo: "M01", turno: "T02", lote: "L6" },
  { fundo: "Vivadis", modulo: "M01", turno: "T03", lote: "L8" },
  { fundo: "Vivadis", modulo: "M01", turno: "T03", lote: "L9" },
  { fundo: "Vivadis", modulo: "M01", turno: "T04", lote: "L11" },
  { fundo: "Vivadis", modulo: "M01", turno: "T04", lote: "L12" },
  { fundo: "Vivadis", modulo: "M01", turno: "T05", lote: "L14" },
  { fundo: "Vivadis", modulo: "M01", turno: "T05", lote: "L15" },

  // Santa Teresa M06
  { fundo: "Santa Teresa", modulo: "M06", turno: "T01", lote: "L1" },
  { fundo: "Santa Teresa", modulo: "M06", turno: "T01", lote: "L2" },
  { fundo: "Santa Teresa", modulo: "M06", turno: "T02", lote: "L3" },
  { fundo: "Santa Teresa", modulo: "M06", turno: "T02", lote: "L4" },
  { fundo: "Santa Teresa", modulo: "M06", turno: "T03", lote: "L5" },
  { fundo: "Santa Teresa", modulo: "M06", turno: "T03", lote: "L6" },
  { fundo: "Santa Teresa", modulo: "M06", turno: "T04", lote: "L7" },
  { fundo: "Santa Teresa", modulo: "M06", turno: "T04", lote: "L8" },

  // Ayllu Allpa M12
  { fundo: "Ayllu Allpa", modulo: "M12", turno: "T01", lote: "L1" },
  { fundo: "Ayllu Allpa", modulo: "M12", turno: "T01", lote: "L2" },
  { fundo: "Ayllu Allpa", modulo: "M12", turno: "T02", lote: "L6" },
  { fundo: "Ayllu Allpa", modulo: "M12", turno: "T02", lote: "L7" },
  { fundo: "Ayllu Allpa", modulo: "M12", turno: "T03", lote: "L15" },

  // Ampliacion M16
  { fundo: "Ampliacion", modulo: "M16", turno: "T01", lote: "L1" },
  { fundo: "Ampliacion", modulo: "M16", turno: "T01", lote: "L2" },
  { fundo: "Ampliacion", modulo: "M16", turno: "T02", lote: "L4" },
  { fundo: "Ampliacion", modulo: "M16", turno: "T02", lote: "L5" }
];

export const INITIAL_USUARIOS: Usuario[] = [
  { user: 'admin', pass: 'admin123', nombre: 'Administrador General', rol: 'Administrador', creado: '2026-08-18' },
  { user: 'csolar', pass: 'solar123', nombre: 'Carlos Solar', rol: 'Supervisor', creado: '2026-08-19' },
  { user: 'supervisor1', pass: 'super123', nombre: 'Carlos Mendoza', rol: 'Supervisor', creado: '2026-08-19' },
  { user: 'supervisor2', pass: 'super123', nombre: 'María Quispe', rol: 'Supervisor', creado: '2026-08-19' },
  { user: 'trabajador1', pass: 'campo123', nombre: 'Juan Pérez', rol: 'Trabajador', creado: '2026-08-20' }
];

export const INITIAL_TRABAJADORES: Trabajador[] = [
  { id: 'T000A', fecha: '2026-08-21 00:00:00', dni: '73829104', nombres: 'JULIA CRUZ MEJÍA', fundo: 'Santa Teresa', modulo: 'M01', supervisor: 'Carlos Solar', grupo: 'Grupo01', lider: 'Antony Cerron', tipo: 'Cosechador', jabas: 48 },
  { id: 'T000B', fecha: '2026-08-21 00:00:00', dni: '71928374', nombres: 'ANTONY CERRON PAUCAR', fundo: 'Santa Teresa', modulo: 'M01', supervisor: 'Carlos Solar', grupo: 'Grupo01', lider: 'Antony Cerron', tipo: 'Líder', jabas: 55 },
  { id: 'T000C', fecha: '2026-08-21 00:00:00', dni: '74839201', nombres: 'ROBERTO SÁNCHEZ VEGA', fundo: 'Santa Teresa', modulo: 'M01', supervisor: 'Carlos Solar', grupo: 'Grupo01', lider: 'Antony Cerron', tipo: 'Cosechador', jabas: 42 },
  { id: 'T001', fecha: '2026-08-20 00:00:00', dni: '72345678', nombres: 'JUAN PÉREZ ROJAS', fundo: 'Arena Azul', modulo: 'M01', supervisor: 'Carlos Mendoza', grupo: 'Grupo 01', lider: 'Carlos Mendoza', tipo: 'Cosechador', jabas: 45 },
  { id: 'T002', fecha: '2026-08-20 00:00:00', dni: '45892134', nombres: 'MARÍA GONZÁLEZ VÁSQUEZ', fundo: 'Arena Azul', modulo: 'M01', supervisor: 'Carlos Mendoza', grupo: 'Grupo 01', lider: 'Carlos Mendoza', tipo: 'Cosechador', jabas: 52 },
  { id: 'T003', fecha: '2026-08-20 00:00:00', dni: '10293847', nombres: 'PEDRO CASTILLO FLORES', fundo: 'Arena Azul', modulo: 'M02', supervisor: 'Carlos Mendoza', grupo: 'Grupo 02', lider: 'Pedro Castillo Flores', tipo: 'Líder', jabas: 60 },
  { id: 'T004', fecha: '2026-08-20 00:00:00', dni: '84729103', nombres: 'ROSA HUAMÁN MAMANI', fundo: 'Arena Azul', modulo: 'M02', supervisor: 'Carlos Mendoza', grupo: 'Grupo 02', lider: 'Pedro Castillo Flores', tipo: 'Cosechador', jabas: 48 },
  { id: 'T005', fecha: '2026-08-20 00:00:00', dni: '39482019', nombres: 'LUIS TORRES CHÁVEZ', fundo: 'Vivadis', modulo: 'M01', supervisor: 'María Quispe', grupo: 'Grupo 03', lider: 'María Quispe', tipo: 'Cosechador', jabas: 55 },
  { id: 'T006', fecha: '2026-08-20 00:00:00', dni: '56473829', nombres: 'ANA SILVA SALAS', fundo: 'Vivadis', modulo: 'M01', supervisor: 'María Quispe', grupo: 'Grupo 03', lider: 'María Quispe', tipo: 'Cosechador', jabas: 40 },
  { id: 'T007', fecha: '2026-08-20 00:00:00', dni: '92837465', nombres: 'JOSÉ GUTIÉRREZ VARGAS', fundo: 'Santa Teresa', modulo: 'M06', supervisor: 'Carlos Mendoza', grupo: 'Grupo 04', lider: 'José Gutiérrez Vargas', tipo: 'Líder', jabas: 65 },
  { id: 'T008', fecha: '2026-08-20 00:00:00', dni: '19283746', nombres: 'ELENA PAREDES SOTO', fundo: 'Santa Teresa', modulo: 'M06', supervisor: 'Carlos Mendoza', grupo: 'Grupo 04', lider: 'José Gutiérrez Vargas', tipo: 'Cosechador', jabas: 50 },
  { id: 'T009', fecha: '2026-08-20 00:00:00', dni: '67584930', nombres: 'CARMEN LÓPEZ MORALES', fundo: 'Ayllu Allpa', modulo: 'M12', supervisor: 'María Quispe', grupo: 'Grupo 05', lider: 'María Quispe', tipo: 'Cosechador', jabas: 42 },
  { id: 'T010', fecha: '2026-08-20 00:00:00', dni: '28394019', nombres: 'MANUEL DÍAZ RIVERA', fundo: 'Ampliacion', modulo: 'M16', supervisor: 'Carlos Mendoza', grupo: 'Grupo 06', lider: 'Carlos Mendoza', tipo: 'Cosechador', jabas: 58 }
];

export const INITIAL_PROGRAMA_GENERAL: ProgramaGeneral[] = [
  {
    id: 'PG_001',
    fundo: 'Arena Azul',
    modulo: 'M01',
    haTotal: '14.5',
    numTrabajadores: '25',
    observaciones: 'Cosecha de fruta para exportación. Primer pase en turnos altos.',
    fechaRegistro: '2026-08-20T08:00:00.000Z',
    createdAt: '2026-08-20T08:00:00.000Z',
    supervisor: 'Carlos Mendoza'
  },
  {
    id: 'PG_002',
    fundo: 'Vivadis',
    modulo: 'M01',
    haTotal: '12.0',
    numTrabajadores: '20',
    observaciones: 'Recojo intensivo por maduración acelerada.',
    fechaRegistro: '2026-08-20T09:30:00.000Z',
    createdAt: '2026-08-20T09:30:00.000Z',
    supervisor: 'María Quispe'
  }
];

export const INITIAL_PROGRAMAS: Programa[] = [
  {
    id: 'PROG_001',
    fecha: '2026-08-20',
    fundo: 'Arena Azul',
    modulo: 'M01',
    haTotal: '14.5',
    numTrab: '25',
    tipo: 'Suelo',
    jabas: 380,
    ddc: 4.2,
    lotes: [
      { turno: 'T01', lote: 'L39' },
      { turno: 'T02', lote: 'L57' },
      { turno: 'T02', lote: 'L58' },
      { turno: 'T03', lote: 'L51' }
    ],
    totalLotes: 4,
    fechaRegistro: '2026-08-20T10:00:00.000Z',
    supervisor: 'Carlos Mendoza',
    avance: {
      '72345678': 45,
      '45892134': 52
    }
  },
  {
    id: 'PROG_002',
    fecha: '2026-08-20',
    fundo: 'Vivadis',
    modulo: 'M01',
    haTotal: '12.0',
    numTrab: '20',
    tipo: 'Maceta',
    jabas: 310,
    ddc: 3.8,
    lotes: [
      { turno: 'T01', lote: 'L1' },
      { turno: 'T01', lote: 'L2' },
      { turno: 'T02', lote: 'L5' }
    ],
    totalLotes: 3,
    fechaRegistro: '2026-08-20T11:15:00.000Z',
    supervisor: 'María Quispe',
    avance: {
      '39482019': 55,
      '56473829': 40
    }
  }
];
