const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'chat.db');
const db = new DatabaseSync(dbPath);

// Habilitar foreign keys y modo WAL
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Inicializar esquema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      username TEXT NOT NULL,
      content TEXT,
      file_url TEXT,
      file_name TEXT,
      file_type TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room_created 
    ON messages(room_id, created_at);
  `);

  // Migraciones seguras para agregar columnas si no existen
  const alterColumns = [
    'ALTER TABLE messages ADD COLUMN file_url TEXT',
    'ALTER TABLE messages ADD COLUMN file_name TEXT',
    'ALTER TABLE messages ADD COLUMN file_type TEXT'
  ];

  for (const sql of alterColumns) {
    try {
      db.exec(sql);
    } catch (err) {
      // Ignorar error si la columna ya existe
    }
  }

  // Sembrar salas iniciales si la tabla está vacía
  const countRow = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
  if (countRow.count === 0) {
    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, name, description)
      VALUES (?, ?, ?)
    `);

    const defaultRooms = [
      ['general', 'General', 'Canal para charla general y presentaciones'],
      ['random', 'Random', 'Memes, diversión y temas varios'],
      ['tech', 'Tech', 'Debates sobre programación, stacks y tecnología']
    ];

    db.exec('BEGIN');
    try {
      for (const room of defaultRooms) {
        insertRoom.run(room[0], room[1], room[2]);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

// Queries y métodos de acceso a datos
function getRooms() {
  return db.prepare('SELECT id, name, description, created_at as createdAt FROM rooms ORDER BY name ASC').all();
}

function getRoomById(id) {
  return db.prepare('SELECT id, name, description, created_at as createdAt FROM rooms WHERE id = ?').get(id);
}

function getMessagesByRoom(roomId, limit = 100) {
  return db.prepare(`
    SELECT id, room_id as roomId, username, content, file_url as fileUrl, file_name as fileName, file_type as fileType, created_at as createdAt
    FROM messages
    WHERE room_id = ?
    ORDER BY id ASC
    LIMIT ?
  `).all(roomId, limit);
}

function saveMessage({ roomId, username, content, fileUrl = null, fileName = null, fileType = null }) {
  const stmt = db.prepare(`
    INSERT INTO messages (room_id, username, content, file_url, file_name, file_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(roomId, username, content || '', fileUrl, fileName, fileType);
  
  return db.prepare(`
    SELECT id, room_id as roomId, username, content, file_url as fileUrl, file_name as fileName, file_type as fileType, created_at as createdAt
    FROM messages
    WHERE id = ?
  `).get(Number(info.lastInsertRowid));
}

module.exports = {
  db,
  initDb,
  getRooms,
  getRoomById,
  getMessagesByRoom,
  saveMessage
};
