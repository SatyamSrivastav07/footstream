import mongoose from 'mongoose';

export const TEAM_ADMIN_CHAT_SCOPES = Object.freeze({
  COMMUNITY: 'community',
  DIRECT: 'direct',
});

const teamAdminMessageSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: Object.values(TEAM_ADMIN_CHAT_SCOPES), required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamAdminConversation', default: null, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderNameSnapshot: { type: String, trim: true, maxlength: 100, default: 'Team admin' },
    senderTeamNameSnapshot: { type: String, trim: true, maxlength: 100, default: 'Team' },
    message: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
    visible: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

teamAdminMessageSchema.index({ scope: 1, createdAt: -1 });
teamAdminMessageSchema.index({ conversation: 1, createdAt: -1 });
teamAdminMessageSchema.index({ visible: 1, deletedAt: 1 });

teamAdminMessageSchema.pre('validate', function validateConversationScope(next) {
  if (this.scope === TEAM_ADMIN_CHAT_SCOPES.DIRECT && !this.conversation) {
    this.invalidate('conversation', 'Direct admin chat messages require a conversation.');
  }
  if (this.scope === TEAM_ADMIN_CHAT_SCOPES.COMMUNITY && this.conversation) {
    this.invalidate('conversation', 'Community admin chat messages cannot belong to a direct conversation.');
  }
  next();
});

teamAdminMessageSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    return returned;
  },
});

const TeamAdminMessage = mongoose.model('TeamAdminMessage', teamAdminMessageSchema);

export default TeamAdminMessage;
