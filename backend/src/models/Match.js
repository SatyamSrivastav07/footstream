import mongoose from 'mongoose';

export const MATCH_TYPES = Object.freeze(['friendly', 'league', 'knockout', 'practice']);
export const MATCH_FORMATS = Object.freeze(['5v5', '7v7', '11v11']);
export const TEAM_SIDES = Object.freeze(['home', 'away']);
export const MATCH_FORMATIONS = Object.freeze(['1-2-1', '2-1-1', '1-1-2', '2-3-1', '3-2-1', '2-2-2', '4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2', 'custom']);
export const MATCH_STATUSES = Object.freeze(['scheduled', 'live', 'half_time', 'completed', 'cancelled']);
export const MATCH_PERIODS = Object.freeze([
  'not_started', 'first_half', 'half_time', 'second_half', 'extra_time_first',
  'extra_time_break', 'extra_time_second', 'penalties', 'full_time',
]);

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

const resultSchema = new mongoose.Schema({
  outcome: { type: String, enum: ['win', 'draw', 'loss'], required: true },
  winnerSide: { type: String, enum: ['team', 'opponent', 'draw'], required: true },
  finalTeamScore: { type: Number, min: 0, required: true },
  finalOpponentScore: { type: Number, min: 0, required: true },
}, { _id: false });

const manOfTheMatchSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  name: { type: String, required: true, trim: true },
  jerseyNumber: { type: Number, default: null },
  position: { type: String, required: true },
  photoUrl: { type: String, default: '' },
}, { _id: false });

const streamSchema = new mongoose.Schema({
  provider: { type: String, enum: ['youtube'], default: 'youtube', required: true },
  sourceUrl: { type: String, trim: true, required: true },
  videoId: { type: String, trim: true, required: true },
  embedUrl: { type: String, trim: true, required: true },
  isEnabled: { type: Boolean, default: false },
  title: { type: String, trim: true, maxlength: 160, default: '' },
  scheduledLiveAt: { type: Date, default: null },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  addedAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
}, { _id: false });

const matchSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    registeredOpponentTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    opponent: {
      name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
      temporaryPlayers: { type: [temporaryPlayerSchema], default: [] },
    },
    tournament: { type: String, trim: true, maxlength: 160, default: '' },
    venue: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    matchType: { type: String, enum: MATCH_TYPES, required: true },
    matchFormat: { type: String, enum: MATCH_FORMATS, default: '11v11', required: true },
    teamSide: { type: String, enum: TEAM_SIDES, required: true },
    scheduledAt: { type: Date, required: true },
    formation: { type: String, enum: MATCH_FORMATIONS, default: null },
    customFormation: { type: String, trim: true, maxlength: 60, default: '' },
    status: { type: String, enum: MATCH_STATUSES, default: 'scheduled', required: true },
    homeScore: { type: Number, min: 0, default: 0 },
    awayScore: { type: Number, min: 0, default: 0 },
    currentPeriod: { type: String, enum: MATCH_PERIODS, default: 'not_started', required: true },
    startedAt: { type: Date, default: null },
    firstHalfEndedAt: { type: Date, default: null },
    secondHalfStartedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    liveMinute: { type: Number, min: 0, max: 150, default: 0 },
    timerAnchorAt: { type: Date, default: null },
    timerBaseSeconds: { type: Number, min: 0, default: 0 },
    lastEventSequence: { type: Number, min: 0, default: 0 },
    startingXI: {
      type: [playerSnapshotSchema],
      required: true,
      validate: {
        validator(value) {
          const required = this.matchFormat === '5v5' ? 5 : this.matchFormat === '7v7' ? 7 : 11;
          return this.sourceChallenge ? value.length === 0 || value.length === required : value.length === required;
        },
        message: 'Starting lineup does not match the match format.',
      },
    },
    substitutes: { type: [playerSnapshotSchema], default: [] },
    registeredOpponentFormation: { type: String, enum: MATCH_FORMATIONS, default: null },
    registeredOpponentCustomFormation: { type: String, trim: true, maxlength: 60, default: '' },
    registeredOpponentStartingXI: {
      type: [playerSnapshotSchema],
      default: [],
      validate: {
        validator(value) {
          if (!this.registeredOpponentTeam) return value.length === 0;
          const required = this.matchFormat === '5v5' ? 5 : this.matchFormat === '7v7' ? 7 : 11;
          return value.length === 0 || value.length === required;
        },
        message: 'Registered opponent lineup does not match the match format.',
      },
    },
    registeredOpponentSubstitutes: { type: [playerSnapshotSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    result: { type: resultSchema, default: null },
    manOfTheMatch: { type: manOfTheMatchSchema, default: null },
    completionNotes: { type: String, trim: true, maxlength: 2000, default: '' },
    attendance: { type: Number, min: 0, default: null },
    resultConfirmedAt: { type: Date, default: null },
    resultConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    stream: { type: streamSchema, default: null },
    sourceChallenge: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamChallenge', default: null },
  },
  { timestamps: true },
);

matchSchema.pre('validate', function validateFormation() {
  const compatible = {
    '5v5': ['1-2-1', '2-1-1', '1-1-2'],
    '7v7': ['2-3-1', '3-2-1', '2-2-2'],
    '11v11': ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2', 'custom'],
  };
  if (this.formation && !compatible[this.matchFormat]?.includes(this.formation)) {
    this.invalidate('formation', `Formation is not compatible with ${this.matchFormat}.`);
  }
  if (this.formation === 'custom' && !this.customFormation?.trim()) {
    this.invalidate('customFormation', 'Custom formation is required when formation is custom.');
  }
  if (this.formation !== 'custom') this.customFormation = '';
  if (this.registeredOpponentFormation && !compatible[this.matchFormat]?.includes(this.registeredOpponentFormation)) {
    this.invalidate('registeredOpponentFormation', `Formation is not compatible with ${this.matchFormat}.`);
  }
  if (this.registeredOpponentFormation === 'custom' && !this.registeredOpponentCustomFormation?.trim()) {
    this.invalidate('registeredOpponentCustomFormation', 'Custom formation is required when formation is custom.');
  }
  if (this.registeredOpponentFormation !== 'custom') this.registeredOpponentCustomFormation = '';
});

matchSchema.index({ team: 1, scheduledAt: 1, isActive: 1 });
matchSchema.index({ team: 1, status: 1, scheduledAt: 1 });
matchSchema.index({ registeredOpponentTeam: 1, scheduledAt: 1, isActive: 1 });
matchSchema.index({ registeredOpponentTeam: 1, status: 1, scheduledAt: 1 });
matchSchema.index({ status: 1, scheduledAt: 1, isActive: 1 });
matchSchema.index({ 'opponent.name': 1, scheduledAt: 1 });
matchSchema.index({ tournament: 1, status: 1, isActive: 1, scheduledAt: -1 });
matchSchema.index({ 'stream.videoId': 1 }, { sparse: true });
matchSchema.index({ sourceChallenge: 1 }, { unique: true, sparse: true });

matchSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    delete returned.updatedBy;
    delete returned.resultConfirmedBy;
    if (returned.stream) {
      delete returned.stream.addedBy;
      delete returned.stream.sourceUrl;
    }
    return returned;
  },
});

const Match = mongoose.model('Match', matchSchema);
export default Match;

