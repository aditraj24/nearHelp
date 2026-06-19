import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['aed', 'fire_extinguisher', 'hospital', 'police_station', 'fire_station'],
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
  address: String,
  description: String,
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

resourceSchema.index({ location: '2dsphere' });

export const Resource = mongoose.model('Resource', resourceSchema);