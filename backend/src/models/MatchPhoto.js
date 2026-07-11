import mongoose from 'mongoose';

export const PHOTO_CATEGORIES = Object.freeze(['team', 'action', 'celebration', 'man_of_the_match', 'result', 'other']);

const matchPhotoSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  imageUrl: { type: String, required: true, trim: true },
  publicId: { type: String, required: true, trim: true, unique: true },
  originalName: { type: String, required: true, trim: true, maxlength: 255 },
  width: { type: Number, min: 0, default: 0 },
  height: { type: Number, min: 0, default: 0 },
  bytes: { type: Number, min: 0, default: 0 },
  format: { type: String, trim: true, maxlength: 20, default: '' },
  caption: { type: String, trim: true, maxlength: 500, default: '' },
  category: { type: String, enum: PHOTO_CATEGORIES, default: 'other' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

matchPhotoSchema.index({ match: 1, isActive: 1 });
matchPhotoSchema.index({ team: 1, isActive: 1 });
matchPhotoSchema.index({ category: 1 });
matchPhotoSchema.index({ createdAt: -1 });
matchPhotoSchema.set('toJSON', { transform: (_doc, value) => { delete value.__v; delete value.uploadedBy; delete value.publicId; return value; } });

export default mongoose.model('MatchPhoto', matchPhotoSchema);
