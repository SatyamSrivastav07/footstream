import mongoose from 'mongoose';

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
    logo: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    isPublished: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

teamSchema.index({ name: 1 });
teamSchema.index({ isArchived: 1, createdAt: -1 });

const Team = mongoose.model('Team', teamSchema);

export default Team;

