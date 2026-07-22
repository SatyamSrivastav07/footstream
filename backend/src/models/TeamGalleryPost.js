import mongoose from 'mongoose';

export const TEAM_GALLERY_CATEGORIES = Object.freeze([
  'match_day',
  'practice',
  'tournament',
  'celebration',
  'training_camp',
  'general_post',
]);

const galleryImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    width: { type: Number, min: 0, default: 0 },
    height: { type: Number, min: 0, default: 0 },
    format: { type: String, trim: true, default: '' },
    bytes: { type: Number, min: 0, default: 0 },
    originalName: { type: String, trim: true, maxlength: 255, default: '' },
  },
  { _id: false },
);

const teamGalleryPostSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    caption: { type: String, trim: true, maxlength: 1000, default: '' },
    category: { type: String, enum: TEAM_GALLERY_CATEGORIES, default: 'general_post' },
    images: { type: [galleryImageSchema], required: true, validate: { validator: (value) => value.length > 0 && value.length <= 6, message: 'Add between 1 and 6 images.' } },
    visibility: { type: String, enum: ['public'], default: 'public' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

teamGalleryPostSchema.index({ team: 1, isActive: 1, createdAt: -1 });
teamGalleryPostSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.postedBy;
    returned.images = (returned.images || []).map(({ publicId: _publicId, ...image }) => image);
    return returned;
  },
});

const TeamGalleryPost = mongoose.model('TeamGalleryPost', teamGalleryPostSchema);
export default TeamGalleryPost;
