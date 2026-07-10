import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Simula __dirname com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho do banco de dados
const dbPath = path.resolve(__dirname, 'melro.db');
console.log('[SQLite] Usando banco de dados em:', dbPath);
console.log('[🔎 USANDO ESTE BANCO]:', dbPath);

// Conexão com SQLite
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

// Criação das tabelas, se não existirem
db.serialize(() => {
  // Tabela visits
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
  )`, (err) => {
    if (err) {
      console.error("Erro ao criar tabela visits:", err);
    } else {
      console.log("Tabela 'visits' pronta.");
    }
  });

  // Adicionar colunas phone e companion se não existirem (migração)
  db.run(`ALTER TABLE visits ADD COLUMN phone TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error("Erro ao adicionar coluna phone:", err);
    }
  });
  db.run(`ALTER TABLE visits ADD COLUMN companion TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error("Erro ao adicionar coluna companion:", err);
    }
  });
  db.run(`ALTER TABLE visits ADD COLUMN objects TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) { /* ignore */ }
  });

  // Índice no phone para buscas rápidas
  db.run(`CREATE INDEX IF NOT EXISTS idx_visits_phone ON visits(phone)`, (err) => {
    if (err) {
      console.error("Erro ao criar índice phone:", err);
    } else {
      console.log("Índice 'idx_visits_phone' pronto.");
    }
  });

  // Índice no email para buscas rápidas
  db.run(`CREATE INDEX IF NOT EXISTS idx_visits_email ON visits(email)`, (err) => {
    if (err) {
      console.error("Erro ao criar índice:", err);
    } else {
      console.log("Índice 'idx_visits_email' pronto.");
    }
  });

  // Índice na data para relatórios
  db.run(`CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(date)`, (err) => {
    if (err) {
      console.error("Erro ao criar índice de data:", err);
    }
  });

  // Tabela visitors (perfil dos visitantes, agora com phone como PK)
  // Primeiro, verificar se a tabela antiga existe com email como PK (migração)
  db.get(`PRAGMA table_info(visitors)`, [], (err) => {
    db.all(`PRAGMA table_info(visitors)`, [], (err2, columns) => {
      if (err2 || !columns || columns.length === 0) {
        // Tabela não existe, criar do zero
        db.run(`CREATE TABLE IF NOT EXISTS visitors (
          phone TEXT PRIMARY KEY,
          email TEXT,
          fullName TEXT,
          company TEXT,
          companion TEXT,
          visitReason TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (createErr) => {
          if (createErr) console.error("Erro ao criar tabela visitors:", createErr);
          else console.log("Tabela 'visitors' criada com phone como PK.");
        });
        return;
      }

      // Verificar se phone é a PK
      const phonePK = columns.find(c => c.name === 'phone' && c.pk === 1);
      const hasPhoneCol = columns.find(c => c.name === 'phone');

      if (phonePK) {
        console.log("Tabela 'visitors' já tem phone como PK. OK.");
      } else {
        // Tabela antiga (email como PK ou sem phone) - migrar
        console.log("⚠️ Migrando tabela visitors para phone como PK...");
        db.serialize(() => {
          db.run(`ALTER TABLE visitors RENAME TO visitors_old`, (renameErr) => {
            if (renameErr) {
              console.error("Erro ao renomear visitors:", renameErr.message);
              // Se falhar, tentar apenas adicionar coluna phone
              if (!hasPhoneCol) {
                db.run(`ALTER TABLE visitors ADD COLUMN phone TEXT`, (addErr) => {
                  if (addErr && !addErr.message.includes('duplicate column')) {
                    console.error("Erro ao adicionar phone:", addErr);
                  }
                });
              }
              return;
            }

            db.run(`CREATE TABLE visitors (
              phone TEXT PRIMARY KEY,
              email TEXT,
              fullName TEXT,
              company TEXT,
              companion TEXT,
              visitReason TEXT,
              createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (createErr) => {
              if (createErr) {
                console.error("Erro ao criar nova tabela visitors:", createErr);
                db.run(`ALTER TABLE visitors_old RENAME TO visitors`);
                return;
              }

              // Copiar dados da tabela antiga (usar phone se existir, senão usar email como phone temporário)
              const copySQL = hasPhoneCol
                ? `INSERT OR IGNORE INTO visitors (phone, email, fullName, company, companion, visitReason, createdAt)
                   SELECT COALESCE(phone, email), email, fullName, company, companion, visitReason, createdAt 
                   FROM visitors_old WHERE COALESCE(phone, email) IS NOT NULL AND COALESCE(phone, email) != ''`
                : `INSERT OR IGNORE INTO visitors (phone, email, fullName, company, visitReason, createdAt)
                   SELECT email, email, fullName, company, visitReason, createdAt 
                   FROM visitors_old WHERE email IS NOT NULL AND email != ''`;

              db.run(copySQL, (copyErr) => {
                if (copyErr) console.error("Erro ao copiar dados:", copyErr);
                else console.log("✅ Dados migrados com sucesso.");
                
                db.run(`DROP TABLE IF EXISTS visitors_old`, (dropErr) => {
                  if (dropErr) console.error("Erro ao remover tabela antiga:", dropErr);
                  else console.log("✅ Migração de visitors concluída.");
                });
              });
            });
          });
        });
      }
    });
  });

  // Adicionar colunas novas se não existirem (migração de tabela antiga)
  db.run(`ALTER TABLE visitors ADD COLUMN companion TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error("Erro ao adicionar coluna companion a visitors:", err);
    }
  });

  // Índice no phone dos visitantes
  db.run(`CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors(phone)`, (err) => {
    if (err) {
      console.error("Erro ao criar índice de visitantes:", err);
    }
  });
});

/**
 * Sincroniza dados de visitante na tabela visitors
 * Chamado ao registrar uma entrada nova
 */
export const syncVisitor = (visitorName, company, email, phone) => {
  const sql = `
    INSERT OR IGNORE INTO visitors (phone, email, fullName, company, createdAt) 
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  db.run(sql, [phone, email, visitorName, company], (err) => {
    if (err) {
      console.error("Erro ao sincronizar visitante:", err);
    }
  });
};

// Exporta conexão com o banco
export default db;
