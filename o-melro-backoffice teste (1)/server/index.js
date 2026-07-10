import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db, { syncVisitor } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- ROTAS ---

// 1. GET ALL VISITS (com filtro opcional por email)
app.get('/api/visits', (req, res) => {
  const email = req.query.email;
  
  if (email) {
    const decodedEmail = decodeURIComponent(email).toLowerCase();
    const sql = "SELECT * FROM visits WHERE LOWER(email) = ? ORDER BY date DESC, entryTime DESC";
    console.log(`🔍 Buscando visitas do email: ${decodedEmail}`);
    
    db.all(sql, [decodedEmail], (err, rows) => {
      if (err) {
        console.error("❌ Erro ao buscar visitas:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ ${rows.length} visitas encontradas para ${decodedEmail}`);
      res.json({ message: "success", data: rows || [] });
    });
  } else {
    const sql = "SELECT * FROM visits ORDER BY date DESC, entryTime DESC";
    console.log(`📋 Buscando todas as visitas`);
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Erro ao buscar visitas:", err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ ${rows.length} visitas encontradas`);
      res.json({ message: "success", data: rows || [] });
    });
  }
});

// 2. STATS
app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Calcular início da semana (Domingo)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Domingo
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek.toISOString().split('T')[0];

  const sqlActive = "SELECT count(*) as count FROM visits WHERE exitTime IS NULL";
  const sqlToday = "SELECT count(*) as count FROM visits WHERE date = ?";
  const sqlWeek = "SELECT count(*) as count FROM visits WHERE date >= ?";

  db.get(sqlActive, [], (err, rowActive) => {
    if (err) return res.status(500).json({ error: err.message });

    db.get(sqlToday, [today], (err, rowToday) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get(sqlWeek, [weekStart], (err, rowWeek) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          activeVisits: rowActive.count,
          totalToday: rowToday.count,
          totalWeek: rowWeek.count
        });
      });
    });
  });
});

// 3. SCAN (QR inteligente: entrada ou saída)
app.post('/api/scan', (req, res) => {
  const { visitorName, company, email, phone } = req.body;

  if (!visitorName || !company || !phone) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = phone.trim();
  const cleanName = visitorName.trim().toLowerCase();
  const cleanCompany = company.trim().toLowerCase();

  console.log(`🔍 SCAN - Procurando visita ativa:`);
  console.log(`   Phone: ${cleanPhone}`);
  console.log(`   Nome: ${cleanName}`);
  console.log(`   Empresa: ${cleanCompany}`);

  // Busca por phone (mais preciso), depois por nome+empresa como fallback
  const sqlCheck = `
    SELECT * FROM visits 
    WHERE exitTime IS NULL AND (
      TRIM(phone) = ? 
      OR (LOWER(TRIM(visitorName)) = ? AND LOWER(TRIM(company)) = ?)
    )
    ORDER BY date DESC, entryTime DESC LIMIT 1
  `;

  db.get(sqlCheck, [cleanPhone, cleanName, cleanCompany], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5); // HH:MM
    const dateString = now.toISOString().split('T')[0];
    const reason = 'Registado via QR';

    if (row) {
      // Visitante ainda está ativo → Registrar saída
      console.log("🟢 Visitante encontrado para saída:", row);

      const sqlUpdate = `UPDATE visits SET exitTime = ? WHERE id = ?`;
      db.run(sqlUpdate, [timeString, row.id], function (err) {
        if (err) {
          console.error("❌ Erro ao atualizar saída:", err.message);
          return res.status(500).json({ error: err.message });
        }

        console.log("✅ Saída registrada com sucesso:", timeString);

        db.get(`SELECT * FROM visits WHERE id = ?`, [row.id], (err2, updatedVisit) => {
  if (err2) {
    console.error("❌ Erro ao recuperar visita atualizada:", err2.message);
    return res.status(500).json({ error: err2.message });
  }

  res.json({
    type: 'EXIT',
    visit: updatedVisit,
    message: `Saída registada: ${visitorName}`
  });
});

      });

    } else {
      // Nenhuma visita ativa encontrada - isso vai criar uma NOVA entrada
      console.log("⚠️ SCAN - Nenhuma visita ativa encontrada para EXIT. Tentando criar entrada...");
      
      // Vamos verificar se existe alguma visita (ativa ou não) com este phone para debug
      db.get(`SELECT * FROM visits WHERE TRIM(phone) = ? ORDER BY date DESC, entryTime DESC LIMIT 1`, [cleanPhone], (debugErr, debugRow) => {
        if (debugRow) {
          console.log(`📋 DEBUG - Última visita deste phone:`, debugRow);
          console.log(`   exitTime: ${debugRow.exitTime || 'NULL'} (${debugRow.exitTime ? 'JÁ SAIU' : 'DEVERIA ESTAR ATIVO'})`);
        } else {
          console.log(`📋 DEBUG - Nenhuma visita encontrada para este phone no banco`);
        }
      });

      // Checar duplicação por entrada recente (2 minutos)
      const sqlLast = `
        SELECT * FROM visits 
        WHERE TRIM(phone) = ? 
        ORDER BY date DESC, entryTime DESC LIMIT 1
      `;

      db.get(sqlLast, [cleanPhone], (err, lastVisit) => {
        if (err) return res.status(500).json({ error: err.message });

        if (lastVisit) {
          const lastEntry = new Date(`${lastVisit.date}T${lastVisit.entryTime}`);
          const diffMinutes = (now.getTime() - lastEntry.getTime()) / (1000 * 60);

          if (diffMinutes < 2) {
            console.warn("⚠️ Entrada muito recente. Bloqueando duplicação.");
            return res.status(429).json({ 
              type: 'ERROR',
              message: 'Entrada duplicada. Tente novamente em instantes.',
              visit: lastVisit
            });
          }
        }

        // Nova entrada
        const newId = uuidv4();
        const sqlInsert = `
          INSERT INTO visits (id, visitorName, company, email, phone, companion, entryTime, exitTime, date, reason) 
          VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?)
        `;
        const params = [newId, visitorName, company, cleanEmail, cleanPhone, timeString, dateString, reason];

        db.run(sqlInsert, params, function (err) {
          if (err) return res.status(500).json({ error: err.message });

          // Sincroniza visitante na tabela visitors
          syncVisitor(visitorName, company, cleanEmail, cleanPhone);

          console.log("🆕 Nova entrada registrada:", visitorName);

          res.json({
            type: 'ENTRY',
            visit: {
              id: newId,
              visitorName,
              company,
              email: cleanEmail,
              phone: cleanPhone,
              companion: '',
              entryTime: timeString,
              exitTime: null,
              date: dateString,
              reason
            },
            message: `Entrada registada: ${visitorName}`
          });
        });
      });
    }
  });
});


