import mongoose from 'mongoose';

export const TOURNAMENT_LINEUP_HISTORY_ACTIONS = Object.freeze([
  'lineup_created',
  'player_added_to_starting',
  'player_added_to_bench',
  'player_removed',
  'captain_changed',
  'goalkeeper_changed',
  'formation_changed',
  'lineup_submitted',
  'lineup_locked',
  'lineup_unlocked',
]);

const tournamentLineupHistorySchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    lineup: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentMatchdayLineup', required: true },
    action: { type: String, enum: TOURNAMENT_LINEUP_HISTORY_ACTIONS, required: true },
    actorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true, trim: true, maxlength: 40 },
    safeMessage: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true },
);

tournamentLineupHistorySchema.index({ tournament: 1, lineup: 1, createdAt: -1 });

tournamentLineupHistorySchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.actorUser;
    delete returned.metadata;
    return returned;
  },
});

const TournamentLineupHistory = mongoose.model('TournamentLineupHistory', tournamentLineupHistorySchema);

export default TournamentLineupHistory;
