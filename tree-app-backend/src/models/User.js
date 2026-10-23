const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      // Google sign-in users may not have a password
      required: [function () { return !this.googleId; }, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password in queries by default
    },
    googleId: { type: String, default: undefined, index: { unique: true, sparse: true } },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    resetPasswordCode: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    resetPasswordAttempts: { type: Number, default: 0, select: false },
    lastLoginAt: { type: Date },
    role: {
      type: String,
      enum: ['volunteer', 'admin'],
      default: 'volunteer',
    },
    // Profile fields for future use
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    totalTreesPlanted: { type: Number, default: 0 }, // Denormalized counter for leaderboard performance
  },
  { timestamps: true }
);

// Index for leaderboard queries
userSchema.index({ totalTreesPlanted: -1 });
userSchema.index({ role: 1 });

// Save karne se pehle password hash karo
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Login ke waqt password compare karne ka method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
