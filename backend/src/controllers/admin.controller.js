import { SOS } from '../models/sos.model.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const totalSOS = await SOS.countDocuments();
  const activeSOS = await SOS.countDocuments({ status: 'active' });
  const resolvedSOS = await SOS.countDocuments({ status: 'resolved' });
  
  const avgResponseTime = await SOS.aggregate([
    { $match: { timeToAcceptance: { $exists: true } } },
    { $group: { _id: null, avg: { $avg: '$timeToAcceptance' } } }
  ]);

  const avgResolutionTime = await SOS.aggregate([
    { $match: { timeToResolution: { $exists: true } } },
    { $group: { _id: null, avg: { $avg: '$timeToResolution' } } }
  ]);

  const falseAlertRate = await SOS.aggregate([
    { $group: { 
      _id: null, 
      total: { $sum: 1 },
      falseAlerts: { $sum: { $cond: ['$isFalseAlert', 1, 0] } }
    }},
    { $project: { rate: { $divide: ['$falseAlerts', '$total'] } } }
  ]);

  const totalUsers = await User.countDocuments();
  const suspendedUsers = await User.countDocuments({ isSuspended: true });

  const sosByType = await SOS.aggregate([
    { $group: { _id: '$crisisType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const responseTimeByDay = await SOS.aggregate([
    { $match: { timeToAcceptance: { $exists: true } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      avgTime: { $avg: '$timeToAcceptance' },
      count: { $sum: 1 }
    }},
    { $sort: { _id: -1 } },
    { $limit: 30 }
  ]);

  res.json(new ApiResponse(200, {
    totalSOS,
    activeSOS,
    resolvedSOS,
    avgResponseTime: avgResponseTime[0]?.avg || 0,
    avgResolutionTime: avgResolutionTime[0]?.avg || 0,
    falseAlertRate: falseAlertRate[0]?.rate || 0,
    totalUsers,
    suspendedUsers,
    sosByType,
    responseTimeByDay
  }, 'Dashboard stats retrieved'));
});

export const getAllSOS = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const query = status ? { status } : {};
  
  const sosList = await SOS.find(query)
    .populate('broadcaster', 'name email phone')
    .populate('responders.user', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await SOS.countDocuments(query);

  res.json(new ApiResponse(200, { 
    sosList, 
    totalPages: Math.ceil(total / limit),
    currentPage: page 
  }, 'SOS list retrieved'));
});

export const getLocalityAnalytics = asyncHandler(async (req, res) => {
  const localityStats = await SOS.aggregate([
    {
      $match: {
        'location.coordinates.0': { $exists: true },
        'location.coordinates.1': { $exists: true }
      }
    },
    {
      $project: {
        status: 1,
        timeToAcceptance: 1,
        falseAlert: '$isFalseAlert',
        localityKey: {
          $concat: [
            { $toString: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] } },
            ',',
            { $toString: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] } }
          ]
        }
      }
    },
    {
      $group: {
        _id: '$localityKey',
        totalSOS: { $sum: 1 },
        activeSOS: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        avgResponseTime: { $avg: '$timeToAcceptance' },
        falseAlerts: { $sum: { $cond: ['$falseAlert', 1, 0] } }
      }
    },
    { $sort: { totalSOS: -1 } },
    { $limit: 30 }
  ]);

  res.json(new ApiResponse(200, { localityStats }, 'Locality analytics retrieved'));
});

export const getUsersForModeration = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('name email role trustScore falseAlerts totalResponses positiveRatings isSuspended createdAt')
    .sort({ isSuspended: -1, falseAlerts: -1, createdAt: -1 })
    .limit(100);

  res.json(new ApiResponse(200, { users }, 'Users retrieved'));
});

export const suspendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const user = await User.findByIdAndUpdate(
    userId,
    { isSuspended: true },
    { new: true }
  ).select('-password');

  res.json(new ApiResponse(200, { user }, 'User suspended'));
});

export const unsuspendUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const user = await User.findByIdAndUpdate(
    userId,
    { isSuspended: false },
    { new: true }
  ).select('-password');

  res.json(new ApiResponse(200, { user }, 'User unsuspended'));
});