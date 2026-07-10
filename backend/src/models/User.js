import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_ROLES = Object.freeze({
  SUPER_ADMIN: 'superAdmin',
  TEAM_ADMIN: 'teamAdmin',
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 10,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ team: 1, role: 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.password;
    delete returned.__v;
    return returned;
  },
});

const User = mongoose.model('User', userSchema);

export default User;

