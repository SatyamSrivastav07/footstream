import mongoose from 'mongoose';
import { TOURNAMENT_SQUAD_STATUS } from '../constants/tournamentConstants.js';

const tournamentSquadSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentParticipant', required: true },
    status: { type: String, enum: Object.values(TOURNAMENT_SQUAD_STATUS), default: TOURNAMENT_SQUAD_STATUS.DRAFT, required: true },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentSquadPlayer', default: null },
    viceCaptain: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentSquadPlayer', default: null },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

tournamentSquadSchema.pre('validate', function validateTournamentSquad() {
  if (this.captain && this.viceCaptain && String(this.captain) === String(this.viceCaptain)) {
    this.invalidate('viceCaptain', 'Captain and vice-captain must be different players.');
  }
  if (this.lockedAt && !this.approvedAt) this.invalidate('lockedAt', 'Squad cannot be locked before approval.');
});

tournamentSquadSchema.index({ tournament: 1, participant: 1 }, { unique: true });
tournamentSquadSchema.index({ tournament: 1, status: 1 });

tournamentSquadSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    return returned;
  },
});

const TournamentSquad = mongoose.model('TournamentSquad', tournamentSquadSchema);

export default TournamentSquad;
