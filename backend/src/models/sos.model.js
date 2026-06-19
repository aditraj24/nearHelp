import mongoose from 'mongoose';
import { CRISIS_TYPES, SOS_STATUS } from '../constant.js';

const sosSchema = new mongoose.Schema({
  broadcaster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  crisisType: {
    type: String,
    enum: Object.values(CRISIS_TYPES),
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  address: {
    type: String,
    default: ''
  },
  broadcastRadius: {
    type: Number,
    enum: [500, 1000, 2000],
    default: 1000
  },
  status: {
    type: String,
    enum: Object.values(SOS_STATUS),
    default: SOS_STATUS.ACTIVE
  },
  responders: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acceptedAt: {
      type: Date,
      default: Date.now
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null
    }
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isFalseAlert: {
    type: Boolean,
    default: false
  },
  aiGuidance: {
    steps: [String],
    emergencyScript: String
  },
  emergencySummary: {
    type: String,
    default: ''
  },
  resolvedAt: Date,
  timeToAcceptance: Number,
  timeToResolution: Number,
  guardianNotified: {
    type: Boolean,
    default: false
  },
  welfareCheckDue: {
    type: Date,
    default: null
  },
  welfareCheckSent: {
    type: Boolean,
    default: false
  },
  welfareCheckResponse: {
    type: String,
    enum: ['fine', 'need_help', null],
    default: null
  },
  welfareCheckRespondedAt: {
    type: Date,
    default: null
  },
}, { timestamps: true });

sosSchema.index({ location: '2dsphere' });
sosSchema.index({ status: 1, createdAt: -1 });

export const SOS = mongoose.model('SOS', sosSchema);