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

  // Textual month format e.g. "Fri Sep 11 2026 00:00:00 GMT-0500" or "Sep 11 2026"
  const textDateMatch = s.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
  if (textDateMatch) {
    const mStr = textDateMatch[1].toLowerCase();
    const months: Record<string, string> = {
      jan: '01', ene: '01', feb: '02', mar: '03', apr: '04', abr: '04',
      may: '05', jun: '06', jul: '07', aug: '08', ago: '08', sep: '09',
      set: '09', oct: '10', nov: '11', dec: '12', dic: '12'
    };
    const m = months[mStr];
    if (m) {
      const day = textDateMatch[2].padStart(2, '0');
      const year = textDateMatch[3];
      return `${year}-${m}-${day}`;
    }
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

function sanitizeAndDeduplicateDetalleJabas(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const map = new Map<string, any>();

  list.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const rawDni = String(item.dni || '').trim();
    const cleanDni = rawDni.replace(/\D/g, '') || rawDni;
    const trabajador = String(item.trabajador || '').trim();
    const jabas = Number(item.jabas) || 0;

    // Strict rejection of empty/ghost records
    if ((!cleanDni && !trabajador) || jabas <= 0 || isNaN(jabas)) {
      return;
    }

    let fecha = normalizeDateServer(item.fecha) || normalizeDateServer(item.timestamp);
    if (!fecha) {
      fecha = '2026-09-11';
    }

    const normModulo = String(item.modulo || 'M01').trim().toUpperCase();
    const cleanId = String(item.id || '').trim();
    const primaryKey = cleanId || `${fecha}_${cleanDni}_${normModulo}`;

    const cleanRecord = {
      id: cleanId || primaryKey,
      fecha: fecha,
      timestamp: item.timestamp || new Date().toISOString(),
      supervisor: String(item.supervisor || '').trim(),
      fundo: String(item.fundo || 'Santa Teresa').trim(),
      modulo: normModulo,
      grupo: String(item.grupo || '').trim(),
      lider: String(item.lider || '').trim(),
      dni: cleanDni,
      trabajador: trabajador || (cleanDni ? `Trabajador ${cleanDni}` : 'Sin Nombre'),
      jabas: Math.round(jabas)
    };

    if (map.has(primaryKey)) {
      const existing = map.get(primaryKey);
      map.set(primaryKey, {
        ...existing,
        ...cleanRecord,
        id: existing.id || cleanRecord.id,
        jabas: Math.max(Number(existing.jabas) || 0, cleanRecord.jabas),
        trabajador: cleanRecord.trabajador && !cleanRecord.trabajador.startsWith('Trabajador ') ? cleanRecord.trabajador : existing.trabajador,
        supervisor: cleanRecord.supervisor || existing.supervisor,
        grupo: cleanRecord.grupo || existing.grupo,
        lider: cleanRecord.lider || existing.lider
      });
    } else {
      map.set(primaryKey, cleanRecord);
    }
  });

  return Array.from(map.values());
}

