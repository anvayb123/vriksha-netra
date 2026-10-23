const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const initDb = async () => {
  db.serialize(async () => {
    // Create Tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'volunteer',
      createdAt TEXT,
      updatedAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS species (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      commonNames TEXT,
      referenceImageUrl TEXT,
      addedBy TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS drives (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      locationName TEXT,
      speciesAllowed TEXT,
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tree_logs (
      _id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      speciesId TEXT,
      count INTEGER DEFAULT 1,
      photoUrl TEXT,
      aiRawGuess TEXT,
      aiConfidence REAL,
      isFlagged INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    )`);

    console.log('SQLite database tables initialized successfully.');
    await seedDefaultData();
  });
};

const seedDefaultData = async () => {
  try {
    const adminCheck = await getQuery(`SELECT * FROM users WHERE role = 'admin'`);
    if (!adminCheck) {
      const now = new Date().toISOString();
      const adminPass = await bcrypt.hash('admin123', 10);
      await runQuery(
        `INSERT INTO users (_id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['u-admin-1', 'Akshar Admin', 'admin@akshar.org', adminPass, 'admin', now, now]
      );

      const volPass = await bcrypt.hash('volunteer123', 10);
      await runQuery(
        `INSERT INTO users (_id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['u-vol-1', 'Gagan Kumar', 'volunteer@akshar.org', volPass, 'volunteer', now, now]
      );
      console.log('Default Admin & Volunteer accounts seeded into SQLite.');
    }

    const speciesCount = await getQuery(`SELECT COUNT(*) as count FROM species`);
    if (speciesCount && speciesCount.count === 0) {
      const now = new Date().toISOString();
      const defaultSpecies = [
        'Neem',
        'Peepal',
        'Banyan',
        'Gulmohar',
        'Mango',
        'Mahogany',
        'Jamun',
        'Ashoka'
      ];
      for (const spName of defaultSpecies) {
        await runQuery(
          `INSERT INTO species (_id, name, commonNames, referenceImageUrl, addedBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), spName, JSON.stringify([]), '', 'u-admin-1', 1, now, now]
        );
      }
      console.log('Default tree species seeded into SQLite.');
    }

    const drivesCount = await getQuery(`SELECT COUNT(*) as count FROM drives`);
    if (drivesCount && drivesCount.count === 0) {
      const now = new Date().toISOString();
      await runQuery(
        `INSERT INTO drives (_id, name, date, locationName, speciesAllowed, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [generateId(), 'Ganesh Nagar Plantation Drive', '2026-08-15', 'Ganesh Nagar Park', JSON.stringify([]), 'u-admin-1', now, now]
      );
      console.log('Default plantation drive seeded into SQLite.');
    }
  } catch (err) {
    console.error('Error seeding SQLite default data:', err.message);
  }
};

// ═══ SYNC API WRAPPERS FOR CONTROLLER COMPATIBILITY ═══
// SQLite operates asynchronously. We provide Promise-returning or async helpers, and a sync interface wrapper for localDb.

const parseRow = (table, row) => {
  if (!row) return null;
  const copy = { ...row };
  if (table === 'species') {
    copy.isActive = Boolean(copy.isActive);
    if (typeof copy.commonNames === 'string') {
      try { copy.commonNames = JSON.parse(copy.commonNames); } catch { copy.commonNames = []; }
    }
  }
  if (table === 'drives') {
    if (typeof copy.speciesAllowed === 'string') {
      try { copy.speciesAllowed = JSON.parse(copy.speciesAllowed); } catch { copy.speciesAllowed = []; }
    }
  }
  if (table === 'tree_logs') {
    copy.isFlagged = Boolean(copy.isFlagged);
    copy.user = copy.userId;
    copy.species = copy.speciesId;
  }
  return copy;
};

// SQLite async methods
const sqliteApi = {
  db,
  initDb,
  generateId,

  async findOne(table, filter = {}) {
    const tableSql = table === 'treeLogs' ? 'tree_logs' : table;
    const keys = Object.keys(filter);
    if (keys.length === 0) {
      const row = await getQuery(`SELECT * FROM ${tableSql} LIMIT 1`);
      return parseRow(tableSql, row);
    }
    const whereClause = keys.map((k) => `${k} = ?`).join(' AND ');
    const values = keys.map((k) => filter[k]);
    const row = await getQuery(`SELECT * FROM ${tableSql} WHERE ${whereClause} LIMIT 1`, values);
    return parseRow(tableSql, row);
  },

  async findById(table, id) {
    const tableSql = table === 'treeLogs' ? 'tree_logs' : table;
    const row = await getQuery(`SELECT * FROM ${tableSql} WHERE _id = ?`, [id]);
    return parseRow(tableSql, row);
  },

  async find(table, filter = {}) {
    const tableSql = table === 'treeLogs' ? 'tree_logs' : table;
    let sql = `SELECT * FROM ${tableSql}`;
    const params = [];
    const conditions = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value && typeof value === 'object') {
        if ('$ne' in value) {
          conditions.push(`${key} != ?`);
          params.push(value.$ne);
        }
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ');
    const rows = await allQuery(sql, params);
    return rows.map((r) => parseRow(tableSql, r));
  },

  async create(table, values = {}) {
    const tableSql = table === 'treeLogs' ? 'tree_logs' : table;
    const now = new Date().toISOString();
    const id = values._id || generateId();
    const item = { ...values, _id: id, createdAt: values.createdAt || now, updatedAt: values.updatedAt || now };

    if (tableSql === 'users') {
      await runQuery(
        `INSERT INTO users (_id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item._id, item.name, item.email, item.password, item.role || 'volunteer', item.createdAt, item.updatedAt]
      );
    } else if (tableSql === 'species') {
      await runQuery(
        `INSERT INTO species (_id, name, commonNames, referenceImageUrl, addedBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item._id, item.name, JSON.stringify(item.commonNames || []), item.referenceImageUrl || '', item.addedBy || '', item.isActive !== false ? 1 : 0, item.createdAt, item.updatedAt]
      );
    } else if (tableSql === 'drives') {
      await runQuery(
        `INSERT INTO drives (_id, name, date, locationName, speciesAllowed, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item._id, item.name, item.date, item.locationName || '', JSON.stringify(item.speciesAllowed || []), item.createdBy || '', item.createdAt, item.updatedAt]
      );
    } else if (tableSql === 'tree_logs') {
      await runQuery(
        `INSERT INTO tree_logs (_id, userId, speciesId, count, photoUrl, aiRawGuess, aiConfidence, isFlagged, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item._id, item.userId || item.user, item.speciesId || item.species || '', item.count || 1, item.photoUrl || '', item.aiRawGuess || '', item.aiConfidence || 0, item.isFlagged ? 1 : 0, item.createdAt, item.updatedAt]
      );
    }
    return item;
  },

  async save(table, values = {}) {
    const tableSql = table === 'treeLogs' ? 'tree_logs' : table;
    const now = new Date().toISOString();
    if (tableSql === 'species') {
      await runQuery(
        `UPDATE species SET name=?, commonNames=?, referenceImageUrl=?, isActive=?, updatedAt=? WHERE _id=?`,
        [values.name, JSON.stringify(values.commonNames || []), values.referenceImageUrl || '', values.isActive ? 1 : 0, now, values._id]
      );
    } else if (tableSql === 'tree_logs') {
      await runQuery(
        `UPDATE tree_logs SET speciesId=?, isFlagged=?, updatedAt=? WHERE _id=?`,
        [values.speciesId || values.species, values.isFlagged ? 1 : 0, now, values._id]
      );
    }
    return values;
  },

  async countDocuments(table, filter = {}) {
    const rows = await this.find(table, filter);
    return rows.length;
  }
};

initDb();

module.exports = sqliteApi;