// 4. GET ALL VISITORS
app.get('/api/visitors', (req, res) => {
  const sql = "SELECT * FROM visitors";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Erro ao buscar visitantes:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ ${rows.length} visitantes encontrados`);
    res.json(rows || []);
  });
});

// 5b. VISITOR INFO POR TELEMÓVEL (deve vir antes da rota :email)
app.get('/api/visitors/phone/:phone', (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  console.log(`🔍 Buscando visitante com telemóvel: ${phone}`);

  // 1) Tentar na tabela visitors
  const sqlVisitors = `SELECT * FROM visitors WHERE phone = ?`;
  db.get(sqlVisitors, [phone], (err, row) => {
    if (err) {
      console.error("❌ Erro ao buscar visitante (visitors):", err.message);
    }

    if (row) {
      console.log(`✅ Visitante encontrado na tabela visitors: ${row.fullName}`);
      return res.json(row);
    }

    // 2) Fallback: buscar na tabela visits (última visita deste phone)
    const sqlVisits = `SELECT * FROM visits WHERE TRIM(phone) = ? ORDER BY date DESC, entryTime DESC LIMIT 1`;
    db.get(sqlVisits, [phone.trim()], (err2, visitRow) => {
      if (err2) {
        console.error("❌ Erro ao buscar visitante (visits):", err2.message);
        return res.status(500).json({ error: err2.message });
      }

      if (!visitRow) {
        console.warn(`⚠️ Visitante não encontrado em nenhuma tabela: ${phone}`);
        return res.status(404).json({ error: 'Visitante não encontrado' });
      }

      // Converter formato de visits para formato de visitors
      console.log(`✅ Visitante encontrado na tabela visits (fallback): ${visitRow.visitorName}`);
      res.json({
        phone: visitRow.phone,
        email: visitRow.email || '',
        fullName: visitRow.visitorName,
        company: visitRow.company,
        companion: visitRow.companion || '',
        visitReason: visitRow.reason || ''
      });
    });
  });
});

// 5. VISITOR INFO POR EMAIL
app.get('/api/visitors/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const sql = `SELECT * FROM visitors WHERE email = ?`;
  console.log(`🔍 Buscando visitante com email: ${email}`);
  
  db.get(sql, [email], (err, row) => {
    if (err) {
      console.error("❌ Erro ao buscar visitante:", err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      console.warn(`⚠️ Visitante não encontrado: ${email}`);
      return res.status(404).json({ error: 'Visitante não encontrado' });
    }
    console.log(`✅ Visitante encontrado: ${row.fullName}`);
    res.json(row);
  });
});

// 7. REGISTRA/ATUALIZA VISITANTE POR TELEMÓVEL
app.post('/api/visitors/register', (req, res) => {
  const { phone, email, fullName, company, visitReason, companion } = req.body;

  const sql = `
    INSERT INTO visitors (phone, email, fullName, company, visitReason, companion)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      email = excluded.email,
      fullName = excluded.fullName,
      company = excluded.company,
      visitReason = excluded.visitReason,
      companion = excluded.companion
  `;

  db.run(sql, [phone, email || '', fullName, company, visitReason, companion || ''], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: 'Visitante salvo com sucesso' });
  });
});

// 7b. LOGIN ADMIN (simples, pode usar variable de ambiente ADMIN_PASSWORD)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'melro2026';

  if (!password) return res.status(400).json({ error: 'Password required' });

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Opcional: adicionar payload com info mínima
  res.json({ message: 'ok', user: { email: email || 'admin' } });
});

// 8. NOVO REGISTRO VISITA MANUAL
app.post('/api/visitors', (req, res) => {
  const { fullName, company, visitReason, email, phone, companion, objects } = req.body;

  // Normalizar email para minúsculas
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').trim();
  const cleanCompanion = (companion || '').trim();
  const objectsJson = objects ? (typeof objects === 'string' ? objects : JSON.stringify(objects)) : null;

  const id = uuidv4();
  const date = new Date().toISOString().split('T')[0];
  const entryTime = new Date().toLocaleTimeString('pt-BR').slice(0, 5);

  console.log(`🆕 Nova visita via /api/visitors:`);
  console.log(`   Nome: ${fullName}`);
  console.log(`   Empresa: ${company}`);
  console.log(`   Phone: ${cleanPhone}`);
  console.log(`   Email: ${cleanEmail}`);
  console.log(`   Pessoa a visitar: ${cleanCompanion}`);

  const sql = `
    INSERT INTO visits (id, visitorName, company, email, phone, companion, objects, entryTime, date, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [id, fullName, company, cleanEmail, cleanPhone, cleanCompanion, objectsJson, entryTime, date, visitReason];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    console.log(`✅ Visita criada com ID: ${id}`);
    res.status(200).json({ message: 'Visitante registrado com sucesso', id });
  });
});

