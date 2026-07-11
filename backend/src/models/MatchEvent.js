import mongoose from 'mongoose';

export const EVENT_TYPES = Object.freeze([
  'goal', 'assist', 'yellow_card', 'red_card', 'substitution', 'penalty_scored',
  'penalty_missed', 'penalty_saved', 'own_goal',
]);
export const EVENT_PERIODS = Object.freeze(['first_half', 'second_half', 'extra_time_first', 'extra_time_second', 'penalties']);
export const SCORING_SIDES = Object.freeze(['team', 'opponent']);
export const PENALTY_OUTCOMES = Object.freeze(['scored', 'missed', 'saved']);

const compactSnapshotSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  name: { type: String, required: true, trim: true },
  jerseyNumber: { type: Number, default: null },
  position: { type: String, required: true },
}, { _id: false });

const ownGoalBySchema = new mongoose.Schema({
  side: { type: String, enum: ['team', 'opponent'], required: true },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  playerSnapshot: { type: compactSnapshotSchema, default: null },
  temporaryOpponentPlayerName: { type: String, trim: true, maxlength: 100, default: '' },
}, { _id: false });

const matchEventSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  sequence: { type: Number, required: true, min: 1 },
  type: { type: String, enum: EVENT_TYPES, required: true },
  period: { type: String, enum: EVENT_PERIODS, required: true },
  minute: { type: Number, min: 0, max: 150, required: true },
  stoppageMinute: { type: Number, min: 0, max: 30, default: null },
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  playerSnapshot: { type: compactSnapshotSchema, default: null },
  assistPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  assistPlayerSnapshot: { type: compactSnapshotSchema, default: null },
  playerIn: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  playerInSnapshot: { type: compactSnapshotSchema, default: null },
  playerOut: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  playerOutSnapshot: { type: compactSnapshotSchema, default: null },
  penaltyOutcome: { type: String, enum: PENALTY_OUTCOMES, default: null },
  ownGoalBy: { type: ownGoalBySchema, default: null },
  temporaryOpponentPlayerName: { type: String, trim: true, maxlength: 100, default: '' },
  scoringSide: { type: String, enum: SCORING_SIDES, default: null },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isUndone: { type: Boolean, default: false },
  undoneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  undoneAt: { type: Date, default: null },
  undoReason: { type: String, trim: true, maxlength: 300, default: '' },
}, { timestamps: true });

matchEventSchema.index({ match: 1, sequence: 1 }, { unique: true });
matchEventSchema.index({ match: 1, isUndone: 1, sequence: 1 });
matchEventSchema.index({ match: 1, type: 1 });
matchEventSchema.index({ player: 1 });
matchEventSchema.index({ assistPlayer: 1 });

matchEventSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    delete returned.undoneBy;
    return returned;
  },
});

const MatchEvent = mongoose.model('MatchEvent', matchEventSchema);
export default MatchEvent;
