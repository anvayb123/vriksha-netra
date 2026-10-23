const TreeLog = require('../models/TreeLog');
const Species = require('../models/Species');
const User = require('../models/User');

// @route  GET /api/dashboard/my-stats  (volunteer's own summary)
const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Use MongoDB aggregation for efficient stats calculation
    const stats = await TreeLog.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$species',
          totalTrees: { $sum: '$count' },
        },
      },
    ]);

    const totalTrees = stats.reduce((sum, s) => sum + s.totalTrees, 0);

    // Populate species names
    const speciesIds = stats.filter(s => s._id).map(s => s._id);
    const speciesDocs = await Species.find({ _id: { $in: speciesIds } }).lean();
    const speciesMap = {};
    speciesDocs.forEach(s => { speciesMap[s._id.toString()] = s.name; });

    const speciesBreakdown = stats
      .filter(s => s._id)
      .map(s => ({
        name: speciesMap[s._id.toString()] || 'Unknown',
        total: s.totalTrees,
      }))
      .sort((a, b) => b.total - a.total);

    res.json({ totalTrees, speciesBreakdown });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/dashboard/overview  (admin - org wide summary)
const getAdminOverview = async (req, res) => {
  try {
    // Total trees across all logs
    const totalResult = await TreeLog.aggregate([
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);
    const totalTrees = totalResult[0]?.total || 0;

    // Species breakdown
    const speciesStats = await TreeLog.aggregate([
      { $match: { species: { $ne: null } } },
      { $group: { _id: '$species', total: { $sum: '$count' } } },
      { $sort: { total: -1 } },
    ]);

    const speciesIds = speciesStats.map(s => s._id);
    const speciesDocs = await Species.find({ _id: { $in: speciesIds } }).lean();
    const speciesMap = {};
    speciesDocs.forEach(s => { speciesMap[s._id.toString()] = s.name; });

    const speciesBreakdown = speciesStats.map(s => ({
      name: speciesMap[s._id.toString()] || 'Unknown',
      total: s.total,
    }));

    // Time series (monthly)
    const timeSeries = await TreeLog.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$count' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Flagged count
    const flaggedCount = await TreeLog.countDocuments({ flaggedForReview: true });

    // Top volunteers (using denormalized counter for speed)
    const topVolunteers = await User.find({ totalTreesPlanted: { $gt: 0 } })
      .select('name totalTreesPlanted')
      .sort({ totalTreesPlanted: -1 })
      .limit(10)
      .lean();

    res.json({
      totalTrees,
      speciesBreakdown,
      timeSeries,
      flaggedCount,
      topVolunteers: topVolunteers.map(v => ({ name: v.name, total: v.totalTreesPlanted })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/dashboard/drive/:driveId  (admin - specific drive drill-down)
const getDriveStats = async (req, res) => {
  try {
    const driveId = req.params.driveId;

    const stats = await TreeLog.aggregate([
      { $match: { drive: require('mongoose').Types.ObjectId.createFromHexString(driveId) } },
      {
        $facet: {
          totalTrees: [{ $group: { _id: null, total: { $sum: '$count' } } }],
          speciesBreakdown: [
            { $match: { species: { $ne: null } } },
            { $group: { _id: '$species', total: { $sum: '$count' } } },
            { $sort: { total: -1 } },
          ],
          volunteers: [
            { $group: { _id: '$user' } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const result = stats[0];
    const totalTrees = result.totalTrees[0]?.total || 0;
    const volunteerCount = result.volunteers[0]?.count || 0;

    // Populate species names
    const speciesIds = result.speciesBreakdown.map(s => s._id);
    const speciesDocs = await Species.find({ _id: { $in: speciesIds } }).lean();
    const speciesMap = {};
    speciesDocs.forEach(s => { speciesMap[s._id.toString()] = s.name; });

    const speciesBreakdown = result.speciesBreakdown.map(s => ({
      name: speciesMap[s._id.toString()] || 'Unknown',
      total: s.total,
    }));

    res.json({ totalTrees, speciesBreakdown, volunteerCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/dashboard/leaderboard  (public leaderboard for all volunteers)
const getLeaderboard = async (req, res) => {
  try {
    const topVolunteers = await User.find({
      totalTreesPlanted: { $gt: 0 },
    })
      .select('name totalTreesPlanted')
      .sort({ totalTreesPlanted: -1 })
      .limit(10)
      .lean();

    res.json(
      topVolunteers.map(v => ({ name: v.name, total: v.totalTreesPlanted }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getMyStats, getAdminOverview, getDriveStats, getLeaderboard };