// 9. VISITA POR ID
app.get('/api/visits/:id', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM visits WHERE id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Visita não encontrada' });
    res.status(200).json(row);
  });
});
// ROTA: Marcar saída manualmente (por ID)
// PATCH /api/visits/:id/checkout
app.patch('/api/visits/:id/checkout', (req, res) => {
  const id = req.params.id;
  const { exitTime } = req.body;

  const sql = `UPDATE visits SET exitTime = ? WHERE id = ?`;

  db.run(sql, [exitTime, id], function (err) {
    if (err) {
      console.error('Erro ao registrar saída:', err.message);
      return res.status(500).json({ error: err.message });
    }

    res.status(200).json({ message: 'Saída registrada com sucesso', id, exitTime });
  });
});



// 10. LOTE DE VISITAS POR ID
app.post('/api/visits/batch', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "IDs inválidos" });
  }

  const placeholders = ids.map(() => '?').join(',');
  const sql = `SELECT * FROM visits WHERE id IN (${placeholders})`;

  db.all(sql, ids, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ROTA: Remover visitas de teste (anteriores a hoje)
// NOTA: Esta rota é apenas manual para limpeza. Não é chamada automaticamente.
app.delete('/api/visits/test', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const sql = `DELETE FROM visits WHERE date < ?`;
  db.run(sql, [today], function (err) {
    if (err) {
      console.error('Erro ao remover visitas de teste:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: 'Visitas de teste removidas com sucesso', changes: this.changes });
  });
});

// ROTA: Reset total - apaga TODAS as visitas e visitantes
app.delete('/api/reset', (req, res) => {
  db.run(`DELETE FROM visits`, [], function (err1) {
    if (err1) {
      console.error('Erro ao apagar visitas:', err1.message);
      return res.status(500).json({ error: err1.message });
    }
    const visitsDeleted = this.changes;
    db.run(`DELETE FROM visitors`, [], function (err2) {
      if (err2) {
        console.error('Erro ao apagar visitantes:', err2.message);
        return res.status(500).json({ error: err2.message });
      }
      const visitorsDeleted = this.changes;
      console.log(`🗑️ Reset total: ${visitsDeleted} visitas e ${visitorsDeleted} visitantes removidos`);
      res.status(200).json({
        message: 'Reset total concluído',
        visitsDeleted,
        visitorsDeleted
      });
    });
  });
});

// --- AUTO-CHECKOUT DIÁRIO ---
// Fecha automaticamente todas as visitas que ainda estão "a decorrer" (exitTime IS NULL)
// Executa todos os dias às 20:00 (em vez de meia‑noite)

function autoCheckoutDaily() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  console.log(`🕗 [Auto-Checkout] A verificar visitas ativas para fechar automaticamente...`);

  const sql = `UPDATE visits SET exitTime = '20:00' WHERE exitTime IS NULL AND date <= ?`;

  db.run(sql, [today], function (err) {
    if (err) {
      console.error('❌ [Auto-Checkout] Erro ao fechar visitas:', err.message);
    } else if (this.changes > 0) {
      console.log(`✅ [Auto-Checkout] ${this.changes} visita(s) fechada(s) automaticamente às 20:00.`);
    } else {
      console.log(`ℹ️ [Auto-Checkout] Nenhuma visita ativa para fechar.`);
    }
  });
}

// Agenda a execução para as 23:59 de cada dia
function scheduleAutoCheckout() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(20, 0, 0, 0);

  // Se já passou das 20:00, agendar para amanhã
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const msUntilTarget = target.getTime() - now.getTime();
  const hoursUntil = (msUntilTarget / (1000 * 60 * 60)).toFixed(1);
  console.log(`⏰ [Auto-Checkout] Próxima execução em ${hoursUntil}h (às 20:00)`);

  setTimeout(() => {
    autoCheckoutDaily();
    // Depois da primeira execução, repetir a cada 24h
    setInterval(autoCheckoutDaily, 24 * 60 * 60 * 1000);
  }, msUntilTarget);
}

