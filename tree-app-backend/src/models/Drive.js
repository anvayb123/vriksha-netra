const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Drive name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Drive date is required'],
    },
    locationName: {
      // Descriptive text for location
      type: String,
      default: '',
    },
    speciesAllowed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Species',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Stats counters (denormalized for performance)
    totalTrees: { type: Number, default: 0 },
    volunteerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

driveSchema.index({ date: -1 });
driveSchema.index({ isActive: 1 });

module.exports = mongoose.model('Drive', driveSchema);
