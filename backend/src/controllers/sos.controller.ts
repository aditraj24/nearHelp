import { SOS, type ISOSResponder } from '../models/sos.model.js';
import { Resource } from '../models/resource.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler, type AuthenticatedRequest } from '../utils/asyncHandler.js';
import { generateCrisisGuidance, generateEmergencySummary, generateDebriefPrompt } from '../utils/aiService.js';
import { SOS_STATUS, BROADCAST_RADII, type CrisisType } from '../constant.js';
import { emitSOSResolved } from '../socket/index.js';
import type { PopulatedUserRef } from '../types/index.js';

/** A responder entry after `.populate('responders.user', ...)`. */
type PopulatedResponder = Omit<ISOSResponder, 'user'> & { user: PopulatedUserRef | null };

interface CreateSOSBody {
  crisisType: CrisisType;
  longitude: number;
  latitude: number;
  address?: string;
  isAnonymous?: boolean;
  broadcastRadius?: number;
}

export const createSOS = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { crisisType, longitude, latitude, address, isAnonymous, broadcastRadius } =
    req.body as CreateSOSBody;

  if (!crisisType || longitude === undefined || latitude === undefined) {
    throw new ApiError(400, 'Crisis type and location are required');
  }

  const normalizedRadius = Number(broadcastRadius) || 1000;
  if (!BROADCAST_RADII.includes(normalizedRadius as (typeof BROADCAST_RADII)[number])) {
    throw new ApiError(400, 'Broadcast radius must be one of: 500, 1000, 2000 meters');
  }

  const sos = await SOS.create({
    broadcaster: req.user._id,
    crisisType,
    location: {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)]
    },
    address: address || '',
    isAnonymous: isAnonymous || false,
    broadcastRadius: normalizedRadius
  });

  const guidance = await generateCrisisGuidance(crisisType, address);
  const emergencySummary = await generateEmergencySummary(crisisType, address, normalizedRadius);

  sos.aiGuidance = guidance;
  sos.emergencySummary = emergencySummary;
  await sos.save();

  const nearbyResources = await Resource.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)]
        },
        $maxDistance: 5000
      }
    },
    type: { $in: ['hospital', 'police_station', 'fire_station'] }
  }).limit(5);

  res.status(201).json(
    new ApiResponse(201, { sos, guidance, nearbyResources }, 'SOS created successfully')
  );
});

export const resolveSOS = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { sosId } = req.params;

  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  if (sos.broadcaster.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only broadcaster can resolve SOS');
  }

  const timeToResolution = (Date.now() - sos.createdAt.getTime()) / 1000;

  sos.status = SOS_STATUS.RESOLVED;
  sos.resolvedAt = new Date();
  sos.timeToResolution = timeToResolution;

  // Schedule welfare check after resolution (10s for testing, change to 24*60*60*1000 for production)

  sos.welfareCheckDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await sos.save();

  const debrief = await generateDebriefPrompt(sos.crisisType, sos.timeToResolution, sos.responders.length);
  emitSOSResolved({
    sosId: sos._id.toString(),
    resolvedAt: sos.resolvedAt,
    debrief,
    broadcasterId: sos.broadcaster,
    responderIds: sos.responders.map((entry) => entry.user)
  });

  res.json(new ApiResponse(200, { sos, debrief }, 'SOS resolved'));
});

export const rateResponder = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { sosId, responderId } = req.params;
  const { rating } = req.body as { rating: number };

  const sos = await SOS.findById(sosId);
  if (!sos || sos.broadcaster.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized');
  }

  const responderIndex = sos.responders.findIndex(
    r => r.user.toString() === responderId
  );

  if (responderIndex === -1) {
    throw new ApiError(404, 'Responder not found');
  }

  sos.responders[responderIndex]!.rating = rating;
  await sos.save();

  const user = await User.findById(responderId);
  if (!user) throw new ApiError(404, 'Responder not found');

  user.totalResponses += 1;
  if (rating >= 3) user.positiveRatings += 1;
  user.trustScore = user.totalResponses > 0 ? user.positiveRatings / user.totalResponses : 1.0;
  await user.save();

  res.json(new ApiResponse(200, null, 'Rating submitted'));
});

export const flagFalseAlert = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { sosId } = req.params;

  const sos = await SOS.findById(sosId);
  if (!sos) {
    throw new ApiError(404, 'SOS not found');
  }

  sos.isFalseAlert = true;
  await sos.save();

  const broadcaster = await User.findById(sos.broadcaster);
  if (!broadcaster) throw new ApiError(404, 'Broadcaster not found');

  broadcaster.falseAlerts += 1;
  broadcaster.trustScore = Math.max(0, broadcaster.trustScore - 0.2);

  if (broadcaster.trustScore < 0.3) {
    broadcaster.isSuspended = true;
  }

  await broadcaster.save();

  res.json(new ApiResponse(200, null, 'Alert flagged'));
});

export const getActiveSOS = asyncHandler<AuthenticatedRequest>(async (_req, res) => {
  const activeSOS = await SOS.find({ status: SOS_STATUS.ACTIVE })
    .populate('broadcaster', 'name phone avatar')
    .populate('responders.user', 'name phone avatar')
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, { activeSOS }, 'Active SOS retrieved'));
});

