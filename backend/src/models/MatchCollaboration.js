import mongoose from 'mongoose';

export const MATCH_COLLABORATION_STATUSES = Object.freeze([
  'pending',
  'accepted',
  'changes_requested',
  'rejected',
  'changes_rejected',
  'cancelled',
  'expired',
  're_verification_required',
]);

const changeRequestSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now },
    hostResponse: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    respondedAt: { type: Date, default: null },
  },
  { _id: false },
);

const matchCollaborationSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
    hostTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    opponentTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    status: { type: String, enum: MATCH_COLLABORATION_STATUSES, default: 'pending', index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 1000, default: '' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    hostDecisionReason: { type: String, trim: true, maxlength: 1000, default: '' },
    opponentStatsApplied: { type: Boolean, default: false },
    opponentStatsAppliedAt: { type: Date, default: null },
    verificationVersion: { type: Number, min: 1, default: 1 },
    expiresAt: { type: Date, default: null },
    changeRequests: { type: [changeRequestSchema], default: [] },
  },
  { timestamps: true },
);

matchCollaborationSchema.index({ opponentTeam: 1, status: 1, createdAt: -1 });
matchCollaborationSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    return returned;
  },
});

const MatchCollaboration = mongoose.model('MatchCollaboration', matchCollaborationSchema);
export default MatchCollaboration;
