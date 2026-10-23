const User = require('../models/User');
const Species = require('../models/Species');
const Drive = require('../models/Drive');
const { indianPlants } = require('../utils/indianPlantDb');

// Seeds the MongoDB database with default data on first run
// This runs automatically when the server starts if the DB is empty

const seedDatabase = async () => {
  try {
    // ─── Seed Admin & Volunteer accounts ─────────────────────────────────
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('📝 Seeding default users...');

      await User.create({
        name: 'Akshar Admin',
        email: 'admin@akshar.org',
        password: 'admin123', // Will be hashed by the pre-save hook
        role: 'admin',
      });

      await User.create({
        name: 'Gagan Kumar',
        email: 'volunteer@akshar.org',
        password: 'volunteer123',
        role: 'volunteer',
      });

      console.log('✅ Default users created (admin@akshar.org / volunteer@akshar.org)');
    }

    // ─── Seed Indian Plant Species ───────────────────────────────────────
    const speciesCount = await Species.countDocuments();
    if (speciesCount === 0) {
      console.log('🌿 Seeding Indian plant species database...');

      const admin = await User.findOne({ role: 'admin' });

      const speciesData = indianPlants.map((plant) => ({
        name: plant.name,
        scientificName: plant.scientific,
        hindi: plant.hindi,
        commonNames: [plant.hindi, plant.scientific].filter(Boolean),
        family: plant.family || '',
        type: plant.type || 'Tree',
        uses: plant.uses || '',
        habitat: plant.habitat || '',
        addedBy: admin ? admin._id : undefined,
        isActive: true,
      }));

      await Species.insertMany(speciesData);
      console.log(`✅ ${speciesData.length} Indian plant species seeded into MongoDB`);
    }

    // ─── Seed Sample Drive ───────────────────────────────────────────────
    const driveCount = await Drive.countDocuments();
    if (driveCount === 0) {
      console.log('🚗 Seeding sample plantation drive...');

      const admin = await User.findOne({ role: 'admin' });

      await Drive.create({
        name: 'Ganesh Nagar Plantation Drive',
        date: new Date('2026-08-15'),
        locationName: 'Ganesh Nagar Park',
        speciesAllowed: [],
        createdBy: admin ? admin._id : undefined,
        isActive: true,
      });

      console.log('✅ Sample plantation drive created');
    }

    console.log('🌱 Database seeding complete');
  } catch (error) {
    console.error('❌ Database seeding error:', error.message);
    // Don't crash the server if seeding fails — let it continue with whatever data exists
  }
};

module.exports = seedDatabase;
