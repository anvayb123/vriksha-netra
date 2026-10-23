require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const seedDatabase = require('./config/seed');
const authRoutes = require('./routes/authRoutes');
const speciesRoutes = require('./routes/speciesRoutes');
const driveRoutes = require('./routes/driveRoutes');
const treeLogRoutes = require('./routes/treeLogRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const identifyRoutes = require('./routes/identifyRoutes');
const { apiLimiter, authLimiter, identifyLimiter } = require('./middleware/rateLimiter');

const app = express();

// Behind a tunnel / reverse proxy (localtunnel, Render, etc.) — needed so rate limiting
// reads the real client IP from X-Forwarded-For instead of throwing a validation error.
app.set('trust proxy', 1);

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS — allow requests from your app and local development
const extraOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8081',
  'http://localhost:19006',
  'exp://localhost:8081',
  ...extraOrigins,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      process.env.CORS_ORIGIN === '*' ||
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.netlify.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', apiLimiter);
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/tree-logs', treeLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/identify', identifyLimiter, identifyRoutes);

// Indian plant database API (no auth required — public reference data)
const { getAllPlants, getPlantDetails } = require('./utils/indianPlantDb');
app.get('/api/plants', (req, res) => res.json(getAllPlants()));
app.get('/api/plants/search', (req, res) => {
  const q = req.query.q || '';
  const plants = getAllPlants().filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.scientific.toLowerCase().includes(q.toLowerCase()) ||
    p.hindi.includes(q)
  );
  res.json(plants);
});
app.get('/api/plants/:name', (req, res) => {
  const plant = getPlantDetails(req.params.name);
  if (!plant) return res.status(404).json({ message: 'Plant not found' });
  res.json(plant);
});

// ─── Public Tree Details Page (When scanned with smartphone camera) ─────────
const { renderTreeHtml } = require('./utils/treeHtmlPage');
app.get('/tree/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).send('<!DOCTYPE html><html><body style="background:#030a06;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h2>Invalid Tree Tag</h2></body></html>');
    }

    const TreeLog = require('./models/TreeLog');
    const log = await TreeLog.findById(id)
      .populate('user', 'name email totalTreesPlanted')
      .populate('species')
      .populate('drive', 'name date location')
      .lean();

    if (!log) {
      return res.status(404).send('<!DOCTYPE html><html><body style="background:#030a06;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h2>Tree record not found</h2></body></html>');
    }

    const treeData = {
      _id: log._id,
      treeName: log.species?.name || log.aiRawGuess || 'Planted Tree',
      scientificName: log.species?.scientificName || '',
      hindiName: log.species?.hindi || '',
      family: log.species?.family || '',
      type: log.species?.type || 'Tree',
      uses: log.species?.uses || '',
      habitat: log.species?.habitat || '',
      photoUrl: log.photoUrl || log.species?.referenceImageUrl || '',
      plantedBy: log.user?.name || 'Green Volunteer',
      plantedDate: log.createdAt,
      driveName: log.drive?.name || 'Community Plantation Drive',
      location: log.location,
      count: log.count || 1,
    };

    const html = renderTreeHtml(treeData);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).send(`<!DOCTYPE html><html><body style="background:#030a06;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h2>Error loading tree details</h2><p>${error.message}</p></body></html>`);
  }
});

// Admin flagged logs (now uses Mongoose)
const { protect, adminOnly } = require('./middleware/auth');
const TreeLog = require('./models/TreeLog');
app.get('/api/admin/flagged', protect, adminOnly, async (req, res) => {
  try {
    const logs = await TreeLog.find({ flaggedForReview: true })
      .populate('user', 'name email')
      .populate('species', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/review/:id', protect, adminOnly, async (req, res) => {
  try {
    const log = await TreeLog.findByIdAndUpdate(
      req.params.id,
      {
        species: req.body.resolvedSpeciesId || undefined,
        flaggedForReview: false,
        reviewedByAdmin: true,
      },
      { new: true }
    );
    if (!log) return res.status(404).json({ message: 'Not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── Health check endpoint ──────────────────────────────────────────────────
const mongoose = require('mongoose');
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────
const startServer = async () => {
  // Connect to MongoDB Atlas
  const dbConnected = await connectDB();

  if (dbConnected) {
    // Seed default data on first run
    await seedDatabase();
    console.log('✅ MongoDB Atlas is ready');
  } else {
    console.warn('⚠️  Running without MongoDB — some features may not work');
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌿 Vriksha Netra server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database: ${dbConnected ? 'MongoDB Atlas ☁️' : 'Offline ⚠️'}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();

