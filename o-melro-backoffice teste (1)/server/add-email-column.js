import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho do banco
const dbPath = path.resolve(__dirname, 'melro.db');
const db = new sqlite3.Database(dbPath);

db.run(`ALTER TABLE visits ADD COLUMN email TEXT`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log("✅ A coluna 'email' já existe.");
    } else {
      console.error("❌ Erro ao adicionar coluna:", err.message);
    }
  } else {
    console.log("✅ Coluna 'email' adicionada com sucesso!");
  }

  db.close();
});
