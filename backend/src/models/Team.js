import mongoose from 'mongoose';
import { URL } from 'node:url';

const validHttpUrl = (value) => {
  if (!value) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const publicUrl = () => ({ type: String, trim: true, maxlength: 2048, default: '', validate: { validator: validHttpUrl, message: 'Public links must use HTTP or HTTPS.' } });
const currentYear = new Date().getFullYear();

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    logo: { type: mongoose.Schema.Types.Mixed, default: '' },
    coverPhoto: { type: mongoose.Schema.Types.Mixed, default: '' },
    shortName: { type: String, trim: true, maxlength: 20, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    city: { type: String, trim: true, maxlength: 100, default: '' },
    coach: { type: String, trim: true, maxlength: 100, default: '' },
    homeGround: { type: String, trim: true, maxlength: 160, default: '' },
    founded: { type: Number, min: 1800, max: currentYear, default: null },
    socialLinks: {
      website: publicUrl(),
      instagram: publicUrl(),
      facebook: publicUrl(),
      x: publicUrl(),
      youtube: publicUrl(),
    },
    isPublished: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

teamSchema.index({ name: 1 });
teamSchema.index({ isArchived: 1, createdAt: -1 });
teamSchema.index({ isPublished: 1, isArchived: 1, name: 1 });
teamSchema.index({ isPublished: 1, isArchived: 1, city: 1 });

const Team = mongoose.model('Team', teamSchema);

export default Team;
