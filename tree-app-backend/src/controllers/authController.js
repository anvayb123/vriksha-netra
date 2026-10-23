const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');
const {
  sendLoginAlert,
  sendWelcomeEmail,
  sendPasswordResetCode,
  sendPasswordChangedEmail,
} = require('../utils/mailer');

// JWT token generate karne ka helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const userPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || '',
  authProvider: user.authProvider || 'local',
  token: generateToken(user._id),
});

// Request se device / IP info nikalo (login alert email ke liye)
const clientInfo = (req) => ({
  ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip,
  device: req.body?.deviceInfo || req.headers['user-agent'] || 'Unknown device',
});

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

// @route  POST /api/auth/register
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: 'Database is temporarily offline. Please check your internet connection or MongoDB Atlas IP whitelist.',
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Security: public registration can NEVER create an admin.
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'volunteer',
      authProvider: 'local',
      lastLoginAt: new Date(),
    });

    sendWelcomeEmail(user); // fire-and-forget
    res.status(201).json(userPayload(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0]?.message || 'Invalid data' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: 'Database is temporarily offline. Please check your internet connection or MongoDB Atlas IP whitelist.',
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (user && !user.password && user.googleId) {
      return res.status(401).json({
        message: 'This account uses Google sign-in. Tap "Continue with Google" or use Forgot Password to set a password.',
      });
    }

    if (user && (await user.matchPassword(password))) {
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
      sendLoginAlert(user, { ...clientInfo(req), method: 'Email & password' });
      return res.json(userPayload(user));
    }

    res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── Google token verification ─────────────────────────────────────────────
// Accepts either an ID token or an OAuth access token from expo-auth-session.
const allowedGoogleClientIds = () =>
  (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const verifyGoogleToken = async ({ idToken, accessToken }) => {
  const allowed = allowedGoogleClientIds();

  if (idToken) {
    const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: idToken } });
    if (allowed.length && !allowed.includes(data.aud)) throw new Error('Google token audience mismatch');
    if (data.email_verified !== 'true' && data.email_verified !== true) throw new Error('Google email not verified');
    return { googleId: data.sub, email: data.email, name: data.name, picture: data.picture };
  }

  if (accessToken) {
    const { data: info } = await axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { access_token: accessToken } });
    const aud = info.aud || info.azp;
    if (allowed.length && !allowed.includes(aud)) throw new Error('Google token audience mismatch');
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profile.email_verified) throw new Error('Google email not verified');
    return { googleId: profile.sub, email: profile.email, name: profile.name, picture: profile.picture };
  }

  throw new Error('No Google token provided');
};

// @route  POST /api/auth/google
const googleLogin = async (req, res) => {
  try {
    const g = await verifyGoogleToken(req.body || {});
    const email = g.email.toLowerCase().trim();

    let user = await User.findOne({ $or: [{ googleId: g.googleId }, { email }] });
    let isNew = false;

    if (!user) {
      isNew = true;
      user = await User.create({
        name: g.name || email.split('@')[0],
        email,
        googleId: g.googleId,
        authProvider: 'google',
        avatar: g.picture || '',
        role: 'volunteer',
        lastLoginAt: new Date(),
      });
    } else {
      // Link Google to an existing email account
      if (!user.googleId) user.googleId = g.googleId;
      if (!user.avatar && g.picture) user.avatar = g.picture;
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
    }

    if (isNew) sendWelcomeEmail(user);
    sendLoginAlert(user, { ...clientInfo(req), method: 'Continue with Google' });
    res.json(userPayload(user));
  } catch (error) {
    console.error('Google login failed:', error.response?.data || error.message);
    res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
};

// @route  POST /api/auth/forgot-password   { email }
// Always responds the same way so attackers can't probe which emails exist.
const forgotPassword = async (req, res) => {
  const genericMsg = 'If an account exists for this email, a 6-digit reset code has been sent.';
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ message: 'Please provide your email' });

    const user = await User.findOne({ email });
    if (user) {
      const code = String(crypto.randomInt(100000, 1000000));
      user.resetPasswordCode = hashCode(code);
      user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.resetPasswordAttempts = 0;
      await user.save({ validateBeforeSave: false });
      await sendPasswordResetCode(user, code);
    }
    res.json({ message: genericMsg });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/auth/reset-password   { email, code, newPassword }
const resetPassword = async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const { code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select('+resetPasswordCode +resetPasswordExpires +resetPasswordAttempts');
    if (!user || !user.resetPasswordCode || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Reset code is invalid or has expired. Request a new one.' });
    }
    if ((user.resetPasswordAttempts || 0) >= 5) {
      return res.status(429).json({ message: 'Too many wrong attempts. Request a new code.' });
    }
    if (user.resetPasswordCode !== hashCode(String(code).trim())) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ message: 'Incorrect code. Please check your email.' });
    }

    user.password = newPassword; // hashed by pre-save hook
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save();

    sendPasswordChangedEmail(user);
    res.json({ message: 'Password reset successful', ...userPayload(user) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/auth/me  (logged-in user ki apni profile)
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { registerUser, loginUser, googleLogin, forgotPassword, resetPassword, getMe };
