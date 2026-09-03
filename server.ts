import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const DB_FILE = path.join(process.cwd(), 'data_store.json');

// Master default users & catalogs
const DEFAULT_USUARIOS = [
  { user: 'admin', pass: 'admin123', nombre: 'Administrador General', rol: 'Administrador', creado: '2026-08-18' },
  { user: 'supervisor1', pass: 'super123', nombre: 'Supervisor de Campo', rol: 'Supervisor', creado: '2026-08-18' },
  { user: 'trabajador1', pass: 'campo123', nombre: 'Trabajador de Campo', rol: 'Trabajador', creado: '2026-08-18' },
  { user: 'trabajador', pass: 'campo123', nombre: 'Trabajador General', rol: 'Trabajador', creado: '2026-08-18' }
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

const DEFAULT_GRUPOS: string[] = [];

function getInitialData() {
  return {
    version: 1,
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
    reservas: [],
    lastUpdated: new Date().toISOString()
  };
}

function normalizeDateServer(str?: string): string {
  if (!str) return '';
  const s = String(str).trim();
  if (!s) return '';
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }
  const p = new Date(s);
  if (!isNaN(p.getTime())) {
    const y = p.getFullYear();
    const m = String(p.getMonth() + 1).padStart(2, '0');
    const d = String(p.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return s.split('T')[0].split(' ')[0].trim();
}

function sanitizeValidaciones(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: any[] = [];
  list.forEach((v) => {
    if (!v || typeof v !== 'object') return;
    const id = String(v.id || '').trim();
    const rawFecha = String(v.fecha || '').trim();
    const fecha = normalizeDateServer(rawFecha);
    const sup = String(v.supervisor || '').trim();
    const totTrab = Number(v.totalTrabajadores) || 0;
    const totJab = Number(v.totalJabas) || 0;
    const confJab = Number(v.jabasConformes) || 0;
    const itemsCount = Array.isArray(v.items) ? v.items.length : 0;

    // Discard empty phantom records (no id, no date, 0 workers, 0 jabas)
    if (!id && !fecha && !sup && totTrab === 0 && totJab === 0 && confJab === 0 && itemsCount === 0) {
      return;
    }
    if (id === '' && totTrab === 0 && totJab === 0 && confJab === 0 && itemsCount === 0) {
      return;
    }

    const effectiveId = id || `VAL_${fecha || 'GEN'}_${Date.now()}`;
    const dedupeKey = `${effectiveId}_${fecha}_${v.modulo}_${sup}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      out.push({
        ...v,
        id: effectiveId,
        fecha: fecha || rawFecha,
        totalTrabajadores: totTrab || itemsCount,
        trabajadoresConformes: Number(v.trabajadoresConformes) || 0,
        trabajadoresAnulados: Number(v.trabajadoresAnulados) || 0,
        totalJabas: totJab,
        jabasConformes: confJab
      });
    }
  });
  return out;
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      
      // Ensure default users are merged if missing
      const existingUsers = Array.isArray(parsed.usuarios) ? parsed.usuarios : [];
      const userMap = new Map<string, any>();
      
      // Add defaults first
      DEFAULT_USUARIOS.forEach(u => userMap.set(u.user.toLowerCase(), u));
      // Overwrite/add custom users
      existingUsers.forEach((u: any) => {
        if (u && u.user) userMap.set(u.user.toLowerCase(), u);
      });

      const cleanedValidaciones = sanitizeValidaciones(parsed.validaciones);

      return {
        ...getInitialData(),
        ...parsed,
        usuarios: Array.from(userMap.values()),
        validaciones: cleanedValidaciones
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

// Active SSE client connections for instant push synchronization
const sseClients = new Set<express.Response>();

function notifyClients(payload: any) {
  const dataString = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(dataString);
    } catch {
      sseClients.delete(client);
    }
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
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: db.version || 1 });
  });

  // Server-Sent Events endpoint for instant real-time broadcasts
  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send current state version on connect
    res.write(`data: ${JSON.stringify({ type: 'init', version: db.version || 1, lastUpdated: db.lastUpdated })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Get centralized data for all users/PCs
  app.get('/api/data', (req, res) => {
    res.json({
      status: 'ok',
      data: db
    });
  });

  // Get all users specifically
  app.get('/api/usuarios', (req, res) => {
    res.json({
      status: 'ok',
      usuarios: db.usuarios || []
    });
  });

  // Direct login verification against server database
  app.post('/api/login', (req, res) => {
    const { user, pass } = req.body || {};
    const uTrim = String(user || '').trim().toLowerCase();
    const pTrim = String(pass || '').trim();

    if (!uTrim || !pTrim) {
      return res.status(400).json({ status: 'error', message: 'Usuario y contraseña requeridos' });
    }

    const found = (db.usuarios || []).find(
      (u: any) => (u.user?.toLowerCase() === uTrim || u.nombre?.toLowerCase() === uTrim) && u.pass === pTrim
    );

    if (!found) {
      return res.status(401).json({ status: 'error', message: 'Usuario o contraseña incorrectos' });
    }

    res.json({
      status: 'ok',
      user: {
        user: found.user,
        nombre: found.nombre,
        rol: found.rol
      }
    });
  });

  // Update users specifically
  app.post('/api/usuarios', (req, res) => {
    try {
      const { usuarios } = req.body || {};
      if (Array.isArray(usuarios)) {
        db.usuarios = usuarios;
        db.version = (db.version || 1) + 1;
        db.lastUpdated = new Date().toISOString();
        saveDatabase(db);
        notifyClients({ type: 'sync', version: db.version, data: db });
        return res.json({ status: 'ok', data: db.usuarios });
      }
      res.status(400).json({ status: 'error', message: 'Formato de usuarios no válido' });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Fast bulk worker sync endpoint
  app.post('/api/trabajadores', (req, res) => {
    try {
      const { trabajadores, append } = req.body || {};
      if (Array.isArray(trabajadores)) {
        if (append) {
          const map = new Map<string, any>();
          (db.trabajadores || []).forEach((t: any) => {
            const dni = String(t.dni || '').trim();
            if (dni) map.set(dni, t);
          });
          trabajadores.forEach((t: any) => {
            const dni = String(t.dni || '').trim();
            if (dni) map.set(dni, t);
          });
          db.trabajadores = Array.from(map.values());
        } else {
          const seen = new Set<string>();
          const unique: any[] = [];
          trabajadores.forEach((t: any) => {
            const dni = String(t.dni || '').trim();
            if (dni && !seen.has(dni)) {
              seen.add(dni);
              unique.push(t);
            }
          });
          db.trabajadores = unique;
        }

        db.version = (db.version || 1) + 1;
        db.lastUpdated = new Date().toISOString();
        saveDatabase(db);
        notifyClients({ type: 'sync', version: db.version, data: db });
        return res.json({ status: 'ok', count: db.trabajadores.length, data: db.trabajadores });
      }
      res.status(400).json({ status: 'error', message: 'Formato de trabajadores no válido' });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Helper for normalizing supervisor name
  function normalizeSupervisorKey(sup?: string): string {
    if (!sup) return '';
    return sup
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  // Merge reservas by supervisor, date, and module (never wiping out other supervisors)
  function mergeReservas(existing: any[] = [], incoming: any[] = []): any[] {
    const map = new Map<string, any>();
    const all = [...existing, ...incoming];
    for (const item of all) {
      if (!item || !item.id) continue;
      if (map.has(item.id)) {
        const prev = map.get(item.id);
        if ((item.timestamp || '') >= (prev?.timestamp || '')) {
          map.set(item.id, item);
        }
        continue;
      }
      const normSup = normalizeSupervisorKey(item.supervisor);
      const existingMatch = Array.from(map.values()).find(
        (e: any) =>
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
    return Array.from(map.values()).sort((a: any, b: any) =>
      (b.timestamp || '').localeCompare(a.timestamp || '')
    );
  }

  // Save or update reservation(s) by supervisor
  app.post('/api/reservas', (req, res) => {
    try {
      const { reserva, reservas } = req.body;
      const incomingList = reserva ? [reserva] : Array.isArray(reservas) ? reservas : [];
      if (incomingList.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No se envió reserva válida' });
      }

      db.reservas = mergeReservas(db.reservas || [], incomingList);
      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);

      notifyClients({ type: 'sync', version: db.version, data: db });
      res.json({ status: 'ok', count: db.reservas.length, reservas: db.reservas });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Delete a specific reservation
  app.delete('/api/reservas/:id', (req, res) => {
    try {
      const { id } = req.params;
      const prevCount = (db.reservas || []).length;
      db.reservas = (db.reservas || []).filter((r: any) => r.id !== id);
      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);

      notifyClients({ type: 'sync', version: db.version, data: db });
      res.json({ status: 'ok', deleted: prevCount !== db.reservas.length, reservas: db.reservas });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
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
        if (Array.isArray(incoming.validaciones)) {
          db.validaciones = sanitizeValidaciones(incoming.validaciones);
        }
        if (Array.isArray(incoming.usuarios) && incoming.usuarios.length > 0) db.usuarios = incoming.usuarios;
        if (Array.isArray(incoming.lideres)) db.lideres = incoming.lideres;
        if (Array.isArray(incoming.grupos)) db.grupos = incoming.grupos;
        if (Array.isArray(incoming.reservas)) {
          db.reservas = mergeReservas(db.reservas || [], incoming.reservas);
        }
        if (incoming.modulos && typeof incoming.modulos === 'object') {
          db.modulos = { ...(db.modulos || {}), ...incoming.modulos };
        }

        db.version = (db.version || 1) + 1;
        db.lastUpdated = new Date().toISOString();
        saveDatabase(db);

        // Push updates to all connected devices immediately
        notifyClients({ type: 'sync', version: db.version, data: db });
      }
      res.json({ status: 'ok', data: db, version: db.version });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Clean all test/mock data
  app.post('/api/reset', (req, res) => {
    try {
      const preservedUsers = db.usuarios || DEFAULT_USUARIOS;
      db = {
        ...getInitialData(),
        usuarios: preservedUsers,
        version: (db.version || 1) + 1,
        lastUpdated: new Date().toISOString()
      };
      saveDatabase(db);
      notifyClients({ type: 'sync', version: db.version, data: db });
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
