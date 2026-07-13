import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = Object.freeze([
  'challenge_received',
  'challenge_accepted',
  'challenge_declined',
  'challenge_countered',
  'challenge_counter_accepted',
  'challenge_counter_rejected',
  'challenge_cancelled',
  'challenge_fixture_created',
  'join_request_received',
  'join_request_approved',
  'join_request_rejected',
]);

const notificationSchema = new mongoose.Schema({
  recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  title: { type: String, trim: true, maxlength: 160, required: true },
  message: { type: String, trim: true, maxlength: 500, required: true },
  entityType: { type: String, enum: ['challenge', 'match', 'joinRequest'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  actionUrl: { type: String, trim: true, maxlength: 300, required: true },
  dedupeKey: { type: String, trim: true, required: true },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ recipientUser: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ recipientUser: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
