import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);
export default PlatformSetting;
