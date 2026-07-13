import mongoose from 'mongoose';

const pushDeliverySchema = new mongoose.Schema(
  {
    follow: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamFollow', required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null, index: true },
    eventType: { type: String, required: true, trim: true, maxlength: 80, index: true },
    eventKey: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'expired'], default: 'pending', index: true },
    errorCode: { type: String, trim: true, maxlength: 80, default: '' },
    sentAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

pushDeliverySchema.index({ follow: 1, eventKey: 1 }, { unique: true });

const PushDelivery = mongoose.model('PushDelivery', pushDeliverySchema);
export default PushDelivery;
