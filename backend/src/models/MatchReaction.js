import mongoose from 'mongoose';

export const REACTION_TYPES = ['like', 'heart', 'fire', 'clap', 'wow'];

const matchReactionSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    guestSessionId: { type: String, required: true, trim: true, minlength: 10, maxlength: 80 },
    reactionType: { type: String, enum: REACTION_TYPES, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

matchReactionSchema.index({ match: 1, guestSessionId: 1, reactionType: 1 }, { unique: true });
matchReactionSchema.index({ match: 1, reactionType: 1 });

matchReactionSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.guestSessionId;
    return returned;
  },
});

const MatchReaction = mongoose.model('MatchReaction', matchReactionSchema);
export default MatchReaction;
