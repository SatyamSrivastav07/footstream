import mongoose from 'mongoose';
import { TOURNAMENT_APPROVAL_STATUS } from '../constants/tournamentConstants.js';

export const TOURNAMENT_REVIEW_ACTIONS = Object.freeze([
  'created',
  'updated',
  'submitted',
  'resubmitted',
  'approved',
  'rejected',
  'changes_requested',
  'suspended',
  'unsuspended',
  'published',
  'unpublished',
  'archived',
  'participant_added',
  'participant_removed',
  'participant_status_changed',
]);

const tournamentReviewHistorySchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    action: { type: String, enum: TOURNAMENT_REVIEW_ACTIONS, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, enum: ['superAdmin', 'teamAdmin'], required: true },
    previousStatus: { type: String, enum: Object.values(TOURNAMENT_APPROVAL_STATUS), default: null },
    nextStatus: { type: String, enum: Object.values(TOURNAMENT_APPROVAL_STATUS), required: true },
    message: { type: String, trim: true, maxlength: 3000, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

tournamentReviewHistorySchema.index({ tournament: 1, createdAt: -1 });
tournamentReviewHistorySchema.index({ actor: 1, createdAt: -1 });
tournamentReviewHistorySchema.index({ action: 1, createdAt: -1 });

tournamentReviewHistorySchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.actor;
    delete returned.metadata;
    return returned;
  },
});

const TournamentReviewHistory = mongoose.model('TournamentReviewHistory', tournamentReviewHistorySchema);

export default TournamentReviewHistory;
