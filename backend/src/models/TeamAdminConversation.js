import mongoose from 'mongoose';

const teamAdminConversationSchema = new mongoose.Schema(
  {
    participantTeams: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }],
      validate: {
        validator: (teams) => Array.isArray(teams) && teams.length === 2 && new Set(teams.map(String)).size === 2,
        message: 'A direct admin conversation must contain exactly two different teams.',
      },
      required: true,
    },
    conversationKey: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true },
);

teamAdminConversationSchema.index({ participantTeams: 1, updatedAt: -1 });
teamAdminConversationSchema.index({ lastMessageAt: -1 });

const TeamAdminConversation = mongoose.model('TeamAdminConversation', teamAdminConversationSchema);

export default TeamAdminConversation;
