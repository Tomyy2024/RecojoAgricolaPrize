import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const DB_FILE = path.join(process.cwd(), 'data_store.json');

// Master default users & catalogs
const DEFAULT_USUARIOS = [
  { user: 'admin', pass: 'admin123', nombre: 'Administrador General', rol: 'Administrador', creado: '2026-08-18' },
  { user: 'csolar', pass: 'solar123', nombre: 'Carlos Solar', rol: 'Supervisor', creado: '2026-08-19' },
  { user: 'supervisor1', pass: 'super123', nombre: 'Carlos Mendoza', rol: 'Supervisor', creado: '2026-08-19' },
  { user: 'supervisor2', pass: 'super123', nombre: 'María Quispe', rol: 'Supervisor', creado: '2026-08-19' },
  { user: 'trabajador1', pass: 'campo123', nombre: 'Juan Pérez', rol: 'Trabajador', creado: '2026-08-20' }
];

const DEFAULT_FUNDOS = [
  "Ampliacion",
  "Arena Azul",
  "Ayllu Allpa",
  "Santa Teresa",
  "Vivadis"
];

const DEFAULT_MODULOS = {
  "Ampliacion": ["M16", "M17", "M18"],
  "Arena Azul": ["M01", "M02", "M03", "M04"],
  "Ayllu Allpa": ["M12", "M13", "M14", "M15"],
  "Santa Teresa": ["M01", "M06", "M07", "M08", "M09", "M10A", "M10B", "M11"],
  "Vivadis": ["M01", "M02", "M03", "M04", "M05"]
};

const DEFAULT_GRUPOS = [
  "Grupo01", "Grupo 01", "Grupo 02", "Grupo 03", "Grupo 04", "Grupo 05",
  "Grupo 06", "Grupo 07", "Grupo 08", "Grupo 09", "Grupo 10"
];

function getInitialData() {
  return {
    usuarios: DEFAULT_USUARIOS,
    fundos: DEFAULT_FUNDOS,
    modulos: DEFAULT_MODULOS,
    grupos: DEFAULT_GRUPOS,
    trabajadores: [],
    programas: [],
    programaGeneral: [],
    detalleJabas: [],
    validaciones: [],
    lideres: [],
    lastUpdated: new Date().toISOString()
  };
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...getInitialData(),
        ...parsed
      };
    }
  } catch (err) {
    console.error('Error reading DB file:', err);
  }
  const initial = getInitialData();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // In-memory active database
  let db = loadDatabase();

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get centralized data for all users/PCs
  app.get('/api/data', (req, res) => {
    res.json({
      status: 'ok',
      data: db
    });
  });

  // Sync data from any client
  app.post('/api/sync', (req, res) => {
    try {
      const incoming = req.body;
      if (incoming && typeof incoming === 'object') {
        if (Array.isArray(incoming.programas)) db.programas = incoming.programas;
        if (Array.isArray(incoming.programaGeneral)) db.programaGeneral = incoming.programaGeneral;
        if (Array.isArray(incoming.trabajadores)) db.trabajadores = incoming.trabajadores;
        if (Array.isArray(incoming.detalleJabas)) db.detalleJabas = incoming.detalleJabas;
        if (Array.isArray(incoming.validaciones)) db.validaciones = incoming.validaciones;
        if (Array.isArray(incoming.usuarios)) db.usuarios = incoming.usuarios;
        if (Array.isArray(incoming.lideres)) db.lideres = incoming.lideres;
        if (Array.isArray(incoming.grupos)) db.grupos = incoming.grupos;

        db.lastUpdated = new Date().toISOString();
        saveDatabase(db);
      }
      res.json({ status: 'ok', data: db });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Clean all test/mock data
  app.post('/api/reset', (req, res) => {
    try {
      db = getInitialData();
      saveDatabase(db);
      res.json({ status: 'ok', message: 'Datos limpiados correctamente', data: db });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
