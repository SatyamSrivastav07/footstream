import mongoose from 'mongoose';
import { TEAM_ADMIN_CHAT_SCOPES } from './TeamAdminMessage.js';

const teamAdminChatReadStateSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scope: { type: String, enum: Object.values(TEAM_ADMIN_CHAT_SCOPES), required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamAdminConversation', default: null, index: true },
    lastReadAt: { type: Date, default: null },
  },
  { timestamps: true },
);

teamAdminChatReadStateSchema.index({ user: 1, scope: 1, conversation: 1 }, { unique: true });

const TeamAdminChatReadState = mongoose.model('TeamAdminChatReadState', teamAdminChatReadStateSchema);

export default TeamAdminChatReadState;
