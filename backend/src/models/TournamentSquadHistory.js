import mongoose from 'mongoose';

export const TOURNAMENT_SQUAD_HISTORY_ACTIONS = Object.freeze([
  'squad_created',
  'player_added',
  'player_removed',
  'player_updated',
  'captain_changed',
  'vice_captain_changed',
  'squad_submitted',
  'squad_approved',
  'squad_locked',
  'squad_unlocked',
  'squad_rejected',
]);

const tournamentSquadHistorySchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentParticipant', required: true, index: true },
  squad: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentSquad', required: true, index: true },
  action: { type: String, enum: TOURNAMENT_SQUAD_HISTORY_ACTIONS, required: true },
  actorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, enum: ['superAdmin', 'teamAdmin'], required: true },
  safeMessage: { type: String, trim: true, maxlength: 500, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

tournamentSquadHistorySchema.index({ squad: 1, createdAt: -1 });

tournamentSquadHistorySchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.actorUser;
    delete returned.metadata;
    return returned;
  },
});

const TournamentSquadHistory = mongoose.model('TournamentSquadHistory', tournamentSquadHistorySchema);

export default TournamentSquadHistory;
