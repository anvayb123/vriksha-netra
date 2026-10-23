const mongoose = require('mongoose');

const treeLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    drive: {
      // Optional - agar volunteer kisi drive se bahar bhi plant kare
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      default: null,
    },
    species: {
      // Null ho sakta hai agar AI confidently match na kar paye (flagged case)
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Species',
      default: null,
    },
    count: {
      // Batch entry ke liye - default 1, zyada bhi ho sakta hai same species ke liye
      type: Number,
      default: 1,
      min: [1, 'Count must be at least 1'],
    },
    photoUrl: {
      type: String,
      default: '',
    },
    aiRawGuess: {
      // Agar AI ka guess dropdown se match nahi hua, raw naam yahan store hota hai
      type: String,
      default: '',
    },
    aiConfidenceScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    flaggedForReview: {
      type: Boolean,
      default: false,
    },
    reviewedByAdmin: {
      type: Boolean,
      default: false,
    },
    // Future: GPS location for mapping
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
  },
  { timestamps: true }
);

// Reporting queries ke liye common indexes
treeLogSchema.index({ user: 1, createdAt: -1 });
treeLogSchema.index({ drive: 1 });
treeLogSchema.index({ species: 1 });
treeLogSchema.index({ flaggedForReview: 1 });
treeLogSchema.index({ createdAt: -1 });

// Geo index for future location-based queries
treeLogSchema.index({ location: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('TreeLog', treeLogSchema);