// Ao iniciar o servidor, fechar visitas de dias anteriores que ficaram em aberto
(function closeStaleVisitsOnStartup() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const sql = `UPDATE visits SET exitTime = '20:00' WHERE exitTime IS NULL AND date <= ?`;
  db.run(sql, [yesterdayStr], function (err) {
    if (err) {
      console.error('❌ [Startup] Erro ao fechar visitas antigas:', err.message);
    } else if (this.changes > 0) {
      console.log(`🧹 [Startup] ${this.changes} visita(s) de dias anteriores fechada(s) automaticamente.`);
    }
  });
})();

// Iniciar o agendamento
scheduleAutoCheckout();

// --- BACKUP DIÁRIO (20:30) ---
// Cria uma cópia consistente da base de dados. VACUUM INTO inclui os dados do WAL
// e não exige parar o servidor.
function performBackup() {
  try {
    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    const dateStr = new Date().toISOString().split('T')[0];
    const backupPath = path.join(backupsDir, `melro_backup_${dateStr}.db`);
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    db.run('VACUUM INTO ?', [backupPath], (err) => {
      if (err) console.error('❌ [Backup] Erro ao criar backup:', err.message);
      else console.log(`💾 [Backup] Backup diário criado: ${backupPath}`);
    });
  } catch (e) {
    console.error('❌ [Backup] Exceção:', e.message);
  }
}

function scheduleBackup() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(20, 30, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  const ms = target.getTime() - now.getTime();
  console.log(`⏰ [Backup] Próximo backup às 20:30 (em ${(ms / 3600000).toFixed(1)}h)`);
  setTimeout(() => {
    performBackup();
    setInterval(performBackup, 24 * 60 * 60 * 1000);
  }, ms);
}

scheduleBackup();

// Backup ao arrancar, se ainda não existir o de hoje
(function backupOnStartup() {
  const dateStr = new Date().toISOString().split('T')[0];
  const backupPath = path.join(__dirname, 'backups', `melro_backup_${dateStr}.db`);
  if (!fs.existsSync(backupPath)) performBackup();
})();

// Iniciar Servidor HTTP
// Nota: O HTTPS é gerido pelo Vite dev server (mkcert).
// O backend roda em HTTP simples e o proxy do Vite encaminha os pedidos.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP rodando em http://10.0.0.83:${PORT}`);
});
