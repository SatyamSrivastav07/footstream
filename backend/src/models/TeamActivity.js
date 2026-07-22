import mongoose from 'mongoose';

export const TEAM_ACTIVITY_TYPES = Object.freeze([
  'player_added',
  'formation_updated',
  'match_created',
  'match_completed',
  'gallery_post_added',
  'achievement_added',
  'collaboration_requested',
  'collaboration_accepted',
  'collaboration_changes_requested',
  'collaboration_rejected',
  'profile_updated',
]);

const teamActivitySchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: TEAM_ACTIVITY_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

teamActivitySchema.index({ team: 1, createdAt: -1 });

const TeamActivity = mongoose.model('TeamActivity', teamActivitySchema);
export default TeamActivity;
