import mongoose from 'mongoose';

export const CHALLENGE_MATCH_TYPES = Object.freeze(['Friendly', 'Practice', 'League']);
export const CHALLENGE_SQUAD_SIZES = Object.freeze(['5v5', '7v7', '11v11']);
export const CHALLENGE_STATUSES = Object.freeze(['Pending', 'Accepted', 'Declined', 'Cancelled']);

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
    status: { type: String, enum: CHALLENGE_STATUSES, default: 'Pending', index: true },
  },
  { timestamps: true },
);

teamChallengeSchema.index({ challengerTeam: 1, challengedTeam: 1, status: 1, proposedDate: 1 });
teamChallengeSchema.index({ challengedTeam: 1, status: 1, createdAt: -1 });
teamChallengeSchema.index({ challengerTeam: 1, status: 1, createdAt: -1 });

const TeamChallenge = mongoose.model('TeamChallenge', teamChallengeSchema);

export default TeamChallenge;
