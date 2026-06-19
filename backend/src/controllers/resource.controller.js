import { Resource } from '../models/resource.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const addResource = asyncHandler(async (req, res) => {
  const { name, type, longitude, latitude, address, description } = req.body;

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

export const getNearbyResources = asyncHandler(async (req, res) => {
  const { longitude, latitude, radius = 5000 } = req.query;

  const resources = await Resource.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(radius)
      }
    }
  }).populate('addedBy', 'name');

  res.json(new ApiResponse(200, { resources }, 'Resources retrieved'));
});

export const getAllResources = asyncHandler(async (req, res) => {
  const resources = await Resource.find().populate('addedBy', 'name');
  res.json(new ApiResponse(200, { resources }, 'All resources retrieved'));
});

export const seedResources = asyncHandler(async (req, res) => {
  const { longitude, latitude } = req.body;
  if (!longitude || !latitude) {
    throw new ApiError(400, "Longitude and Latitude are required");
  }

  const types = ['aed', 'fire_extinguisher', 'hospital', 'police_station', 'fire_station'];
  const newResources = [];

  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const latOffset = (Math.random() - 0.5) * 0.04; // Roughly 4km spread
    const lngOffset = (Math.random() - 0.5) * 0.04;

    newResources.push({
      name: `Sample ${type.replace('_', ' ')}`,
      type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude) + lngOffset, parseFloat(latitude) + latOffset]
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