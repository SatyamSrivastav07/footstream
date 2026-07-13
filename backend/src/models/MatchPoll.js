import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  },
  { _id: true },
);

const matchPollSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    question: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    options: {
      type: [pollOptionSchema],
      validate: {
        validator: (options) => options.length >= 2 && options.length <= 6,
        message: 'Polls must include 2 to 6 options.',
      },
    },
    status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    openedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

matchPollSchema.index({ match: 1, status: 1, isDeleted: 1 });

matchPollSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    return returned;
  },
});

const MatchPoll = mongoose.model('MatchPoll', matchPollSchema);
export default MatchPoll;
