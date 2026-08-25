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

export const INITIAL_TRABAJADORES: Trabajador[] = [];

export const INITIAL_PROGRAMA_GENERAL: ProgramaGeneral[] = [];

export const INITIAL_PROGRAMAS: Programa[] = [];

