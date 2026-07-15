import mongoose from 'mongoose';

export const TOURNAMENT_OFFICIAL_ROLES = Object.freeze([
  'referee',
  'assistant_referee',
  'fourth_official',
  'match_commissioner',
  'coordinator',
  'medical',
  'security',
  'other',
]);

const tournamentOfficialSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    role: { type: String, enum: TOURNAMENT_OFFICIAL_ROLES, required: true },
    association: { type: String, trim: true, maxlength: 160, default: '' },
  },
  { timestamps: true },
);

tournamentOfficialSchema.index({ tournament: 1, role: 1, name: 1 });

tournamentOfficialSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    return returned;
  },
});

const TournamentOfficial = mongoose.model('TournamentOfficial', tournamentOfficialSchema);

export default TournamentOfficial;
