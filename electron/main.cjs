const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

// --- Embedded Backoffice Server ---
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

let mainWindow = null;
let server = null;
let activePort = 3001;
const SERVER_PORT = 3001;

// ==============================
// SQLite Database Setup
// ==============================
function getDbPath() {
  // Use the same DB as the backoffice server so both are always in sync
  const backofficeDbPath = path.join(__dirname, '..', 'o-melro-backoffice teste (1)', 'server', 'melro.db');
  return backofficeDbPath;
}

function createDatabase() {
  const dbPath = getDbPath();
  console.log('[SQLite] Usando banco de dados em:', dbPath);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
      console.log('Conectado ao banco de dados SQLite.');
    }
  });

  // Ativar WAL mode para melhor performance e resistência a corrupção
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA busy_timeout=5000');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      visitorName TEXT,
      company TEXT,
      email TEXT,
      phone TEXT,
      companion TEXT,
      entryTime TEXT,
      exitTime TEXT,
      date TEXT,
      reason TEXT
    )`);

    db.run(`ALTER TABLE visits ADD COLUMN phone TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE visits ADD COLUMN companion TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) console.error(err);
    });
    db.run(`ALTER TABLE visits ADD COLUMN objects TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) { /* ignore */ }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_visits_phone ON visits(phone)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_visits_email ON visits(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date)`);

    // visitors table
    db.run(`CREATE TABLE IF NOT EXISTS visitors (
      phone TEXT PRIMARY KEY,
      email TEXT,
      fullName TEXT,
      company TEXT,
      companion TEXT,
      visitReason TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`ALTER TABLE visitors ADD COLUMN companion TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) { /* ignore */ }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors(phone)`);
  });

  return db;
}

function syncVisitor(db, visitorName, company, email, phone) {
  const sql = `INSERT OR IGNORE INTO visitors (phone, email, fullName, company, createdAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
  db.run(sql, [phone, email, visitorName, company], (err) => {
    if (err) console.error('Erro ao sincronizar visitante:', err);
  });
}

