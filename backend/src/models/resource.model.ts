import mongoose, { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';
import type { GeoPoint } from '../types/index.js';

export const RESOURCE_TYPES = [
  'aed',
  'fire_extinguisher',
  'hospital',
  'police_station',
  'fire_station'
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface IResource {
  name: string;
  type: ResourceType;
  location: GeoPoint;
  address?: string;
  description?: string;
  addedBy?: Types.ObjectId;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ResourceModel = Model<IResource>;
export type ResourceDocument = HydratedDocument<IResource>;

const resourceSchema = new Schema<IResource, ResourceModel>({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: RESOURCE_TYPES,
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
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

resourceSchema.index({ location: '2dsphere' });

export const Resource = mongoose.model<IResource, ResourceModel>('Resource', resourceSchema);