async function pushDetalleJabasToGoogleSheet(sheetUrl: string, cleanDetalle: any[]) {
  if (!sheetUrl) return;
  try {
    const payload = {
      accion: 'sync',
      data: {
        detalleJabas: cleanDetalle
      }
    };
    await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    console.log(`[Google Sheet] Sincronizados ${cleanDetalle.length} registros limpios a la hoja Registro_Avance.`);
  } catch (e: any) {
    console.warn('[Google Sheet] Error al sincronizar con sheet:', e?.message || e);
  }
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
      const cleanedDetalleJabas = sanitizeAndDeduplicateDetalleJabas(parsed.detalleJabas);
      const pureTrabajadores = Array.isArray(parsed.trabajadores) ? parsed.trabajadores : [];

      return {
        ...getInitialData(),
        ...parsed,
        trabajadores: pureTrabajadores,
        detalleJabas: cleanedDetalleJabas,
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

        // 1. Trabajadores (sincronizar nómina exacta desde la nube sin borrar accidentalmente)
        if (Array.isArray(data.trabajadores)) {
          const isExplicitPurge = data.depurado === true || data.forceNominaUpdate === true;
          if (data.trabajadores.length > 0 || isExplicitPurge || !(db.trabajadores && db.trabajadores.length > 0)) {
            db.trabajadores = data.trabajadores;
            changed = true;
          } else if ((db.trabajadores || []).length > 0 && data.trabajadores.length === 0) {
            // El servidor local ya tiene trabajadores pero Firestore está vacío: sincronizar a la nube
            syncToCloudFirestore({ trabajadores: db.trabajadores });
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
        if (Array.isArray(data.detalleJabas)) {
          const sanitized = sanitizeAndDeduplicateDetalleJabas(data.detalleJabas);
          if (sanitized.length !== (db.detalleJabas || []).length || JSON.stringify(sanitized) !== JSON.stringify(db.detalleJabas)) {
            db.detalleJabas = sanitized;
            changed = true;
          }
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
      const { trabajadores, append, modo, fechaTarget, userRole } = req.body || {};

      // Restricción estricta: Rol Trabajador no puede modificar la nómina central
      if (userRole === 'Trabajador') {
        return res.status(403).json({
          status: 'error',
          message: 'El rol Trabajador no tiene permisos para cargar o modificar la nómina de personal.'
        });
      }

      if (Array.isArray(trabajadores)) {
        const todayIso = new Date().toISOString().slice(0, 10);
        const targetFechaNorm = normalizeDateServer(fechaTarget) || (trabajadores[0]?.fecha ? normalizeDateServer(trabajadores[0].fecha) : todayIso);
        const effectiveModo = modo || (append ? 'append' : (fechaTarget ? 'reemplazar_fecha' : 'reemplazar_todo'));

        const seen = new Set<string>();
        const incomingClean: any[] = [];
        trabajadores.forEach((t: any, i: number) => {
          const dni = String(t.dni || '').replace(/\s+/g, '').trim();
          const rawDni = String(t.dni || '').trim();
          const effectiveDni = dni || rawDni;
          const tFecha = t.fecha ? normalizeDateServer(t.fecha) : targetFechaNorm;
          const key = effectiveDni ? `${effectiveDni}__${tFecha || 's_f'}` : (t.id ? `${t.id}__${tFecha}` : `idx_${i}__${tFecha}__${t.nombres}`);
          if (!seen.has(key)) {
            seen.add(key);
            incomingClean.push({
              ...t,
              id: t.id || `w_${effectiveDni || i}_${tFecha || 'sf'}`,
              dni: effectiveDni,
              nombres: t.nombres ? String(t.nombres).trim() : '',
              supervisor: t.supervisor ? String(t.supervisor).trim() : '',
              fundo: t.fundo ? String(t.fundo).trim() : '',
              modulo: t.modulo ? String(t.modulo).trim() : '',
              grupo: t.grupo ? String(t.grupo).trim() : '',
              lider: t.lider ? String(t.lider).trim() : '',
              fecha: tFecha
            });
          }
        });

        if (effectiveModo === 'reemplazar_fecha' && targetFechaNorm) {
          // Mantener trabajadores de otras fechas intactos
          const otrasFechas = (db.trabajadores || []).filter((w: any) => {
            const wf = normalizeDateServer(w.fecha);
            return wf && wf !== targetFechaNorm;
          });
          db.trabajadores = [...otrasFechas, ...incomingClean];
        } else if (effectiveModo === 'append' || effectiveModo === 'append_date') {
          const existingMap = new Map<string, any>();
          (db.trabajadores || []).forEach((t: any, i: number) => {
            const dni = String(t.dni || '').replace(/\s+/g, '').trim();
            const tFecha = t.fecha ? normalizeDateServer(t.fecha) : '';
            const key = dni ? `${dni}__${tFecha || 's_f'}` : (t.id ? `${t.id}__${tFecha}` : `idx_${i}__${tFecha}__${t.nombres}`);
            existingMap.set(key, t);
          });
          incomingClean.forEach((t: any) => {
            const dni = String(t.dni || '').replace(/\s+/g, '').trim();
            const tFecha = t.fecha ? normalizeDateServer(t.fecha) : '';
            const key = dni ? `${dni}__${tFecha || 's_f'}` : `${t.id}__${tFecha}`;
            existingMap.set(key, t);
          });
          db.trabajadores = Array.from(existingMap.values());
        } else {
          // 'reemplazar_todo'
          db.trabajadores = incomingClean;
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

  // Endpoint para pegar/cargar trabajadores en el aplicativo y replicarlos automáticamente a Google Sheets
  app.post('/api/replicar-trabajadores-sheet', async (req, res) => {
    try {
      const { trabajadores, url, modo = 'reemplazar_fecha', fechaTarget, userRole, replicarSheet = true } = req.body || {};
      if (userRole === 'Trabajador') {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes permisos para modificar la nómina de trabajadores.'
        });
      }

      if (!Array.isArray(trabajadores) || trabajadores.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No se enviaron trabajadores para procesar.'
        });
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const targetFechaNorm = normalizeDateServer(fechaTarget) || (trabajadores[0]?.fecha ? normalizeDateServer(trabajadores[0].fecha) : todayIso);

      // Normalizar trabajadores entrantes
      const normalizedTrabajadores = trabajadores.map((t: any, i: number) => {
        const cleanDni = String(t.dni || '').replace(/\s+/g, '').trim();
        const rawDni = String(t.dni || '').trim();
        const effectiveDni = cleanDni || rawDni;
        const tFecha = t.fecha ? normalizeDateServer(t.fecha) : targetFechaNorm;
        return {
          id: t.id || `w_${effectiveDni || i}_${tFecha}`,
          dni: effectiveDni,
          nombres: String(t.nombres || '').trim().toUpperCase(),
          fundo: String(t.fundo || 'Arena Azul').trim(),
          modulo: String(t.modulo || 'M01').trim(),
          grupo: String(t.grupo || '').trim(),
          supervisor: String(t.supervisor || '').trim(),
          lider: String(t.lider || '').trim(),
          tipo: String(t.tipo || 'Cosechador').trim(),
          jabas: Number(t.jabas) || 0,
          fecha: tFecha
        };
      });

      // 1. Integrar en la base de datos central de la app
      if (modo === 'reemplazar_fecha' && targetFechaNorm) {
        const otrasFechas = (db.trabajadores || []).filter((w: any) => {
          const wf = normalizeDateServer(w.fecha);
          return wf && wf !== targetFechaNorm;
        });
        db.trabajadores = [...otrasFechas, ...normalizedTrabajadores];
      } else if (modo === 'append') {
        const existingMap = new Map<string, any>();
        (db.trabajadores || []).forEach((t: any) => {
          const key = `${String(t.dni).trim()}__${normalizeDateServer(t.fecha)}`;
          existingMap.set(key, t);
        });
        normalizedTrabajadores.forEach((t: any) => {
          const key = `${String(t.dni).trim()}__${normalizeDateServer(t.fecha)}`;
          existingMap.set(key, t);
        });
        db.trabajadores = Array.from(existingMap.values());
      } else {
        // reemplazar_todo
        db.trabajadores = normalizedTrabajadores;
      }

      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);
      syncToCloudFirestore({ trabajadores: db.trabajadores });
      notifyClients({ type: 'sync', version: db.version, data: db });

      // 2. Replicar hacia la hoja 'Trabajadores' de Google Sheets
      const targetUrl = url || 'https://script.google.com/macros/s/AKfycbwUwC4PwsVrEGdGItPkAwu8-k8lJePnEIwitNhakUGqHEKWLZLr_i49FMMDh-fog0y2/exec';
      let sheetReplicated = false;
      let sheetError = '';

      if (replicarSheet && targetUrl) {
        try {
          const sheetPayload = {
            accion: 'sync',
            data: {
              trabajadores: db.trabajadores.map((t: any) => ({
                dni: t.dni || '',
                nombres: t.nombres || '',
                fundo: t.fundo || '',
                modulo: t.modulo || '',
                grupo: t.grupo || '',
                supervisor: t.supervisor || '',
                lider: t.lider || '',
                tipo: t.tipo || 'Cosechador'
              }))
            }
          };

          const sheetResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(sheetPayload)
          });

          const resText = await sheetResponse.text().catch(() => '');
          let resJson: any = null;
          try {
            resJson = JSON.parse(resText);
          } catch {}

          if (sheetResponse.ok || (resJson && resJson.status === 'ok')) {
            sheetReplicated = true;
          } else {
            sheetError = resJson?.message || resText.slice(0, 120) || `HTTP ${sheetResponse.status}`;
          }
        } catch (sErr: any) {
          console.warn('Advertencia al replicar a Google Sheets en background:', sErr);
          sheetError = sErr?.message || 'Error de conexión con Google Sheets';
        }
      }

      return res.json({
        status: 'ok',
        message: sheetReplicated
          ? `Se cargaron ${normalizedTrabajadores.length} trabajadores en el aplicativo y se replicaron a la hoja 'Trabajadores' de Google Sheets con éxito.`
          : `Se cargaron ${normalizedTrabajadores.length} trabajadores en el aplicativo.${sheetError ? ` Aviso Google Sheet: ${sheetError}` : ''}`,
        count: normalizedTrabajadores.length,
        totalEnSistema: db.trabajadores.length,
        fechaTarget: targetFechaNorm,
        sheetReplicated,
        sheetError: sheetError || undefined,
        trabajadores: db.trabajadores
      });
    } catch (err: any) {
      console.error('Error en /api/replicar-trabajadores-sheet:', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Endpoint para cargar directamente la nómina de trabajadores desde la hoja 'Trabajadores' de Google Sheets
  app.post('/api/cargar-nomina-sheet', async (req, res) => {
    try {
      const { url, userRole, fechaTarget, fecha, modo = 'reemplazar_fecha' } = req.body || {};
      if (userRole === 'Trabajador') {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes permisos para cargar la nómina de personal.'
        });
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const targetFechaNorm = normalizeDateServer(fechaTarget || fecha) || todayIso;

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
      if (!Array.isArray(incomingTrabajadores)) {
        return res.status(400).json({
          status: 'error',
          message: 'La hoja "Trabajadores" no fue encontrada en la respuesta de Google Sheets.'
        });
      }

      if (incomingTrabajadores.length === 0) {
        if (modo === 'reemplazar_todo') {
          db.trabajadores = [];
        } else if (modo === 'reemplazar_fecha') {
          // Limpiar solo los de la fecha seleccionada
          db.trabajadores = (db.trabajadores || []).filter((w: any) => {
            const wf = normalizeDateServer(w.fecha);
            return wf && wf !== targetFechaNorm;
          });
        }
        db.version = (db.version || 1) + 1;
        db.lastUpdated = new Date().toISOString();
        saveDatabase(db);
        syncToCloudFirestore({ trabajadores: db.trabajadores });
        notifyClients({ type: 'sync', version: db.version, data: db });

        return res.json({
          status: 'ok',
          message: `Hoja "Trabajadores" sincronizada: 0 trabajadores registrados para la fecha ${targetFechaNorm}`,
          count: 0,
          pendientes: 0,
          asignados: 0,
          fechaTarget: targetFechaNorm,
          trabajadores: db.trabajadores
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
        const workerFecha = t.fecha ? (normalizeDateServer(t.fecha) || targetFechaNorm) : targetFechaNorm;
        const key = dni ? `${dni}__${workerFecha}` : `idx_${i}_${t.nombres}_${workerFecha}`;

        if (!seen.has(key)) {
          seen.add(key);
          const grupo = t.grupo && String(t.grupo).trim().toLowerCase() !== 'sin grupo' ? String(t.grupo).trim() : '';
          const lider = t.lider && !String(t.lider).trim().toLowerCase().includes('sin') ? String(t.lider).trim() : '';

          const hasGrupo = Boolean(grupo && grupo.toLowerCase() !== 'sin grupo' && grupo.toLowerCase() !== 'sin asignar' && grupo.toLowerCase() !== 'ninguno');
          const hasLider = Boolean(lider && !lider.toLowerCase().includes('sin') && lider.toLowerCase() !== 'ninguno' && lider.toLowerCase() !== 'sin asignar');

          if (hasGrupo && hasLider) {
            countAsignados++;
          } else {
            countPendientes++;
          }

          normalizedWorkers.push({
            id: t.id || `w_${dni || i}_${workerFecha}`,
            dni: dni,
            nombres: String(t.nombres || '').trim(),
            fundo: String(t.fundo || 'Arena Azul').trim(),
            modulo: String(t.modulo || 'M01').trim(),
            supervisor: String(t.supervisor || '').trim(),
            grupo: grupo,
            lider: lider,
            tipo: String(t.tipo || 'Cosechador').trim(),
            jabas: 0,
            fecha: workerFecha
          });
        }
      });

      if (modo === 'reemplazar_fecha') {
        // Preservar los trabajadores de las demás fechas intactos
        const otrasFechas = (db.trabajadores || []).filter((w: any) => {
          const wf = normalizeDateServer(w.fecha);
          return wf && wf !== targetFechaNorm;
        });
        db.trabajadores = [...otrasFechas, ...normalizedWorkers];
      } else if (modo === 'append') {
        const existingForDate = new Set(
          (db.trabajadores || [])
            .filter((w: any) => normalizeDateServer(w.fecha) === targetFechaNorm)
            .map((w: any) => String(w.dni || '').trim())
        );
        const toAdd = normalizedWorkers.filter((w) => !existingForDate.has(String(w.dni).trim()));
        db.trabajadores = [...(db.trabajadores || []), ...toAdd];
      } else {
        // 'reemplazar_todo'
        db.trabajadores = normalizedWorkers;
      }

      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);
      syncToCloudFirestore({ trabajadores: db.trabajadores });
      notifyClients({ type: 'sync', version: db.version, data: db });

      res.json({
        status: 'ok',
        message: `Nómina cargada exitosamente para la fecha ${targetFechaNorm}: ${normalizedWorkers.length} trabajadores (Total acumulado: ${db.trabajadores.length})`,
        count: normalizedWorkers.length,
        totalEnSistema: db.trabajadores.length,
        fechaTarget: targetFechaNorm,
        pendientes: countPendientes,
        asignados: countAsignados,
        trabajadores: db.trabajadores
      });
    } catch (err: any) {
      console.error('Error en cargar-nomina-sheet:', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Endpoint para cargar y consolidar registros de la hoja 'Registro_Avance' de Google Sheets
  app.post('/api/cargar-avance-sheet', async (req, res) => {
    try {
      const { url, avanceRows, userRole } = req.body || {};
      if (userRole === 'Trabajador') {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes permisos para actualizar el registro de avance.'
        });
      }

      let incomingRows: any[] = [];

      // 1. Si se envían filas directamente (ej. pegadas desde el Sheet o procesadas en cliente)
      if (Array.isArray(avanceRows) && avanceRows.length > 0) {
        incomingRows = avanceRows;
      } else {
        // 2. Si se solicita consultar la URL del Google Sheets Web App
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
        if (json && json.status === 'ok' && json.data && Array.isArray(json.data.detalleJabas)) {
          incomingRows = json.data.detalleJabas;
        } else {
          return res.status(400).json({
            status: 'error',
            message: 'No se encontraron registros de avance en la respuesta de Google Sheets.'
          });
        }
      }

      if (incomingRows.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No se encontraron filas válidas para importar.'
        });
      }

      // Normalizar y consolidar con db.detalleJabas
      const existingMap = new Map<string, any>();
      (db.detalleJabas || []).forEach((d: any) => {
        const normFecha = normalizeDateServer(d.fecha) || normalizeDateServer(d.timestamp) || '2026-09-11';
        const cleanDni = String(d.dni || '').replace(/\D/g, '') || String(d.dni || '').trim();
        const normMod = String(d.modulo || 'M01').trim().toUpperCase();
        const key = d.id || `${normFecha}_${cleanDni}_${normMod}`;
        existingMap.set(key, d);
      });

      let addedCount = 0;
      let updatedCount = 0;
      let ignoredGhostCount = 0;
      const workersToAdd: any[] = [];
      const existingWorkerDnis = new Set<string>((db.trabajadores || []).map((t: any) => String(t.dni || '').trim()));

      incomingRows.forEach((row: any, idx: number) => {
        const rawDni = String(row.dni || '').trim();
        const cleanDni = rawDni.replace(/\D/g, '') || rawDni;
        const trabajador = String(row.trabajador || '').trim();
        const jabas = Number(row.jabas) || 0;

        // Strict rejection: discard rows with empty worker/DNI or 0 jabas
        if ((!cleanDni && !trabajador) || jabas <= 0 || isNaN(jabas)) {
          ignoredGhostCount++;
          return;
        }

        const effectiveDni = cleanDni || rawDni;
        const normFecha = normalizeDateServer(row.fecha) || normalizeDateServer(row.timestamp) || '2026-09-11';
        const timestamp = row.timestamp || new Date().toISOString();
        const normMod = String(row.modulo || 'M01').trim().toUpperCase();
        const rowId = row.id || `${normFecha}_${effectiveDni}_${normMod}`;

        const normalizedRecord = {
          id: rowId,
          fecha: normFecha,
          timestamp: timestamp,
          supervisor: String(row.supervisor || '').trim(),
          fundo: String(row.fundo || 'Santa Teresa').trim(),
          modulo: normMod,
          grupo: String(row.grupo || '').trim(),
          lider: String(row.lider || '').trim(),
          dni: effectiveDni,
          trabajador: trabajador || (effectiveDni ? `Trabajador ${effectiveDni}` : 'Sin Nombre'),
          jabas: Math.round(jabas)
        };

        if (existingMap.has(rowId)) {
          updatedCount++;
          const prev = existingMap.get(rowId);
          existingMap.set(rowId, {
            ...prev,
            ...normalizedRecord,
            id: prev.id || rowId,
            jabas: Math.max(Number(prev.jabas) || 0, normalizedRecord.jabas)
          });
        } else {
          addedCount++;
          existingMap.set(rowId, normalizedRecord);
        }

        // Si el trabajador no existe en el roster de trabajadores, registrarlo automáticamente
        if (effectiveDni && !existingWorkerDnis.has(effectiveDni)) {
          existingWorkerDnis.add(effectiveDni);
          workersToAdd.push({
            id: `w_${effectiveDni}`,
            dni: effectiveDni,
            nombres: normalizedRecord.trabajador,
            fundo: normalizedRecord.fundo,
            modulo: normalizedRecord.modulo,
            supervisor: normalizedRecord.supervisor,
            grupo: normalizedRecord.grupo,
            lider: normalizedRecord.lider,
            tipo: 'Cosechero',
            jabas: jabas,
            fecha: normFecha
          });
        }
      });

      // Asegurar que toda la lista esté limpia y deduplicada
      db.detalleJabas = sanitizeAndDeduplicateDetalleJabas(Array.from(existingMap.values()));
      if (workersToAdd.length > 0) {
        db.trabajadores = [...(db.trabajadores || []), ...workersToAdd];
      }

      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);
      syncToCloudFirestore({ detalleJabas: db.detalleJabas, trabajadores: db.trabajadores });
      notifyClients({ type: 'sync', version: db.version, data: db });

      // Calcular resumen de jabas por fecha para feedback
      const targetFecha = incomingRows[0]?.fecha ? normalizeDateServer(incomingRows[0].fecha) : '2026-09-11';
      const statsForDate = (db.detalleJabas || []).filter((d: any) => normalizeDateServer(d.fecha) === targetFecha);
      const uniquePersonsForDate = new Set(statsForDate.map((d: any) => String(d.dni || '').trim() || d.trabajador)).size;
      const totalJabasForDate = statsForDate.reduce((acc: number, d: any) => acc + (Number(d.jabas) || 0), 0);

      res.json({
        status: 'ok',
        message: `Registro de Avance cargado: ${incomingRows.length} procesados (${addedCount} nuevos, ${updatedCount} actualizados, ${ignoredGhostCount} registros vacíos omitidos)`,
        totalRegistros: db.detalleJabas.length,
        nuevos: addedCount,
        actualizados: updatedCount,
        omitidosVacios: ignoredGhostCount,
        trabajadoresAgregados: workersToAdd.length,
        fechaConsultada: targetFecha,
        personasConJabasEnFecha: uniquePersonsForDate,
        jabasEnFecha: totalJabasForDate,
        detalleJabas: db.detalleJabas,
        trabajadores: db.trabajadores
      });
    } catch (err: any) {
      console.error('Error en cargar-avance-sheet:', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Endpoint para eliminar registros de Registro_Avance (exclusivo para Administrador)
  app.post('/api/eliminar-registro-avance', async (req, res) => {
    try {
      const { id, ids, userRole, url } = req.body || {};
      const isAdmin = userRole === 'Administrador' || !userRole || userRole === 'admin';
      if (!isAdmin) {
        return res.status(403).json({
          status: 'error',
          message: 'Acceso denegado: sólo el Administrador puede eliminar registros de Registro_Avance.'
        });
      }

      const targetIds = new Set<string>();
      if (id && typeof id === 'string') targetIds.add(id.trim());
      if (Array.isArray(ids)) {
        ids.forEach((i: any) => {
          if (i && typeof i === 'string') targetIds.add(i.trim());
        });
      }

      if (targetIds.size === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Debes especificar al menos un ID de registro a eliminar.'
        });
      }

      const currentList = db.detalleJabas || [];
      const previousCount = currentList.length;
      const filteredList = currentList.filter((d: any) => !targetIds.has(String(d.id || '').trim()));
      const deletedCount = previousCount - filteredList.length;

      const cleanList = sanitizeAndDeduplicateDetalleJabas(filteredList);
      db.detalleJabas = cleanList;
      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);

      // Sincronizar a Cloud Firestore
      await syncToCloudFirestore({ detalleJabas: db.detalleJabas });

      // Sincronizar a Google Sheets para que las filas eliminadas no vuelvan a aparecer
      if (url) {
        await pushDetalleJabasToGoogleSheet(url, db.detalleJabas);
      }

      // Notificar a clientes conectados
      notifyClients({ type: 'sync', version: db.version, data: db });

      res.json({
        status: 'ok',
        message: `Se eliminaron ${deletedCount} registros de Registro_Avance con éxito.`,
        deletedCount,
        totalRestantes: db.detalleJabas.length,
        detalleJabas: db.detalleJabas
      });
    } catch (err: any) {
      console.error('Error en eliminar-registro-avance:', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Endpoint para depurar registros vacíos y duplicados de Registro_Avance (exclusivo para Administrador)
  app.post('/api/depurar-registro-avance', async (req, res) => {
    try {
      const { userRole, url } = req.body || {};
      const isAdmin = userRole === 'Administrador' || !userRole || userRole === 'admin';
      if (!isAdmin) {
        return res.status(403).json({
          status: 'error',
          message: 'Acceso denegado: sólo el Administrador puede depurar Registro_Avance.'
        });
      }

      const previousCount = (db.detalleJabas || []).length;
      const cleanList = sanitizeAndDeduplicateDetalleJabas(db.detalleJabas || []);
      const purgedCount = previousCount - cleanList.length;

      db.detalleJabas = cleanList;
      db.version = (db.version || 1) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDatabase(db);

      await syncToCloudFirestore({ detalleJabas: db.detalleJabas });
      if (url) {
        await pushDetalleJabasToGoogleSheet(url, db.detalleJabas);
      }
      notifyClients({ type: 'sync', version: db.version, data: db });

      res.json({
        status: 'ok',
        message: `Depuración completada: se eliminaron ${purgedCount} registros inválidos/duplicados. Total válidos: ${cleanList.length}.`,
        purgedCount,
        totalValidos: db.detalleJabas.length,
        detalleJabas: db.detalleJabas
      });
    } catch (err: any) {
      console.error('Error en depurar-registro-avance:', err);
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

        const isAdmin = incoming.userRole === 'Administrador' || incoming.userRole === 'admin' || incoming.isAdmin === true;

        if (Array.isArray(incoming.programas)) db.programas = incoming.programas;
        if (Array.isArray(incoming.programaGeneral)) db.programaGeneral = incoming.programaGeneral;

        // Regla estricta: SOLO el rol Administrador puede modificar la nómina maestra de trabajadores.
        // Los roles Supervisor, Digitador, Trabajador u otros NO pueden alterar la nómina bajo ninguna circunstancia.
        if (isAdmin && Array.isArray(incoming.trabajadores)) {
          const isExplicitPurge = incoming.depurado === true || incoming.forceNominaUpdate === true || incoming.action === 'reset';
          if (incoming.trabajadores.length > 0 || isExplicitPurge || !(db.trabajadores && db.trabajadores.length > 0)) {
            db.trabajadores = incoming.trabajadores;
          }
        }
        if (Array.isArray(incoming.detalleJabas)) {
          db.detalleJabas = sanitizeAndDeduplicateDetalleJabas(incoming.detalleJabas);
        }
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