// ==============================
// Express Server (Backoffice API)
// ==============================
function startBackofficeServer() {
  const db = createDatabase();
  const api = express();

  api.use(cors());
  api.use(express.json());

  // --- GET ALL VISITS ---
  api.get('/api/visits', (req, res) => {
    const email = req.query.email;
    if (email) {
      const decodedEmail = decodeURIComponent(email).toLowerCase();
      db.all("SELECT * FROM visits WHERE LOWER(email) = ? ORDER BY date DESC, entryTime DESC", [decodedEmail], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", data: rows || [] });
      });
    } else {
      db.all("SELECT * FROM visits ORDER BY date DESC, entryTime DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "success", data: rows || [] });
      });
    }
  });

  // --- STATS ---
  api.get('/api/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek.toISOString().split('T')[0];

    db.get("SELECT count(*) as count FROM visits WHERE exitTime IS NULL", [], (err, rowActive) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT count(*) as count FROM visits WHERE date = ?", [today], (err, rowToday) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT count(*) as count FROM visits WHERE date >= ?", [weekStart], (err, rowWeek) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ activeVisits: rowActive.count, totalToday: rowToday.count, totalWeek: rowWeek.count });
        });
      });
    });
  });

  // --- SCAN (QR inteligente: entrada ou saída) ---
  api.post('/api/scan', (req, res) => {
    const { visitorName, company, email, phone } = req.body;
    if (!visitorName || !company || !phone) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanName = visitorName.trim().toLowerCase();
    const cleanCompany = company.trim().toLowerCase();

    const sqlCheck = `SELECT * FROM visits WHERE exitTime IS NULL AND (TRIM(phone) = ? OR (LOWER(TRIM(visitorName)) = ? AND LOWER(TRIM(company)) = ?)) ORDER BY date DESC, entryTime DESC LIMIT 1`;

    db.get(sqlCheck, [cleanPhone, cleanName, cleanCompany], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      const now = new Date();
      const timeString = now.toTimeString().slice(0, 5);
      const dateString = now.toISOString().split('T')[0];
      const reason = 'Registado via QR';

      if (row) {
        db.run(`UPDATE visits SET exitTime = ? WHERE id = ?`, [timeString, row.id], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          db.get(`SELECT * FROM visits WHERE id = ?`, [row.id], (err2, updatedVisit) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ type: 'EXIT', visit: updatedVisit, message: `Saída registada: ${visitorName}` });
          });
        });
      } else {
        // Check for recent duplicate
        db.get(`SELECT * FROM visits WHERE TRIM(phone) = ? ORDER BY date DESC, entryTime DESC LIMIT 1`, [cleanPhone], (err, lastVisit) => {
          if (err) return res.status(500).json({ error: err.message });
          if (lastVisit) {
            const lastEntry = new Date(`${lastVisit.date}T${lastVisit.entryTime}`);
            const diffMinutes = (now.getTime() - lastEntry.getTime()) / (1000 * 60);
            if (diffMinutes < 2) {
              return res.status(429).json({ type: 'ERROR', message: 'Entrada duplicada.', visit: lastVisit });
            }
          }

          const newId = uuidv4();
          db.run(`INSERT INTO visits (id, visitorName, company, email, phone, companion, entryTime, exitTime, date, reason) VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?)`,
            [newId, visitorName, company, cleanEmail, cleanPhone, timeString, dateString, reason], function (err) {
              if (err) return res.status(500).json({ error: err.message });
              syncVisitor(db, visitorName, company, cleanEmail, cleanPhone);
              res.json({
                type: 'ENTRY',
                visit: { id: newId, visitorName, company, email: cleanEmail, phone: cleanPhone, companion: '', entryTime: timeString, exitTime: null, date: dateString, reason },
                message: `Entrada registada: ${visitorName}`
              });
            });
        });
      }
    });
  });

  // --- GET ALL VISITORS ---
  api.get('/api/visitors', (req, res) => {
    db.all("SELECT * FROM visitors", [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  // --- VISITOR INFO POR PHONE ---
  api.get('/api/visitors/phone/:phone', (req, res) => {
    const phone = decodeURIComponent(req.params.phone);
    db.get(`SELECT * FROM visitors WHERE phone = ?`, [phone], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return res.json(row);
      db.get(`SELECT * FROM visits WHERE TRIM(phone) = ? ORDER BY date DESC, entryTime DESC LIMIT 1`, [phone.trim()], (err2, visitRow) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (!visitRow) return res.status(404).json({ error: 'Visitante não encontrado' });
        res.json({ phone: visitRow.phone, email: visitRow.email || '', fullName: visitRow.visitorName, company: visitRow.company, companion: visitRow.companion || '', visitReason: visitRow.reason || '' });
      });
    });
  });

  // --- VISITOR INFO POR EMAIL ---
  api.get('/api/visitors/:email', (req, res) => {
    const email = decodeURIComponent(req.params.email);
    db.get(`SELECT * FROM visitors WHERE email = ?`, [email], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Visitante não encontrado' });
      res.json(row);
    });
  });

  // --- REGISTER VISITOR ---
  api.post('/api/visitors/register', (req, res) => {
    const { phone, email, fullName, company, visitReason, companion } = req.body;
    db.run(`INSERT INTO visitors (phone, email, fullName, company, visitReason, companion) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(phone) DO UPDATE SET email = excluded.email, fullName = excluded.fullName, company = excluded.company, visitReason = excluded.visitReason, companion = excluded.companion`,
      [phone, email || '', fullName, company, visitReason, companion || ''], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Visitante salvo com sucesso' });
      });
  });

  // --- LOGIN ---
  api.post('/api/login', (req, res) => {
    const { email, password } = req.body || {};
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'melro2026';
    if (!password) return res.status(400).json({ error: 'Password required' });
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'ok', user: { email: email || 'admin' } });
  });

  // --- NEW VISIT (manual) ---
  api.post('/api/visitors', (req, res) => {
    const { fullName, company, visitReason, email, phone, companion, objects } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanCompanion = (companion || '').trim();
    const objectsJson = objects ? (typeof objects === 'string' ? objects : JSON.stringify(objects)) : null;
    const id = uuidv4();
    const date = new Date().toISOString().split('T')[0];
    const entryTime = new Date().toLocaleTimeString('pt-BR').slice(0, 5);
    db.run(`INSERT INTO visits (id, visitorName, company, email, phone, companion, objects, entryTime, date, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, fullName, company, cleanEmail, cleanPhone, cleanCompanion, objectsJson, entryTime, date, visitReason], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Visitante registrado com sucesso', id });
      });
  });

  // --- VISIT BY ID ---
  api.get('/api/visits/:id', (req, res) => {
    db.get(`SELECT * FROM visits WHERE id = ?`, [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Visita não encontrada' });
      res.status(200).json(row);
    });
  });

  // --- CHECKOUT MANUAL ---
  api.patch('/api/visits/:id/checkout', (req, res) => {
    const { exitTime } = req.body;
    db.run(`UPDATE visits SET exitTime = ? WHERE id = ?`, [exitTime, req.params.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json({ message: 'Saída registrada com sucesso', id: req.params.id, exitTime });
    });
  });

  // --- BATCH VISITS ---
  api.post('/api/visits/batch', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "IDs inválidos" });
    const placeholders = ids.map(() => '?').join(',');
    db.all(`SELECT * FROM visits WHERE id IN (${placeholders})`, ids, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // --- DELETE TEST VISITS ---
  api.delete('/api/visits/test', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.run(`DELETE FROM visits WHERE date < ?`, [today], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json({ message: 'Visitas de teste removidas', changes: this.changes });
    });
  });

  // --- RESET ---
  api.delete('/api/reset', (req, res) => {
    db.run(`DELETE FROM visits`, [], function (err1) {
      if (err1) return res.status(500).json({ error: err1.message });
      const visitsDeleted = this.changes;
      db.run(`DELETE FROM visitors`, [], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(200).json({ message: 'Reset total concluído', visitsDeleted, visitorsDeleted: this.changes });
      });
    });
  });

  // --- AUTO-CHECKOUT ---
  function autoCheckoutDaily() {
    const today = new Date().toISOString().split('T')[0];
    db.run(`UPDATE visits SET exitTime = '20:00' WHERE exitTime IS NULL AND date <= ?`, [today], function (err) {
      if (err) console.error('[Auto-Checkout] Erro:', err.message);
      else if (this.changes > 0) console.log(`[Auto-Checkout] ${this.changes} visita(s) fechada(s).`);
    });
  }

  function scheduleAutoCheckout() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(20, 0, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - now.getTime();
    setTimeout(() => {
      autoCheckoutDaily();
      setInterval(autoCheckoutDaily, 24 * 60 * 60 * 1000);
    }, ms);
  }

  // Close stale visits from previous days on startup
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  db.run(`UPDATE visits SET exitTime = '20:00' WHERE exitTime IS NULL AND date <= ?`, [yesterday.toISOString().split('T')[0]], function (err) {
    if (!err && this.changes > 0) console.log(`[Startup] ${this.changes} visita(s) antigas fechadas.`);
  });
  scheduleAutoCheckout();

  // ==============================
  // Backup diário às 20:00
  // ==============================
  function performBackup() {
    const dbPath = getDbPath();
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const date = new Date().toISOString().split('T')[0];
    const backupPath = path.join(backupDir, `melro_backup_${date}.db`);
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[Backup] Backup criado com sucesso: ${backupPath}`);
      // Manter apenas os últimos 30 backups
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('melro_backup_') && f.endsWith('.db'))
        .sort();
      while (files.length > 30) {
        const old = files.shift();
        fs.unlinkSync(path.join(backupDir, old));
        console.log(`[Backup] Backup antigo removido: ${old}`);
      }
    } catch (err) {
      console.error('[Backup] Erro ao criar backup:', err.message);
    }
  }

  function scheduleBackup() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(20, 0, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - now.getTime();
    console.log(`[Backup] Próximo backup agendado para ${target.toLocaleString()}`);
    setTimeout(() => {
      performBackup();
      setInterval(performBackup, 24 * 60 * 60 * 1000);
    }, ms);
  }

  // Backup ao iniciar (se ainda não existe backup de hoje)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBackup = path.join(path.dirname(getDbPath()), 'backups', `melro_backup_${todayStr}.db`);
  if (!fs.existsSync(todayBackup)) {
    performBackup();
  }
  scheduleBackup();

  // In production, serve the Vite build output through Express
  const isDev = process.env.ELECTRON_DEV === 'true';
  if (!isDev) {
    const distPath = path.join(__dirname, '..', 'dist');
    api.use(express.static(distPath));
    // SPA fallback: serve index.html for all non-API routes
    api.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  // Start server — try primary port, then fallback
  return new Promise((resolve, reject) => {
    server = api.listen(SERVER_PORT, '0.0.0.0', () => {
      activePort = SERVER_PORT;
      console.log(`Backoffice server running on http://0.0.0.0:${SERVER_PORT}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${SERVER_PORT} in use, trying ${SERVER_PORT + 1}...`);
        server = api.listen(SERVER_PORT + 1, '0.0.0.0', () => {
          activePort = SERVER_PORT + 1;
          console.log(`Backoffice server running on http://0.0.0.0:${activePort}`);
          resolve(server);
        });
        server.on('error', reject);
      } else {
        reject(err);
      }
    });
  });
}

