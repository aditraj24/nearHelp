import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const generateAccessAndAccessTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")   
    }
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  const user = await User.create({ name, email, password, phone });
  
  const {accessToken, refreshToken} = await generateAccessAndAccessTokens(user._id)

  const createdUser = await User.findById(user._id).select(
      "-password -refreshtoken"
  )

  const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none"
  }

  return res.status(201).cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
      new ApiResponse(200, {
          user: createdUser, accessToken, refreshToken
      }, "User registered Successfully")
  )
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (user.isSuspended) {
    throw new ApiError(403, 'Account suspended');
  }

  const {accessToken, refreshToken} = await generateAccessAndAccessTokens(user._id)
  
  const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")

  const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none"
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
      new ApiResponse(
          200, 
          {
              user: loggedInUser, accessToken, refreshToken
          },
          "User logged In Successfully"
      )
  )
});

export const logout = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged Out")
    )
})

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('guardians', 'name email phone avatar')
    .select('-password');
  res.json(new ApiResponse(200, { user }, 'Profile retrieved'));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, skills, isVulnerable } = req.body;
  
  const updates = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (skills) updates.skills = skills;
  if (typeof isVulnerable === 'boolean') updates.isVulnerable = isVulnerable;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password');

  res.json(new ApiResponse(200, { user }, 'Profile updated'));
});

// Guardian Mode endpoints
export const addGuardian = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Guardian email is required');

  const guardian = await User.findOne({ email: email.toLowerCase() });
  if (!guardian) throw new ApiError(404, 'User not found with that email');
  if (guardian._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot add yourself as guardian');
  }

  const user = await User.findById(req.user._id);
  if (user.guardians.some(g => g.toString() === guardian._id.toString())) {
    throw new ApiError(400, 'Already a guardian');
  }

  user.guardians.push(guardian._id);
  user.isVulnerable = true;
  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(req.user._id)
    .populate('guardians', 'name email phone avatar')
    .select('-password');

  res.json(new ApiResponse(200, { user: updatedUser }, 'Guardian added'));
});

export const removeGuardian = asyncHandler(async (req, res) => {
  const { guardianId } = req.params;

  const user = await User.findById(req.user._id);
  user.guardians = user.guardians.filter(g => g.toString() !== guardianId);
  if (user.guardians.length === 0) user.isVulnerable = false;
  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(req.user._id)
    .populate('guardians', 'name email phone avatar')
    .select('-password');

  res.json(new ApiResponse(200, { user: updatedUser }, 'Guardian removed'));
});

export const getGuardians = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('guardians', 'name email phone avatar')
    .select('guardians isVulnerable');

  res.json(new ApiResponse(200, { 
    guardians: user.guardians, 
    isVulnerable: user.isVulnerable 
  }, 'Guardians retrieved'));
});

export const getWards = asyncHandler(async (req, res) => {
  // Find users who have me as their guardian
  const wards = await User.find({ guardians: req.user._id })
    .select('name email phone avatar isVulnerable');

  res.json(new ApiResponse(200, { wards }, 'Wards retrieved'));
});
