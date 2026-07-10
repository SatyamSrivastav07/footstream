import mongoose from 'mongoose';

export const MATCH_TYPES = Object.freeze(['friendly', 'league', 'knockout', 'practice']);
export const TEAM_SIDES = Object.freeze(['home', 'away']);
export const MATCH_FORMATIONS = Object.freeze(['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2', 'custom']);
export const MATCH_STATUSES = Object.freeze(['scheduled', 'cancelled', 'completed']);

const temporaryPlayerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    position: { type: String, trim: true, maxlength: 40, default: '' },
    jerseyNumber: {
      type: Number,
      min: 1,
      max: 99,
      default: null,
      validate: { validator: (value) => value === null || Number.isInteger(value), message: 'Jersey number must be an integer.' },
    },
  },
  { _id: false },
);

const playerSnapshotSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    name: { type: String, required: true, trim: true },
    jerseyNumber: { type: Number, default: null },
    position: { type: String, required: true },
    photoUrl: { type: String, default: '' },
    isCaptain: { type: Boolean, default: false },
    isViceCaptain: { type: Boolean, default: false },
  },
  { _id: false },
);

const matchSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    opponent: {
      name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
      temporaryPlayers: { type: [temporaryPlayerSchema], default: [] },
    },
    tournament: { type: String, trim: true, maxlength: 160, default: '' },
    venue: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    matchType: { type: String, enum: MATCH_TYPES, required: true },
    teamSide: { type: String, enum: TEAM_SIDES, required: true },
    scheduledAt: { type: Date, required: true },
    formation: { type: String, enum: MATCH_FORMATIONS, default: null },
    customFormation: { type: String, trim: true, maxlength: 60, default: '' },
    status: { type: String, enum: MATCH_STATUSES, default: 'scheduled', required: true },
    startingXI: {
      type: [playerSnapshotSchema],
      required: true,
      validate: { validator: (value) => value.length === 11, message: 'Starting XI must contain exactly 11 players.' },
    },
    substitutes: { type: [playerSnapshotSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

matchSchema.pre('validate', function validateFormation() {
  if (this.formation === 'custom' && !this.customFormation?.trim()) {
    this.invalidate('customFormation', 'Custom formation is required when formation is custom.');
  }
  if (this.formation !== 'custom') this.customFormation = '';
});

matchSchema.index({ team: 1, scheduledAt: 1, isActive: 1 });
matchSchema.index({ team: 1, status: 1, scheduledAt: 1 });
matchSchema.index({ status: 1, scheduledAt: 1, isActive: 1 });
matchSchema.index({ 'opponent.name': 1, scheduledAt: 1 });

matchSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    delete returned.updatedBy;
    return returned;
  },
});

const Match = mongoose.model('Match', matchSchema);
export default Match;

