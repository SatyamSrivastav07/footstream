import mongoose from 'mongoose';
import { URL } from 'node:url';
import { ACADEMIC_YEARS, PLAYER_POSITIONS, PREFERRED_FEET, AVAILABILITY_STATUSES } from './Player.js';

export const JOIN_REQUEST_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);

const validHttpUrl = (value) => {
  if (!value) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const imageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  format: { type: String, default: '' },
  bytes: { type: Number, default: 0 },
}, { _id: false });

const approvalDataSchema = new mongoose.Schema({
  jerseyNumber: { type: Number, min: 1, max: 99, required: true },
  availabilityStatus: { type: String, enum: AVAILABILITY_STATUSES, default: 'available' },
  isCaptain: { type: Boolean, default: false },
  isViceCaptain: { type: Boolean, default: false },
}, { _id: false });

const teamJoinRequestSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  applicantName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  photo: { type: imageSchema, default: null },
  position: { type: String, enum: PLAYER_POSITIONS, required: true },
  age: { type: Number, min: 14, max: 60, default: null },
  academicYear: { type: String, enum: ACADEMIC_YEARS, default: null },
  preferredFoot: { type: String, enum: PREFERRED_FEET, default: null },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 24 },
  shortBio: { type: String, trim: true, maxlength: 500, default: '' },
  previousExperience: { type: String, trim: true, maxlength: 1000, default: '' },
  motivation: { type: String, trim: true, maxlength: 1000, default: '' },
  highlightsUrl: { type: String, trim: true, maxlength: 2048, default: '', validate: { validator: validHttpUrl, message: 'Highlights URL must use HTTP or HTTPS.' } },
  status: { type: String, enum: JOIN_REQUEST_STATUSES, default: 'pending', required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
  approvalData: { type: approvalDataSchema, default: null },
  createdPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  requestCode: { type: String, required: true, unique: true, index: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

teamJoinRequestSchema.index({ team: 1, status: 1, createdAt: -1 });
teamJoinRequestSchema.index({ team: 1, email: 1, status: 1 });
teamJoinRequestSchema.index({ team: 1, phone: 1, status: 1 });

const TeamJoinRequest = mongoose.model('TeamJoinRequest', teamJoinRequestSchema);

export default TeamJoinRequest;
