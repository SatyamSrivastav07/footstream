import mongoose from 'mongoose';

const matchChatMessageSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    guestSessionId: { type: String, required: true, trim: true, minlength: 10, maxlength: 80 },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 30 },
    message: { type: String, required: true, trim: true, minlength: 1, maxlength: 300 },
    status: { type: String, enum: ['visible', 'deleted', 'hidden'], default: 'visible', required: true },
    visible: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

matchChatMessageSchema.index({ match: 1, createdAt: -1 });
matchChatMessageSchema.index({ match: 1, status: 1 });
matchChatMessageSchema.index({ guestSessionId: 1, createdAt: -1 });

matchChatMessageSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.guestSessionId;
    delete returned.deletedBy;
    return returned;
  },
});

const MatchChatMessage = mongoose.model('MatchChatMessage', matchChatMessageSchema);
export default MatchChatMessage;
