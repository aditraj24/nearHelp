import mongoose, { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { USER_ROLES, SKILL_TYPES, type SkillType, type UserRole } from '../constant.js';

export interface IUserSkill {
  type: SkillType;
  verified: boolean;
  proofDocument?: string;
}

export interface IUser {
  name: string;
  email: string;
  password: string;
  phone: string;
  avatar: string | null;
  role: UserRole;
  skills: IUserSkill[];
  trustScore: number;
  totalResponses: number;
  positiveRatings: number;
  falseAlerts: number;
  isSuspended: boolean;
  isActive: boolean;
  guardians: Types.ObjectId[];
  isVulnerable: boolean;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Instance methods that live on every hydrated `User` document. */
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER
  },
  skills: [{
    type: {
      type: String,
      enum: Object.values(SKILL_TYPES)
    },
    verified: {
      type: Boolean,
      default: false
    },
    proofDocument: String
  }],
  trustScore: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1
  },
  totalResponses: {
    type: Number,
    default: 0
  },
  positiveRatings: {
    type: Number,
    default: 0
  },
  falseAlerts: {
    type: Number,
    default: 0
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  guardians: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isVulnerable: {
    type: Boolean,
    default: false
  },
  refreshToken: {
    type: String
  }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (this: UserDocument, candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function (this: UserDocument): string {
  return jwt.sign(
    { _id: this._id.toString(), email: this.email, role: this.role },
    process.env.ACCESS_TOKEN_SECRET || "access-token-secret",
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" } as SignOptions
  );
};

userSchema.methods.generateRefreshToken = function (this: UserDocument): string {
  return jwt.sign(
    { _id: this._id.toString() },
    process.env.REFRESH_TOKEN_SECRET || "refresh-token-secret",
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" } as SignOptions
  );
};

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
