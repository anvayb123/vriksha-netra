const mongoose = require('mongoose');

const speciesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Species name is required'],
      unique: true,
      trim: true,
    },
    scientificName: {
      type: String,
      default: '',
      trim: true,
    },
    hindi: {
      type: String,
      default: '',
    },
    commonNames: {
      // Alag alag naam jisse log isko bulate hain (fuzzy matching ke liye helpful)
      type: [String],
      default: [],
    },
    family: {
      type: String,
      default: '',
    },
    type: {
      // Tree, Shrub, Herb, Palm, Grass, etc.
      type: String,
      enum: ['Tree', 'Shrub', 'Herb', 'Palm', 'Grass', 'Succulent', 'Aquatic', 'Other'],
      default: 'Tree',
    },
    uses: {
      type: String,
      default: '',
    },
    habitat: {
      type: String,
      default: '',
    },
    referenceImageUrl: {
      type: String,
      default: '',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      // Admin kisi purani species ko list se hata sakta hai bina delete kiye
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Text search index for species lookup
speciesSchema.index({ name: 'text', scientificName: 'text', hindi: 'text' });
speciesSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Species', speciesSchema);
