import mongoose from 'mongoose';

export const TEAM_REGISTRATION_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);

const imageSchema = new mongoose.Schema({
  imageUrl: { type: String, trim: true, default: '' },
  publicId: { type: String, trim: true, default: '' },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  format: { type: String, trim: true, default: '' },
  bytes: { type: Number, default: 0 },
}, { _id: false });

const currentYear = new Date().getFullYear();

const teamRegistrationRequestSchema = new mongoose.Schema({
  requestCode: { type: String, required: true, unique: true, trim: true },
  status: { type: String, enum: TEAM_REGISTRATION_STATUSES, default: 'pending', index: true },
  teamName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  normalizedTeamName: { type: String, required: true, trim: true, lowercase: true, index: true },
  shortName: { type: String, trim: true, maxlength: 20, default: '' },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  state: { type: String, trim: true, maxlength: 100, default: '' },
  country: { type: String, required: true, trim: true, maxlength: 100 },
  foundedYear: { type: Number, min: 1800, max: currentYear, default: null },
  primaryColor: { type: String, trim: true, maxlength: 20, default: '' },
  secondaryColor: { type: String, trim: true, maxlength: 20, default: '' },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  instagramUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  websiteUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  representativeName: { type: String, required: true, trim: true, maxlength: 80 },
  roleInTeam: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, index: true },
  phone: { type: String, required: true, trim: true, maxlength: 20, index: true },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  logo: { type: imageSchema, default: null },
  cover: { type: imageSchema, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, trim: true, maxlength: 300, default: '' },
  createdTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  createdAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

teamRegistrationRequestSchema.index({ status: 1, createdAt: -1 });
teamRegistrationRequestSchema.index({ email: 1, status: 1 });
teamRegistrationRequestSchema.index({ phone: 1, status: 1 });
teamRegistrationRequestSchema.index({ normalizedTeamName: 1, status: 1 });

const TeamRegistrationRequest = mongoose.model('TeamRegistrationRequest', teamRegistrationRequestSchema);

export default TeamRegistrationRequest;
