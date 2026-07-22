import mongoose from 'mongoose';

const trophyImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    width: { type: Number, min: 0, default: 0 },
    height: { type: Number, min: 0, default: 0 },
    format: { type: String, trim: true, default: '' },
    bytes: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const publicImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    width: { type: Number, min: 0, default: 0 },
    height: { type: Number, min: 0, default: 0 },
    format: { type: String, trim: true, default: '' },
    bytes: { type: Number, min: 0, default: 0 },
    caption: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false },
);

const winningRegisteredPlayerSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    name: { type: String, required: true, trim: true },
    position: { type: String, trim: true, default: '' },
    jerseyNumber: { type: Number, default: null },
    photoUrl: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const winningManualPlayerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    position: { type: String, trim: true, maxlength: 40, default: '' },
    jerseyNumber: { type: Number, default: null },
  },
  { _id: false },
);

const currentYear = new Date().getFullYear() + 1;

const teamAchievementSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    tournamentName: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    position: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    year: { type: Number, required: true, min: 1800, max: currentYear },
    category: { type: String, enum: ['inter_college', 'intra_college'], default: 'inter_college' },
    description: { type: String, trim: true, maxlength: 1200, default: '' },
    trophyImage: { type: trophyImageSchema, default: null },
    trophyImages: { type: [publicImageSchema], default: [] },
    celebrationPhotos: { type: [publicImageSchema], default: [] },
    certificateUrl: { type: String, trim: true, maxlength: 500, default: '' },
    matchReportLink: { type: String, trim: true, maxlength: 500, default: '' },
    winningSquad: {
      registeredPlayers: { type: [winningRegisteredPlayerSchema], default: [] },
      manualPlayers: { type: [winningManualPlayerSchema], default: [] },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

teamAchievementSchema.index({ team: 1, year: -1, createdAt: -1 });
teamAchievementSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    if (returned.trophyImage) delete returned.trophyImage.publicId;
    returned.trophyImages = (returned.trophyImages || []).map((image) => {
      const safe = { ...image };
      delete safe.publicId;
      return safe;
    });
    returned.celebrationPhotos = (returned.celebrationPhotos || []).map((image) => {
      const safe = { ...image };
      delete safe.publicId;
      return safe;
    });
    return returned;
  },
});

const TeamAchievement = mongoose.model('TeamAchievement', teamAchievementSchema);
export default TeamAchievement;
