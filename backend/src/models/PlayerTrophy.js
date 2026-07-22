import mongoose from 'mongoose';

const publicImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, default: '' },
    caption: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false },
);

const playerTrophySchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamAchievement', required: true, index: true },
    tournamentName: { type: String, required: true, trim: true, maxlength: 160 },
    position: { type: String, required: true, trim: true, maxlength: 80 },
    year: { type: Number, required: true, min: 1800 },
    category: { type: String, enum: ['inter_college', 'intra_college'], default: 'inter_college' },
    teamName: { type: String, trim: true, default: '' },
    teamSlug: { type: String, trim: true, default: '' },
    teamLogo: { type: String, trim: true, default: '' },
    trophyImages: { type: [publicImageSchema], default: [] },
    celebrationPhotos: { type: [publicImageSchema], default: [] },
    description: { type: String, trim: true, maxlength: 1200, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

playerTrophySchema.index({ player: 1, achievement: 1 }, { unique: true });
playerTrophySchema.index({ player: 1, year: -1, createdAt: -1 });
playerTrophySchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    return returned;
  },
});

const PlayerTrophy = mongoose.model('PlayerTrophy', playerTrophySchema);
export default PlayerTrophy;
