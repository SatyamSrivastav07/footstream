import mongoose from 'mongoose';

export const CHALLENGE_MATCH_TYPES = Object.freeze(['Friendly', 'Practice', 'League']);
export const CHALLENGE_SQUAD_SIZES = Object.freeze(['5v5', '7v7', '11v11']);
export const CHALLENGE_STATUSES = Object.freeze(['pending', 'countered', 'accepted', 'declined', 'cancelled', 'completed']);
export const CHALLENGE_HISTORY_ACTIONS = Object.freeze([
  'created', 'countered', 'counter-accepted', 'counter-rejected', 'accepted',
  'declined', 'cancelled', 'fixture-created', 'completed',
]);

const challengeSnapshotSchema = new mongoose.Schema({
  venue: { type: String, trim: true, maxlength: 200, default: '' },
  proposedDate: { type: Date, default: null },
  proposedTime: { type: String, trim: true, default: '' },
  matchType: { type: String, enum: CHALLENGE_MATCH_TYPES, default: 'Friendly' },
  squadSize: { type: String, enum: CHALLENGE_SQUAD_SIZES, default: '11v11' },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
}, { _id: false });

const counterProposalSchema = new mongoose.Schema({
  proposedByTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  venue: { type: String, trim: true, minlength: 2, maxlength: 160, required: true },
  proposedDate: { type: Date, required: true },
  proposedTime: { type: String, trim: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  createdAt: { type: Date, required: true },
}, { _id: false });

const challengeHistorySchema = new mongoose.Schema({
  action: { type: String, enum: CHALLENGE_HISTORY_ACTIONS, required: true },
  actorTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  actorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  previousStatus: { type: String, enum: CHALLENGE_STATUSES, default: null },
  nextStatus: { type: String, enum: CHALLENGE_STATUSES, default: null },
  snapshot: { type: challengeSnapshotSchema, default: null },
  createdAt: { type: Date, required: true },
}, { _id: false });

const teamChallengeSchema = new mongoose.Schema(
  {
    challengerTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    challengedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    matchType: { type: String, enum: CHALLENGE_MATCH_TYPES, required: true },
    squadSize: { type: String, enum: CHALLENGE_SQUAD_SIZES, required: true },
    venue: { type: String, trim: true, minlength: 2, maxlength: 160, required: true },
    proposedDate: { type: Date, required: true },
    proposedTime: { type: String, trim: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: CHALLENGE_STATUSES, default: 'pending', index: true },
    counterProposal: { type: counterProposalSchema, default: null },
    acceptedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    createdMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    history: { type: [challengeHistorySchema], default: [] },
  },
  { timestamps: true },
);

teamChallengeSchema.index({ challengerTeam: 1, challengedTeam: 1, status: 1, proposedDate: 1 });
teamChallengeSchema.index({ challengedTeam: 1, status: 1, createdAt: -1 });
teamChallengeSchema.index({ challengerTeam: 1, status: 1, createdAt: -1 });

const TeamChallenge = mongoose.model('TeamChallenge', teamChallengeSchema);

export default TeamChallenge;
