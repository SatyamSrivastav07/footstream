import mongoose from 'mongoose';
import { URL } from 'node:url';

export const PLAYER_POSITIONS = Object.freeze([
  'GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST',
]);

export const ACADEMIC_YEARS = Object.freeze([
  '1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni', 'Other',
]);

export const PREFERRED_FEET = Object.freeze(['Left', 'Right', 'Both']);
export const AVAILABILITY_STATUSES = Object.freeze(['available', 'injured', 'suspended', 'unavailable']);

const validHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const playerSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    name: {
      type: String,
      required: [true, 'Player name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    photoUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
      validate: { validator: validHttpUrl, message: 'Photo URL must use HTTP or HTTPS.' },
    },
    photo: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    position: { type: String, enum: PLAYER_POSITIONS, required: true },
    jerseyNumber: {
      type: Number,
      min: 1,
      max: 99,
      default: null,
      validate: { validator: (value) => value === null || Number.isInteger(value), message: 'Jersey number must be an integer.' },
    },
    age: {
      type: Number,
      min: 14,
      max: 60,
      default: null,
      validate: { validator: (value) => value === null || Number.isInteger(value), message: 'Age must be an integer.' },
    },
    academicYear: { type: String, enum: ACADEMIC_YEARS, default: null },
    preferredFoot: { type: String, enum: PREFERRED_FEET, default: null },
    availabilityStatus: {
      type: String,
      enum: AVAILABILITY_STATUSES,
      default: 'available',
      required: true,
    },
    isCaptain: { type: Boolean, default: false },
    isViceCaptain: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

playerSchema.pre('validate', function validateLeadership() {
  if (this.isCaptain && this.isViceCaptain) {
    this.invalidate('isViceCaptain', 'A player cannot be captain and vice-captain at the same time.');
  }
});

playerSchema.index({ team: 1, isActive: 1, position: 1, jerseyNumber: 1, name: 1 });
playerSchema.index({ team: 1, availabilityStatus: 1, isActive: 1 });
playerSchema.index(
  { team: 1, jerseyNumber: 1 },
  {
    name: 'unique_active_team_jersey',
    unique: true,
    partialFilterExpression: { isActive: true, jerseyNumber: { $type: 'number' } },
  },
);
playerSchema.index(
  { team: 1, isCaptain: 1 },
  {
    name: 'unique_active_team_captain',
    unique: true,
    partialFilterExpression: { isActive: true, isCaptain: true },
  },
);
playerSchema.index(
  { team: 1, isViceCaptain: 1 },
  {
    name: 'unique_active_team_vice_captain',
    unique: true,
    partialFilterExpression: { isActive: true, isViceCaptain: true },
  },
);

playerSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    delete returned.updatedBy;
    return returned;
  },
});

const Player = mongoose.model('Player', playerSchema);

export default Player;
