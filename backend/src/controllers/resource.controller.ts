import { Resource, RESOURCE_TYPES, type IResource, type ResourceType } from '../models/resource.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler, type AuthenticatedRequest } from '../utils/asyncHandler.js';

interface AddResourceBody {
  name: string;
  type: ResourceType;
  longitude: number;
  latitude: number;
  address?: string;
  description?: string;
}

export const addResource = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { name, type, longitude, latitude, address, description } = req.body as AddResourceBody;

  const resource = await Resource.create({
    name,
    type,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    address,
    description,
    addedBy: req.user._id
  });

  res.status(201).json(new ApiResponse(201, { resource }, 'Resource added'));
});

export const getNearbyResources = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { longitude, latitude, radius = '5000' } = req.query as {
    longitude?: string; latitude?: string; radius?: string;
  };

  const resources = await Resource.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude ?? '0'), parseFloat(latitude ?? '0')]
        },
        $maxDistance: parseInt(radius, 10)
      }
    }
  }).populate('addedBy', 'name');

  res.json(new ApiResponse(200, { resources }, 'Resources retrieved'));
});

export const getAllResources = asyncHandler<AuthenticatedRequest>(async (_req, res) => {
  const resources = await Resource.find().populate('addedBy', 'name');
  res.json(new ApiResponse(200, { resources }, 'All resources retrieved'));
});

export const seedResources = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const { longitude, latitude } = req.body as { longitude?: number; latitude?: number };
  if (!longitude || !latitude) {
    throw new ApiError(400, "Longitude and Latitude are required");
  }

  const newResources: Partial<IResource>[] = [];

  for (let i = 0; i < 5; i++) {
    const type = RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)]!;
    const latOffset = (Math.random() - 0.5) * 0.04; // Roughly 4km spread
    const lngOffset = (Math.random() - 0.5) * 0.04;

    newResources.push({
      name: `Sample ${type.replace('_', ' ')}`,
      type,
      location: {
        type: 'Point',
        coordinates: [Number(longitude) + lngOffset, Number(latitude) + latOffset]
      },
      address: `Random St ${Math.floor(Math.random() * 100)}`,
      description: "Auto-generated sample resource",
      addedBy: req.user._id,
      verified: true
    });
  }

  await Resource.insertMany(newResources);

  res.status(201).json(new ApiResponse(201, { count: newResources.length }, 'Sample resources seeded'));
});
