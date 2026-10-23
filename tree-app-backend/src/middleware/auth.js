const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Check karo ki user logged in hai (valid token)
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    // Fallback for links opened directly in a browser (e.g. certificate download)
    // where a custom Authorization header can't be attached.
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  // NOTE: Previously, demo tokens / invalid JWTs / unknown user IDs silently fell
  // back to the "volunteer@akshar.org" (Gagan) account. That caused other users'
  // sessions and tree logs to be attributed to Gagan. Never impersonate — reject.
  try {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({ message: 'Session expired, please log in again', code: 'TOKEN_INVALID' });
    }

    const mongoose = require('mongoose');
    if (!decoded?.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({ message: 'Not authorized, invalid token', code: 'TOKEN_INVALID' });
    }

    const user = await User.findById(decoded.id).select('-password').lean();
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists, please log in again', code: 'TOKEN_INVALID' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token', code: 'TOKEN_INVALID' });
  }
};

// Sirf admin ko allow karo (Species/Drives create karne jaise routes ke liye)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admins only.' });
  }
};

module.exports = { protect, adminOnly };
