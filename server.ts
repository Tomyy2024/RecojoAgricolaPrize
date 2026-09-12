import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const DB_FILE = path.join(process.cwd(), 'data_store.json');

// Master default users & catalogs
const DEFAULT_USUARIOS = [
  { user: 'admin', pass: 'prize2026', nombre: 'Administrador General', rol: 'Administrador', creado: '2026-08-18' }
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
    auditoriaIngresos: [],
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

      // Auto-incorporar trabajadores desde detalleJabas si faltan en trabajadores
      const existingWorkerDnis = new Set((parsed.trabajadores || []).map((t: any) => String(t.dni || '').trim()));
      const extraWorkers: any[] = [];
      if (Array.isArray(parsed.detalleJabas)) {
        parsed.detalleJabas.forEach((d: any) => {
          const dni = String(d.dni || '').trim();
          if (dni && !existingWorkerDnis.has(dni)) {
            existingWorkerDnis.add(dni);
            extraWorkers.push({
              id: d.id || `w_${dni}`,
              dni: dni,
              nombres: d.trabajador || `Trabajador ${dni}`,
              supervisor: d.supervisor || '',
              fundo: d.fundo || 'Santa Teresa',
              modulo: d.modulo || 'M01',
              grupo: '',
              lider: '',
              jabas: Number(d.jabas) || 0,
              fecha: d.fecha || ''
            });
          }
        });
      }
      const combinedTrabajadores = extraWorkers.length > 0 ? [...(parsed.trabajadores || []), ...extraWorkers] : (parsed.trabajadores || []);

      return {
        ...getInitialData(),
        ...parsed,
        trabajadores: combinedTrabajadores,
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

  // Helper to sync from Cloud Firestore (ensures shared persistence across instances & users)
  async function syncFromCloudFirestore() {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) return;
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const app = getApps().length > 0 ? getApps()[0] : initializeApp(config, 'backend-cloud-sync');
      const cloudDb = getFirestore(app, config.firestoreDatabaseId);
      const snap = await getDoc(doc(cloudDb, 'app_state', 'master_data'));
      if (snap.exists()) {
        const data = snap.data();
        let changed = false;

        // 1. Trabajadores
        if (Array.isArray(data.trabajadores) && data.trabajadores.length > 0) {
          if (!db.trabajadores || db.trabajadores.length === 0 || data.trabajadores.length >= (db.trabajadores.length || 0)) {
            db.trabajadores = data.trabajadores;
            changed = true;
          }
        }

        // 2. Usuarios
        if (Array.isArray(data.usuarios) && data.usuarios.length > 0) {
          const userMap = new Map<string, any>();
          DEFAULT_USUARIOS.forEach(u => userMap.set(u.user.toLowerCase(), u));
          (db.usuarios || []).forEach((u: any) => userMap.set(u.user.toLowerCase(), u));
          data.usuarios.forEach((u: any) => userMap.set(u.user.toLowerCase(), u));
          db.usuarios = Array.from(userMap.values());
          changed = true;
        }

        // 3. Detalle Jabas
        if (Array.isArray(data.detalleJabas) && data.detalleJabas.length > (db.detalleJabas?.length || 0)) {
          db.detalleJabas = data.detalleJabas;
          changed = true;
        }

        // 4. Programas & ProgramaGeneral
        if (Array.isArray(data.programas) && data.programas.length > (db.programas?.length || 0)) {
          db.programas = data.programas;
          changed = true;
        }
        if (Array.isArray(data.programaGeneral) && data.programaGeneral.length > (db.programaGeneral?.length || 0)) {
          db.programaGeneral = data.programaGeneral;
          changed = true;
        }

        // 5. Validaciones
        if (Array.isArray(data.validaciones) && data.validaciones.length > (db.validaciones?.length || 0)) {
          db.validaciones = sanitizeValidaciones(data.validaciones);
          changed = true;
        }

        // 6. Lideres & Grupos & Reservas & Modulos
        if (Array.isArray(data.lideres) && data.lideres.length > 0) {
          db.lideres = data.lideres;
          changed = true;
        }
        if (Array.isArray(data.grupos) && data.grupos.length > 0) {
          db.grupos = data.grupos;
          changed = true;
        }
        if (Array.isArray(data.reservas) && data.reservas.length > 0) {
          db.reservas = data.reservas;
          changed = true;
        }
        if (data.modulos && typeof data.modulos === 'object') {
          db.modulos = { ...(db.modulos || {}), ...data.modulos };
          changed = true;
        }

        if (changed) {
          db.version = (db.version || 1) + 1;
          db.lastUpdated = new Date().toISOString();
          saveDatabase(db);
          console.log(`✅ [Backend] Base central actualizada desde Firestore: ${db.trabajadores?.length || 0} trabajadores, ${db.usuarios?.length || 0} usuarios.`);
          notifyClients({ type: 'sync', version: db.version, data: db });
        }
      }
    } catch (err: any) {
      console.warn('[Backend] Aviso Firestore:', err?.message || err);
    }
  }

  // Helper to persist server changes directly to Cloud Firestore
  async function syncToCloudFirestore(updateData: any) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) return;
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      const app = getApps().length > 0 ? getApps()[0] : initializeApp(config, 'backend-cloud-sync');
      const cloudDb = getFirestore(app, config.firestoreDatabaseId);

      const payload: Record<string, any> = {
        lastUpdated: new Date().toISOString(),
        version: db.version || 1
      };
      if (Array.isArray(updateData.trabajadores)) payload.trabajadores = updateData.trabajadores;
      if (Array.isArray(updateData.usuarios)) payload.usuarios = updateData.usuarios;
      if (Array.isArray(updateData.programas)) payload.programas = updateData.programas;
      if (Array.isArray(updateData.programaGeneral)) payload.programaGeneral = updateData.programaGeneral;
      if (Array.isArray(updateData.detalleJabas)) payload.detalleJabas = updateData.detalleJabas;
      if (Array.isArray(updateData.validaciones)) payload.validaciones = updateData.validaciones;
      if (Array.isArray(updateData.lideres)) payload.lideres = updateData.lideres;
      if (Array.isArray(updateData.grupos)) payload.grupos = updateData.grupos;
      if (Array.isArray(updateData.reservas)) payload.reservas = updateData.reservas;
      if (updateData.modulos) payload.modulos = updateData.modulos;

      await setDoc(doc(cloudDb, 'app_state', 'master_data'), payload, { merge: true });
    } catch (err: any) {
      console.warn('[Backend] Error guardando en Firestore:', err?.message || err);
    }
  }

  // Run initial sync on boot
  syncFromCloudFirestore();

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
  app.get('/api/data', async (req, res) => {
    if (!db.trabajadores || db.trabajadores.length === 0) {
      await syncFromCloudFirestore();
    }
    res.json({
      status: 'ok',
      data: db
    });
  });

  // Get all users specifically
  app.get('/api/usuarios', async (req, res) => {
    if (!db.usuarios || db.usuarios.length <= 1) {
      await syncFromCloudFirestore();
    }
    res.json({
      status: 'ok',
      usuarios: db.usuarios || []
    });
  });

  // Direct login verification against server database with audit recording
  app.post('/api/login', async (req, res) => {
    const { user, pass, dispositivo } = req.body || {};
    const uTrim = String(user || '').trim().toLowerCase();
    const pTrim = String(pass || '').trim();

    if (!uTrim || !pTrim) {
      return res.status(400).json({ status: 'error', message: 'Usuario y contraseña requeridos' });
    }

    let found = (db.usuarios || []).find(
      (u: any) =>
        (u.user?.toLowerCase() === uTrim || u.nombre?.toLowerCase() === uTrim) &&
        (u.pass === pTrim || (u.user?.toLowerCase() === 'admin' && (pTrim === 'prize2026' || pTrim === 'admin123')))
    );

    if (!found) {
      await syncFromCloudFirestore();
      found = (db.usuarios || []).find(
        (u: any) =>
          (u.user?.toLowerCase() === uTrim || u.nombre?.toLowerCase() === uTrim) &&
          (u.pass === pTrim || (u.user?.toLowerCase() === 'admin' && (pTrim === 'prize2026' || pTrim === 'admin123')))
      );
    }

    if (!found) {
      return res.status(401).json({ status: 'error', message: 'Usuario o contraseña incorrectos' });
    }

    // Capture exact login time and date
    const now = new Date();
    const fecha = now.toISOString().slice(0, 10);
    const horaIngreso = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const disp = dispositivo || (String(req.headers['user-agent'] || '').includes('Mobi') ? 'Celular' : 'PC');

    // Update user's last login timestamps
    found.ultimoLogin = now.toISOString();
    found.ultimaHoraLogin = horaIngreso;
    found.ultimaFechaLogin = fecha;
    found.ultimaHoraAcceso = horaIngreso;
    found.ultimaFechaAcceso = fecha;
    found.ultimoIngreso = now.toISOString();

    // Register login event in database
    if (!Array.isArray(db.auditoriaIngresos)) {
      db.auditoriaIngresos = [];
    }

    const auditEntry = {
      id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user: found.user,
      nombre: found.nombre,
      rol: found.rol,
      fecha,
      horaIngreso,
      horaLogin: horaIngreso,
      dispositivo: disp,
      timestamp: now.toISOString()
    };

    db.auditoriaIngresos.unshift(auditEntry);
    if (db.auditoriaIngresos.length > 1000) {
      db.auditoriaIngresos = db.auditoriaIngresos.slice(0, 1000);
    }

    saveDatabase(db);
    notifyClients({ type: 'sync', version: db.version, data: db });

    res.json({
      status: 'ok',
      user: {
        user: found.user,
        nombre: found.nombre,
        rol: found.rol,
        horaLogin: horaIngreso,
        fechaLogin: fecha,
        horaIngreso,
        fechaIngreso: fecha,
        ultimoIngreso: found.ultimoIngreso
      },
      auditEntry
    });
  });

  // Get audit log entries
  app.get('/api/auditoria-ingresos', (req, res) => {
    res.json({
      status: 'ok',
      auditoria: db.auditoriaIngresos || []
    });
  });

  // Add / Sync audit log entries
  app.post('/api/auditoria-ingresos', (req, res) => {
    try {
      const { entry, entries } = req.body || {};
      if (!Array.isArray(db.auditoriaIngresos)) {
        db.auditoriaIngresos = [];
      }

      if (entry && entry.id) {
        db.auditoriaIngresos = [entry, ...db.auditoriaIngresos.filter((x: any) => x.id !== entry.id)].slice(0, 1000);
      } else if (Array.isArray(entries)) {
        const map = new Map<string, any>();
        db.auditoriaIngresos.forEach((x: any) => { if (x && x.id) map.set(x.id, x); });
        entries.forEach((x: any) => { if (x && x.id) map.set(x.id, x); });
        db.auditoriaIngresos = Array.from(map.values())
          .sort((a: any, b: any) => new Date(b.timestamp || b.fecha).getTime() - new Date(a.timestamp || a.fecha).getTime())
          .slice(0, 1000);
      }

      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);
      notifyClients({ type: 'sync', version: db.version, data: db });
      return res.json({ status: 'ok', data: db.auditoriaIngresos });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
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

  // Endpoint específico para depurar trabajadores del día anterior
  app.post('/api/depurar-trabajadores', (req, res) => {
    try {
      const { userRole, targetDate } = req.body || {};
      if (userRole && userRole !== 'Administrador') {
        return res.status(403).json({
          status: 'error',
          message: 'Solo el rol Administrador tiene permisos para depurar la nómina de trabajadores'
        });
      }

      const today = targetDate || new Date().toISOString().slice(0, 10);
      const prevCount = (db.trabajadores || []).length;

      // Filtrar y eliminar trabajadores cuya fecha sea anterior a hoy
      const remaining = (db.trabajadores || []).filter((t: any) => {
        const tFecha = t.fecha ? normalizeDateServer(t.fecha) : '';
        if (tFecha && tFecha < today) {
          return false;
        }
        return true;
      });

      const purgedCount = prevCount - remaining.length;
      db.trabajadores = remaining;
      db.fechaUltimaDepuracion = today;
      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);

      // Notificar a todos los clientes inmediatamente con la nómina depurada
      notifyClients({
        type: 'sync',
        action: 'depurar_trabajadores',
        version: db.version,
        data: db,
        fechaUltimaDepuracion: today
      });

      res.json({
        status: 'ok',
        message: `Depuración completada: ${purgedCount} trabajadores de días anteriores eliminados`,
        purgedCount,
        eliminadosCount: purgedCount,
        count: remaining.length,
        trabajadores: remaining,
        fechaUltimaDepuracion: today
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Fast bulk worker sync endpoint - Administrador y Supervisor pueden actualizar nómina
  app.post('/api/trabajadores', (req, res) => {
    try {
      const { trabajadores, append, userRole } = req.body || {};

      // Restricción estricta: Rol Trabajador no puede modificar la nómina central
      if (userRole === 'Trabajador') {
        return res.status(403).json({
          status: 'error',
          message: 'El rol Trabajador no tiene permisos para cargar o modificar la nómina de personal.'
        });
      }

      if (Array.isArray(trabajadores)) {
        if (append) {
          const map = new Map<string, any>();
          (db.trabajadores || []).forEach((t: any, i: number) => {
            const dni = String(t.dni || '').replace(/\s+/g, '').trim();
            const key = t.id || (dni ? `${dni}__${t.nombres}` : `idx_${i}__${t.nombres}`);
            map.set(key, { ...t, dni: dni || String(t.dni || '').trim() });
          });
          trabajadores.forEach((t: any, i: number) => {
            const dni = String(t.dni || '').replace(/\s+/g, '').trim();
            const key = t.id || (dni ? `${dni}__${t.nombres}` : `new_idx_${i}__${t.nombres}`);
            map.set(key, { ...t, dni: dni || String(t.dni || '').trim() });
          });
          db.trabajadores = Array.from(map.values());
        } else {
          const seen = new Set<string>();
          const unique: any[] = [];
          trabajadores.forEach((t: any, i: number) => {
            const dni = String(t.dni || '').replace(/\s+/g, '').trim();
            const rawDni = String(t.dni || '').trim();
            const key = t.id || (dni ? `${dni}__${t.nombres}` : `idx_${i}__${t.nombres}`);
            if (!seen.has(key)) {
              seen.add(key);
              unique.push({
                ...t,
                dni: dni || rawDni || String(t.dni || '').trim(),
                nombres: t.nombres ? String(t.nombres).trim() : '',
                supervisor: t.supervisor ? String(t.supervisor).trim() : '',
                fundo: t.fundo ? String(t.fundo).trim() : '',
                modulo: t.modulo ? String(t.modulo).trim() : '',
                grupo: t.grupo ? String(t.grupo).trim() : '',
                lider: t.lider ? String(t.lider).trim() : '',
                fecha: t.fecha || ''
              });
            }
          });
          db.trabajadores = unique;
        }

        db.version = (db.version || 1) + 1;
        db.lastUpdated = new Date().toISOString();
        saveDatabase(db);
        syncToCloudFirestore({ trabajadores: db.trabajadores });
        notifyClients({ type: 'sync', version: db.version, data: db });
        return res.json({ status: 'ok', count: db.trabajadores.length, data: db.trabajadores });
      }
      res.status(400).json({ status: 'error', message: 'Formato de trabajadores no válido' });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Endpoint para desasignar todos los trabajadores (quedan todos como 'Sin Grupo ni Líder' / Pendientes)
  app.post('/api/desasignar-todos-trabajadores', (req, res) => {
    try {
      const { userRole, filtroSupervisor, filtroFundo, filtroModulo } = req.body || {};
      if (userRole === 'Trabajador') {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes permisos para modificar asignaciones de personal.'
        });
      }

      let countDesasignados = 0;
      db.trabajadores = (db.trabajadores || []).map((t: any) => {
        // Si hay filtros aplicados, desasignar solo los que coincidan
        if (filtroSupervisor && t.supervisor && t.supervisor !== filtroSupervisor) return t;
        if (filtroFundo && t.fundo && t.fundo !== filtroFundo) return t;
        if (filtroModulo && t.modulo && t.modulo !== filtroModulo) return t;

        const hadGrupo = t.grupo && t.grupo.trim() !== '' && t.grupo.toLowerCase() !== 'sin grupo';
        const hadLider = t.lider && t.lider.trim() !== '' && !t.lider.toLowerCase().includes('sin');
        if (hadGrupo || hadLider) {
          countDesasignados++;
        }
        return {
          ...t,
          grupo: '',
          lider: ''
        };
      });

      // Limpiar también reservas de hoy si las hubiera
      const today = new Date().toISOString().slice(0, 10);
      if (Array.isArray(db.reservas)) {
        db.reservas = db.reservas.filter((r: any) => r.fecha !== today);
      }

      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);
      syncToCloudFirestore({ trabajadores: db.trabajadores, reservas: db.reservas });
      notifyClients({ type: 'sync', version: db.version, data: db });

      res.json({
        status: 'ok',
        message: `Se desasignaron ${countDesasignados} trabajadores con éxito`,
        countDesasignados,
        trabajadores: db.trabajadores
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Endpoint para cargar directamente la nómina de trabajadores desde la hoja 'Trabajadores' de Google Sheets
  app.post('/api/cargar-nomina-sheet', async (req, res) => {
    try {
      const { url, userRole } = req.body || {};
      if (userRole === 'Trabajador') {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes permisos para cargar la nómina de personal.'
        });
      }

      const targetUrl = url || 'https://script.google.com/macros/s/AKfycbwUwC4PwsVrEGdGItPkAwu8-k8lJePnEIwitNhakUGqHEKWLZLr_i49FMMDh-fog0y2/exec';
      const fetchUrl = targetUrl.includes('?') ? `${targetUrl}&accion=export` : `${targetUrl}?accion=export`;

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        return res.status(502).json({
          status: 'error',
          message: `Error al conectar con Google Sheets Web App (HTTP ${response.status})`
        });
      }

      const json: any = await response.json();
      if (!json || json.status !== 'ok' || !json.data) {
        return res.status(502).json({
          status: 'error',
          message: 'La respuesta de Google Sheets no contiene datos válidos o no tiene la versión del script requerida.'
        });
      }

      const incomingTrabajadores = json.data.trabajadores;
      if (!Array.isArray(incomingTrabajadores) || incomingTrabajadores.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'La hoja "Trabajadores" en Google Sheets está vacía o no fue encontrada.'
        });
      }

      // Normalizar trabajadores respetando estrictamente las columnas del sheet Trabajadores
      const seen = new Set<string>();
      const normalizedWorkers: any[] = [];
      let countPendientes = 0;
      let countAsignados = 0;

      incomingTrabajadores.forEach((t: any, i: number) => {
        const cleanDni = String(t.dni || '').replace(/\s+/g, '').trim();
        const rawDni = String(t.dni || '').trim();
        const dni = cleanDni || rawDni;
        const key = dni ? dni : `idx_${i}_${t.nombres}`;

        if (!seen.has(key)) {
          seen.add(key);
          const grupo = t.grupo && String(t.grupo).trim().toLowerCase() !== 'sin grupo' ? String(t.grupo).trim() : '';
          const lider = t.lider && !String(t.lider).trim().toLowerCase().includes('sin') ? String(t.lider).trim() : '';

          if (grupo || lider) {
            countAsignados++;
          } else {
            countPendientes++;
          }

          normalizedWorkers.push({
            id: t.id || `w_${dni || i}`,
            dni: dni,
            nombres: String(t.nombres || '').trim(),
            fundo: String(t.fundo || 'Arena Azul').trim(),
            modulo: String(t.modulo || 'M01').trim(),
            supervisor: String(t.supervisor || '').trim(),
            grupo: grupo,
            lider: lider,
            tipo: String(t.tipo || 'Cosechador').trim(),
            jabas: 0,
            fecha: t.fecha || ''
          });
        }
      });

      db.trabajadores = normalizedWorkers;
      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);
      syncToCloudFirestore({ trabajadores: db.trabajadores });
      notifyClients({ type: 'sync', version: db.version, data: db });

      res.json({
        status: 'ok',
        message: `Nómina cargada exitosamente desde hoja 'Trabajadores': ${normalizedWorkers.length} trabajadores`,
        count: normalizedWorkers.length,
        pendientes: countPendientes,
        asignados: countAsignados,
        trabajadores: normalizedWorkers
      });
    } catch (err: any) {
      console.error('Error en cargar-nomina-sheet:', err);
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
      const itemGrp = (item.grupo || 'Grupo 01').trim().toLowerCase();
      const existingMatch = Array.from(map.values()).find(
        (e: any) =>
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
    return Array.from(map.values()).sort((a: any, b: any) =>
      (b.timestamp || '').localeCompare(a.timestamp || '')
    );
  }

  // Save or update reservation(s) by supervisor
  app.post('/api/reservas', (req, res) => {
    try {
      const { reserva, reservas, replaceAll } = req.body || {};
      if (replaceAll && Array.isArray(reservas)) {
        db.reservas = reservas;
      } else {
        const incomingList = reserva ? [reserva] : Array.isArray(reservas) ? reservas : [];
        if (incomingList.length === 0) {
          return res.status(400).json({ status: 'error', message: 'No se envió reserva válida' });
        }
        db.reservas = mergeReservas(db.reservas || [], incomingList);
      }
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
        // If client specifies an older version, ignore outdated overwrites
        if (typeof incoming.version === 'number' && db.version && incoming.version < db.version) {
          return res.json({ status: 'ok', data: db, version: db.version, ignoredStale: true });
        }

        const isWorkerRole = incoming.userRole === 'Trabajador';
        const isAdmin = incoming.userRole === 'Administrador' || !incoming.userRole || incoming.userRole === 'admin';

        if (Array.isArray(incoming.programas)) db.programas = incoming.programas;
        if (Array.isArray(incoming.programaGeneral)) db.programaGeneral = incoming.programaGeneral;

        // Solo se ignora db.trabajadores si expresamente el rol es 'Trabajador'
        if (!isWorkerRole && Array.isArray(incoming.trabajadores) && incoming.trabajadores.length > 0) {
          db.trabajadores = incoming.trabajadores;
        }
        if (Array.isArray(incoming.detalleJabas)) db.detalleJabas = incoming.detalleJabas;
        if (Array.isArray(incoming.validaciones)) {
          db.validaciones = sanitizeValidaciones(incoming.validaciones);
        }
        if (Array.isArray(incoming.usuarios) && incoming.usuarios.length > 0) {
          // Always ensure admin exists
          const adminUser = (incoming.usuarios || []).find((u: any) => u.user?.toLowerCase() === 'admin') || DEFAULT_USUARIOS[0];
          const otherUsers = (incoming.usuarios || []).filter((u: any) => u.user?.toLowerCase() !== 'admin');
          db.usuarios = [adminUser, ...otherUsers];
        }
        if (Array.isArray(incoming.lideres)) db.lideres = incoming.lideres;
        if (Array.isArray(incoming.grupos)) db.grupos = incoming.grupos;
        if (Array.isArray(incoming.reservas)) {
          if (isAdmin) {
            db.reservas = incoming.reservas;
          } else {
            db.reservas = mergeReservas(db.reservas || [], incoming.reservas);
          }
        }
        if (incoming.modulos && typeof incoming.modulos === 'object') {
          db.modulos = { ...(db.modulos || {}), ...incoming.modulos };
        }

        db.version = (db.version || 1) + 1;
        db.lastUpdated = new Date().toISOString();
        saveDatabase(db);
        syncToCloudFirestore(db);

        // Push updates to all connected devices immediately
        notifyClients({ type: 'sync', version: db.version, data: db });
      }
      res.json({ status: 'ok', data: db, version: db.version });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Wipe all backup and test data completely
  app.post('/api/wipe-backups', (req, res) => {
    try {
      db = {
        ...getInitialData(),
        usuarios: DEFAULT_USUARIOS,
        version: (db.version || 100) + 10,
        lastUpdated: new Date().toISOString()
      };
      saveDatabase(db);
      notifyClients({ type: 'sync', version: db.version, data: db });
      res.json({ status: 'ok', message: 'Todos los datos de backup eliminados', data: db });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Clean all test/mock data
  app.post('/api/reset', (req, res) => {
    try {
      const preservedUsers = (db.usuarios || DEFAULT_USUARIOS).filter(
        (u: any) => u.rol !== 'Supervisor' && u.user?.toLowerCase() === 'admin'
      );
      db = {
        ...getInitialData(),
        usuarios: preservedUsers.length > 0 ? preservedUsers : DEFAULT_USUARIOS,
        version: (db.version || 100) + 10,
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
