import mongoose from 'mongoose';

const matchPollVoteSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'MatchPoll', required: true, index: true },
    optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    guestSessionId: { type: String, required: true, trim: true, minlength: 10, maxlength: 80 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

matchPollVoteSchema.index({ poll: 1, guestSessionId: 1 }, { unique: true });
matchPollVoteSchema.index({ poll: 1, optionId: 1 });

matchPollVoteSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.guestSessionId;
    return returned;
  },
});

const MatchPollVote = mongoose.model('MatchPollVote', matchPollVoteSchema);
export default MatchPollVote;
