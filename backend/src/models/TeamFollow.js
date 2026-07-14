import mongoose from 'mongoose';

const preferenceSchema = new mongoose.Schema(
  {
    matchReminder: { type: Boolean, default: true },
    matchStarted: { type: Boolean, default: true },
    goal: { type: Boolean, default: true },
    halfTime: { type: Boolean, default: true },
    fullTime: { type: Boolean, default: true },
    resultPublished: { type: Boolean, default: true },
  },
  { _id: false },
);

const pushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, trim: true, maxlength: 2048, default: '' },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, trim: true, maxlength: 512, default: '' },
      auth: { type: String, trim: true, maxlength: 256, default: '' },
    },
  },
  { _id: false },
);

const teamFollowSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    followerSessionId: { type: String, required: true, trim: true, minlength: 10, maxlength: 80 },
    pushSubscription: { type: pushSubscriptionSchema, default: null },
    preferences: { type: preferenceSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true, index: true },
    followedAt: { type: Date, default: Date.now },
    unfollowedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

teamFollowSchema.index({ team: 1, followerSessionId: 1 }, { unique: true });
teamFollowSchema.index({ team: 1, isActive: 1 });

teamFollowSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.followerSessionId;
    delete returned.pushSubscription;
    return returned;
  },
});

const TeamFollow = mongoose.model('TeamFollow', teamFollowSchema);
export default TeamFollow;
