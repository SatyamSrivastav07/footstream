import mongoose from 'mongoose';

const matchAnnouncementSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    message: { type: String, required: true, trim: true, minlength: 1, maxlength: 240 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

matchAnnouncementSchema.index({ match: 1, isActive: 1 });

matchAnnouncementSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    return returned;
  },
});

const MatchAnnouncement = mongoose.model('MatchAnnouncement', matchAnnouncementSchema);
export default MatchAnnouncement;