// ==============================
// Electron Window
// ==============================
function createWindow() {
  mainWindow = new BrowserWindow({
      fullscreen: true,
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    title: 'O Melro - Registo de Visitantes',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Remove menu bar
  Menu.setApplicationMenu(null);

  // Determine URL: dev mode uses Vite dev server, production uses Express server
  const isDev = process.env.ELECTRON_DEV === 'true';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from the Express server that serves both API and static files
    mainWindow.loadURL(`http://127.0.0.1:${activePort}`);
  }

  // IPC: Return the active server URL
  ipcMain.on('get-server-url', (event) => {
    event.returnValue = `http://127.0.0.1:${activePort}`;
  });

  // IPC: Toggle fullscreen
  ipcMain.handle('toggle-fullscreen', () => {
    if (!mainWindow) return false;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  });

  // IPC: Silent print with correct scale
  ipcMain.handle('print-badge', () => {
    return new Promise((resolve) => {
      if (!mainWindow) return resolve(false);
      mainWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          margins: { marginType: 'none' },
          pageSize: { width: 90000, height: 60000 },
        },
        (success, failureReason) => {
          if (!success) console.error('[Print]', failureReason);
          resolve(success);
        }
      );
    });
  });

  // IPC: ZPL raw print (Zebra GK420d - 203 dpi, 9x6cm => 720x480 dots)
  ipcMain.handle('print-badge-zpl', async (_event, visitor) => {
    try {
      const v = visitor || {};
      const esc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\^/g, ' ').replace(/~/g, ' ');
      const name = esc(v.fullName || 'Visitante').toUpperCase();
      const company = esc(v.company || 'Empresa').toUpperCase();
      const reason = esc(v.visitReason || 'Visita');
      const phone = esc(v.phone || '');
      const email = (v.email || '').trim().toLowerCase();
      const today = new Date();
      const validUntil = today.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const qrPayload = JSON.stringify({ n: v.fullName, e: email, c: v.company, p: v.phone, t: today.toISOString() });
      const qrEsc = qrPayload.replace(/\\/g, '\\\\').replace(/\^/g, ' ').replace(/~/g, ' ');

      // QR de tamanho consistente: calcula o número de módulos e ajusta a ampliação
      // para manter ~264 dots, independentemente do comprimento dos dados (nome/empresa).
      let qrModules = 45;
      try {
        qrModules = require('qrcode').create(qrPayload, { errorCorrectionLevel: 'Q' }).modules.size;
      } catch (e) {
        console.warn('[ZPL] qrcode indisponível, a usar ampliação por defeito:', e && e.message);
      }
      const QR_TARGET = 264;                                       // largura alvo em dots
      const qrMag = Math.max(3, Math.min(8, Math.floor(QR_TARGET / qrModules)));
      const qrSize = qrModules * qrMag;                            // largura real em dots
      const qrX = Math.round(560 - qrSize / 2);                    // centrado no painel direito (400..720)
      const qrY = 55;
      const qrR = qrX + qrSize;
      const qrB = qrY + qrSize;
      // Cantos decorativos (comprimento 26, espessura 4, 12 dots fora do QR)
      const cs = 26, ct = 4, g = 12;
      const lx = qrX - g, rx = qrR + g, ty = qrY - g, by = qrB + g;
      const qrBlock = [
        `^FO${qrX},${qrY}^BQN,2,${qrMag},Q^FDQA,${qrEsc}^FS`,
        `^FO${lx},${ty}^GB${ct},${cs},${ct}^FS`, `^FO${lx},${ty}^GB${cs},${ct},${ct}^FS`,               // top-left
        `^FO${rx - ct},${ty}^GB${ct},${cs},${ct}^FS`, `^FO${rx - cs},${ty}^GB${cs},${ct},${ct}^FS`,      // top-right
        `^FO${lx},${by - cs}^GB${ct},${cs},${ct}^FS`, `^FO${lx},${by - ct}^GB${cs},${ct},${ct}^FS`,      // bottom-left
        `^FO${rx - ct},${by - cs}^GB${ct},${cs},${ct}^FS`, `^FO${rx - cs},${by - ct}^GB${cs},${ct},${ct}^FS`, // bottom-right
      ];

      // Layout 720x480 dots (9x6cm @203dpi) — replica do BadgeCard.tsx
      // QR mag 6 ≈ 270 dots (cabe sempre dentro da etiqueta)
      const zpl = [
        '^XA',
        '^CI28',          // UTF-8
        '^PW720',
        '^LL480',
        '^LH0,0',
        // ===== Lado esquerdo (0-380) =====
        // Cabeçalho: "o melro" + VISITOR PASS
        '^FO20,18^A0N,34,34^FDo melro^FS',
        '^FO22,58^A0N,20,20^FDVISITOR PASS^FS',
        // Linha divisora
        '^FO20,90^GB360,2,2^FS',
        // VISITANTE
        '^FO20,108^A0N,20,20^FDVISITANTE^FS',
        `^FO20,134^A0N,34,34^FB360,2,0,L,0^FD${name}^FS`,
        // Empresa em caixa destacada
        '^FO20,218^GB360,46,2^FS',
        `^FO30,228^A0N,28,28^FB340,1,0,L,0^FD${company}^FS`,
        // Linha divisora
        '^FO20,294^GB360,1,1^FS',
        // MOTIVO
        '^FO20,308^A0N,20,20^FDMOTIVO^FS',
        `^FO20,334^A0N,28,28^FB360,3,0,L,0^FD${reason}^FS`,
        // ===== Lado direito (400-720), largura útil 320 =====
        // QR code centrado, ampliação dinâmica (~264 dots) com cantos decorativos
        ...qrBlock,
        // Validade (abaixo do QR, centrada)
        '^FO405,360^GB300,90,1^FS',
        '^FO405,374^A0N,20,20^FB300,1,0,C,0^FDVALIDO ATE^FS',
        `^FO405,408^A0N,34,34^FB300,1,0,C,0^FD${validUntil}^FS`,
        '^XZ'
      ].join('\n');

      // Persist ZPL to temp and send raw to printer via PowerShell + Win32 winspool
      const tmpFile = path.join(os.tmpdir(), `melro_badge_${Date.now()}.zpl`);
      fs.writeFileSync(tmpFile, zpl, 'utf8');

      const printerName = process.env.MELRO_ZPL_PRINTER || 'ZDesigner GK420d';

      const ps = `
$ErrorActionPreference = 'Stop'
$printer = '${printerName.replace(/'/g, "''")}'
$file = '${tmpFile.replace(/'/g, "''").replace(/\\/g, '\\\\')}'
$source = @"
using System;
using System.IO;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFOW {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool OpenPrinter(string p, out IntPtr h, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr h, Int32 lvl, [In] DOCINFOW di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr h, IntPtr buf, Int32 cnt, out Int32 written);
  public static bool Send(string name, byte[] bytes) {
    IntPtr h = IntPtr.Zero;
    DOCINFOW di = new DOCINFOW(); di.pDocName = "Melro Badge"; di.pDataType = "RAW";
    bool ok = false;
    if (OpenPrinter(name, out h, IntPtr.Zero)) {
      if (StartDocPrinter(h, 1, di)) {
        if (StartPagePrinter(h)) {
          IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
          Marshal.Copy(bytes, 0, p, bytes.Length);
          int w = 0; ok = WritePrinter(h, p, bytes.Length, out w);
          Marshal.FreeCoTaskMem(p); EndPagePrinter(h);
        }
        EndDocPrinter(h);
      }
      ClosePrinter(h);
    }
    return ok;
  }
}
"@
Add-Type -TypeDefinition $source -Language CSharp | Out-Null
$bytes = [System.IO.File]::ReadAllBytes($file)
$ok = [RawPrinterHelper]::Send($printer, $bytes)
if (-not $ok) { Write-Error "Falha ao enviar para impressora $printer"; exit 1 }
Write-Output "OK"
`;

      const result = await new Promise((resolve) => {
        const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { windowsHide: true });
        let stdout = ''; let stderr = '';
        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        child.on('close', (code) => {
          try { fs.unlinkSync(tmpFile); } catch (_) {}
          if (code === 0) {
            console.log('[ZPL] Enviado com sucesso para', printerName);
            resolve({ ok: true });
          } else {
            console.error('[ZPL] Erro:', stderr || stdout);
            resolve({ ok: false, error: stderr || stdout || `exit ${code}` });
          }
        });
        child.on('error', (err) => {
          try { fs.unlinkSync(tmpFile); } catch (_) {}
          console.error('[ZPL] spawn error:', err);
          resolve({ ok: false, error: String(err) });
        });
      });

      return result;
    } catch (err) {
      console.error('[ZPL] Exception:', err);
      return { ok: false, error: String(err) };
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ==============================
// App Lifecycle
// ==============================
app.whenReady().then(async () => {
  try {
    await startBackofficeServer();
    console.log('Backoffice server started successfully');
  } catch (err) {
    console.error('Failed to start backoffice server:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});