export const getPendingSOS = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    const pendingSOS = await SOS.find({
      status: { $in: [SOS_STATUS.ACTIVE, SOS_STATUS.RESPONDING] }
    })
      .populate('broadcaster', 'name phone avatar')
      .populate('responders.user', 'name phone avatar')
      .sort({ createdAt: -1 });

    const safePendingSOS = pendingSOS.map((entry) => {
      const data = entry.toObject() as unknown as Record<string, unknown> & {
        isAnonymous: boolean;
        broadcaster: PopulatedUserRef | null;
      };
      // Ensure broadcaster exists before checking ID
      const currentUserId = req.user?._id?.toString();

      if (data.isAnonymous && data.broadcaster && data.broadcaster._id && currentUserId) {
        if (data.broadcaster._id.toString() !== currentUserId) {
          data.broadcaster = null;
        }
      } else if (data.isAnonymous) {
        // If anonymous and we can't verify ownership, hide broadcaster
        data.broadcaster = null;
      }
      return data;
    });

    res.json(new ApiResponse(200, { pendingSOS: safePendingSOS }, 'Pending SOS retrieved'));
  } catch (error) {
    console.error("Error in getPendingSOS full details:", error);
    throw new ApiError(500, (error as Error).message || "Failed to retrieve pending SOS alerts");
  }
});

export const getSOSById = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { sosId } = req.params;

  try {
    const sos = await SOS.findById(sosId)
      .populate('broadcaster', 'name phone avatar')
      .populate('responders.user', 'name phone avatar skills trustScore');

    if (!sos) {
      throw new ApiError(404, 'SOS not found');
    }

    const currentUserId = req.user?._id?.toString();
    const safeSOS = sos.toObject() as unknown as Record<string, unknown> & {
      isAnonymous: boolean;
      broadcaster: PopulatedUserRef | null;
      location: { coordinates: [number, number] };
      aiGuidance?: unknown;
      emergencySummary?: string;
    };
    const isBroadcaster = safeSOS.broadcaster?._id?.toString() === currentUserId;

    if (safeSOS.isAnonymous && !isBroadcaster) {
      safeSOS.broadcaster = null;
    }

    const [longitude, latitude] = safeSOS.location.coordinates;
    const nearbyResources = await Resource.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000
        }
      }
    }).limit(20);

    res.json(new ApiResponse(200, {
      sos: safeSOS,
      guidance: safeSOS.aiGuidance,
      emergencySummary: safeSOS.emergencySummary,
      nearbyResources
    }, 'SOS details retrieved'));
  } catch (error) {
    console.error("Error fetching SOS details:", error);
    const err = error as ApiError;
    throw new ApiError(err.statusCode || 500, err.message || "Error fetching SOS details");
  }
});

export const getMyHistory = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const userId = req.user._id;

  const broadcasted = await SOS.find({ broadcaster: userId })
    .populate('responders.user', 'name avatar skills trustScore')
    .sort({ createdAt: -1 })
    .limit(50);

  const responded = await SOS.find({ 'responders.user': userId })
    .populate('broadcaster', 'name avatar')
    .populate('responders.user', 'name avatar skills trustScore')
    .sort({ createdAt: -1 })
    .limit(50);

  const respondedWithRating = responded.map((sos) => {
    const populatedResponders = sos.responders as unknown as PopulatedResponder[];
    const entry = populatedResponders.find((r) => r.user?._id?.toString() === userId.toString());
    return {
      ...sos.toObject(),
      myRating: entry?.rating ?? null,
      myAcceptedAt: entry?.acceptedAt || null
    };
  });

  res.json(new ApiResponse(200, { broadcasted, responded: respondedWithRating }, 'History retrieved'));
});

// Post-Crisis Welfare Check endpoints
export const getPendingWelfareChecks = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const userId = req.user._id;

  const pendingChecks = await SOS.find({
    broadcaster: userId,
    status: SOS_STATUS.RESOLVED,
    welfareCheckDue: { $lte: new Date() },
    welfareCheckResponse: null
  })
    .select('crisisType address resolvedAt welfareCheckDue welfareCheckSent')
    .sort({ resolvedAt: -1 })
    .limit(10);

  // Mark as sent when queried
  const ids = pendingChecks.map(s => s._id);
  if (ids.length > 0) {
    await SOS.updateMany(
      { _id: { $in: ids }, welfareCheckSent: false },
      { $set: { welfareCheckSent: true } }
    );
  }

  res.json(new ApiResponse(200, { welfareChecks: pendingChecks }, 'Pending welfare checks retrieved'));
});

export const respondToWelfareCheck = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { sosId } = req.params;
  const { response } = req.body as { response: 'fine' | 'need_help' }; // 'fine' or 'need_help'

  if (!['fine', 'need_help'].includes(response)) {
    throw new ApiError(400, 'Response must be "fine" or "need_help"');
  }

  const sos = await SOS.findById(sosId);
  if (!sos) throw new ApiError(404, 'SOS not found');
  if (sos.broadcaster.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only broadcaster can respond to welfare check');
  }

  sos.welfareCheckResponse = response;
  sos.welfareCheckRespondedAt = new Date();
  await sos.save();

  res.json(new ApiResponse(200, { sos }, 'Welfare check response recorded'));
});
