import { LoteItem, Trabajador, Programa, ProgramaGeneral, Usuario } from '../types';
import { PARSED_INITIAL_LOTES } from './lotesCatalog';

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

export const INITIAL_GRUPOS: string[] = [];

export const INITIAL_LOTES: LoteItem[] = PARSED_INITIAL_LOTES;

export const INITIAL_USUARIOS: Usuario[] = [
  { user: 'admin', pass: 'admin123', nombre: 'Administrador General', rol: 'Administrador', creado: '2026-08-18' },
  { user: 'supervisor1', pass: 'super123', nombre: 'Supervisor de Campo', rol: 'Supervisor', creado: '2026-08-18' },
  { user: 'trabajador1', pass: 'campo123', nombre: 'Trabajador de Campo', rol: 'Trabajador', creado: '2026-08-18' },
  { user: 'trabajador', pass: 'campo123', nombre: 'Trabajador General', rol: 'Trabajador', creado: '2026-08-18' }
];

export const INITIAL_TRABAJADORES: Trabajador[] = [];

export const INITIAL_PROGRAMA_GENERAL: ProgramaGeneral[] = [];

export const INITIAL_PROGRAMAS: Programa[] = [];


