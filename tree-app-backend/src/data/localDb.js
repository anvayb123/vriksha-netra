const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const sqlitePath = path.join(__dirname, '..', '..', 'database.sqlite');
const sqliteDb = new sqlite3.Database(sqlitePath);

const dbFile = path.join(__dirname, 'localdb.json');

const defaultData = {
  users: [],
  species: [],
  drives: [],
  treeLogs: [],
};

let dbData = { ...defaultData };

const clone = (value) => JSON.parse(JSON.stringify(value));
const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// SQLite Table Setup
sqliteDb.serialize(() => {
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
    _id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'volunteer',
    createdAt TEXT,
    updatedAt TEXT
  )`);

  sqliteDb.run(`CREATE TABLE IF NOT EXISTS species (
    _id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    commonNames TEXT,
    referenceImageUrl TEXT,
    addedBy TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  sqliteDb.run(`CREATE TABLE IF NOT EXISTS drives (
    _id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    locationName TEXT,
    speciesAllowed TEXT,
    createdBy TEXT,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  sqliteDb.run(`CREATE TABLE IF NOT EXISTS tree_logs (
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
});

const loadDb = () => {
  if (fs.existsSync(dbFile)) {
    try {
      const raw = fs.readFileSync(dbFile, 'utf-8');
      dbData = JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load local DB, starting fresh:', error.message);
      dbData = { ...defaultData };
    }
  } else {
    dbData = { ...defaultData };
  }

  seedDefaultsSync();
  saveDbFile();
};

const saveDbFile = () => {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to persist local DB:', error.message);
  }
};

const seedDefaultsSync = () => {
  const now = new Date().toISOString();

  // 1. Seed Users if missing
  if (!dbData.users.some((u) => u.email === 'admin@akshar.org')) {
    const adminPass = bcrypt.hashSync('admin123', 10);
    const adminUser = {
      _id: 'u-admin-1',
      name: 'Akshar Admin',
      email: 'admin@akshar.org',
      password: adminPass,
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    };
    dbData.users.push(adminUser);
    sqliteDb.run(
      `INSERT OR IGNORE INTO users (_id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminUser._id, adminUser.name, adminUser.email, adminUser.password, adminUser.role, now, now]
    );
  }

  if (!dbData.users.some((u) => u.email === 'volunteer@akshar.org')) {
    const volPass = bcrypt.hashSync('volunteer123', 10);
    const volUser = {
      _id: 'u-vol-1',
      name: 'Gagan Kumar',
      email: 'volunteer@akshar.org',
      password: volPass,
      role: 'volunteer',
      createdAt: now,
      updatedAt: now,
    };
    dbData.users.push(volUser);
    sqliteDb.run(
      `INSERT OR IGNORE INTO users (_id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [volUser._id, volUser.name, volUser.email, volUser.password, volUser.role, now, now]
    );
  }

  // 2. Seed Species if missing
  const { indianPlants } = require('../utils/indianPlantDb');
  indianPlants.forEach((plant) => {
    if (!dbData.species.some(s => s.name === plant.name)) {
      const id = generateId();
      const item = {
        _id: id,
        name: plant.name,
        commonNames: [plant.hindi, plant.scientific],
        referenceImageUrl: '',
        addedBy: 'u-admin-1',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      dbData.species.push(item);
      sqliteDb.run(
        `INSERT OR IGNORE INTO species (_id, name, commonNames, referenceImageUrl, addedBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, plant.name, JSON.stringify(item.commonNames), '', 'u-admin-1', 1, now, now]
      );
    }
  });

  // 3. Seed Drives if missing
  if (dbData.drives.length === 0) {
    const id = generateId();
    const driveItem = {
      _id: id,
      name: 'Ganesh Nagar Plantation Drive',
      date: '2026-08-15',
      locationName: 'Ganesh Nagar Park',
      speciesAllowed: [],
      createdBy: 'u-admin-1',
      createdAt: now,
      updatedAt: now,
    };
    dbData.drives.push(driveItem);
    sqliteDb.run(
      `INSERT OR IGNORE INTO drives (_id, name, date, locationName, speciesAllowed, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, driveItem.name, driveItem.date, driveItem.locationName, '[]', 'u-admin-1', now, now]
    );
  }
};

const ensureCollection = (name) => {
  if (!dbData[name]) {
    dbData[name] = [];
  }
  return dbData[name];
};

const matchesFilter = (item, filter = {}) => {
  return Object.entries(filter).every(([key, value]) => {
    const actual = item[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$ne' in value) return actual !== value.$ne;
      if ('$in' in value) {
        return Array.isArray(actual)
          ? value.$in.some((v) => actual.includes(v))
          : value.$in.includes(actual);
      }
      if ('$nin' in value) {
        return Array.isArray(actual)
          ? value.$nin.every((v) => !actual.includes(v))
          : !value.$nin.includes(actual);
      }
      if ('$gte' in value) return actual >= value.$gte;
      if ('$lte' in value) return actual <= value.$lte;
      return false;
    }
    return actual === value;
  });
};

const getCollection = (name) => ensureCollection(name);

const find = (collectionName, filter = {}) =>
  getCollection(collectionName)
    .filter((item) => matchesFilter(item, filter))
    .map(clone);

const findOne = (collectionName, filter = {}) =>
  clone(getCollection(collectionName).find((item) => matchesFilter(item, filter)) || null);

const findById = (collectionName, id) =>
  clone(getCollection(collectionName).find((item) => item._id === id) || null);

const create = (collectionName, values = {}) => {
  const now = new Date().toISOString();
  const item = {
    ...values,
    _id: values._id || generateId(),
    createdAt: values.createdAt || now,
    updatedAt: values.updatedAt || now,
  };

  getCollection(collectionName).push(item);
  saveDbFile();

  // Persist into SQLite
  if (collectionName === 'users') {
    sqliteDb.run(
      `INSERT OR REPLACE INTO users (_id, name, email, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item._id, item.name, item.email, item.password, item.role || 'volunteer', item.createdAt, item.updatedAt]
    );
  } else if (collectionName === 'species') {
    sqliteDb.run(
      `INSERT OR REPLACE INTO species (_id, name, commonNames, referenceImageUrl, addedBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item._id, item.name, JSON.stringify(item.commonNames || []), item.referenceImageUrl || '', item.addedBy || '', item.isActive !== false ? 1 : 0, item.createdAt, item.updatedAt]
    );
  } else if (collectionName === 'drives') {
    sqliteDb.run(
      `INSERT OR REPLACE INTO drives (_id, name, date, locationName, speciesAllowed, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item._id, item.name, item.date, item.locationName || '', JSON.stringify(item.speciesAllowed || []), item.createdBy || '', item.createdAt, item.updatedAt]
    );
  } else if (collectionName === 'treeLogs') {
    sqliteDb.run(
      `INSERT OR REPLACE INTO tree_logs (_id, userId, speciesId, count, photoUrl, aiRawGuess, aiConfidence, isFlagged, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item._id, item.user || item.userId, item.species || item.speciesId || '', item.count || 1, item.photoUrl || '', item.aiRawGuess || '', item.aiConfidence || 0, item.isFlagged ? 1 : 0, item.createdAt, item.updatedAt]
    );
  }

  return clone(item);
};

const save = (collectionName, values = {}) => {
  const collection = getCollection(collectionName);
  const index = collection.findIndex((item) => item._id === values._id);
  if (index === -1) {
    return null;
  }

  const updated = {
    ...collection[index],
    ...values,
    updatedAt: new Date().toISOString(),
  };
  collection[index] = updated;
  saveDbFile();

  if (collectionName === 'species') {
    sqliteDb.run(
      `UPDATE species SET name=?, commonNames=?, referenceImageUrl=?, isActive=?, updatedAt=? WHERE _id=?`,
      [updated.name, JSON.stringify(updated.commonNames || []), updated.referenceImageUrl || '', updated.isActive ? 1 : 0, updated.updatedAt, updated._id]
    );
  } else if (collectionName === 'treeLogs') {
    sqliteDb.run(
      `UPDATE tree_logs SET speciesId=?, isFlagged=?, updatedAt=? WHERE _id=?`,
      [updated.species || updated.speciesId, updated.isFlagged ? 1 : 0, updated.updatedAt, updated._id]
    );
  }

  return clone(updated);
};

const countDocuments = (collectionName, filter = {}) =>
  getCollection(collectionName).filter((item) => matchesFilter(item, filter)).length;

const distinct = (collectionName, field, filter = {}) => {
  return [...new Set(find(collectionName, field ? filter : {}).map((item) => item[field]))];
};

loadDb();

module.exports = {
  getCollection,
  find,
  findOne,
  findById,
  create,
  save,
  countDocuments,
  distinct,
};
