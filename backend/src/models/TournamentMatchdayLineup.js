import mongoose from 'mongoose';
import { TOURNAMENT_LINEUP_STATUS, TOURNAMENT_PLAYER_SOURCE_TYPE } from '../constants/tournamentConstants.js';

const playerSnapshotSchema = new mongoose.Schema(
  {
    squadPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentSquadPlayer', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    position: { type: String, required: true, trim: true, maxlength: 40 },
    jersey: { type: Number, min: 1, max: 99, default: null },
    photoUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    sourceType: { type: String, enum: Object.values(TOURNAMENT_PLAYER_SOURCE_TYPE), required: true },
    slotId: { type: String, trim: true, maxlength: 20, default: '' },
    lineIndex: { type: Number, min: 0, max: 8, default: null },
    positionIndex: { type: Number, min: 0, max: 20, default: null },
    roleLabel: { type: String, trim: true, maxlength: 40, default: '' },
    x: { type: Number, min: 0, max: 1, default: null },
    y: { type: Number, min: 0, max: 1, default: null },
  },
  { _id: false },
);

const sideSchema = new mongoose.Schema(
  {
    formation: { type: String, trim: true, maxlength: 40, default: '' },
    customFormation: { type: String, trim: true, maxlength: 80, default: '' },
    startingPlayers: { type: [playerSnapshotSchema], default: [] },
    substitutes: { type: [playerSnapshotSchema], default: [] },
    captain: { type: playerSnapshotSchema, default: null },
    goalkeeper: { type: playerSnapshotSchema, default: null },
    submittedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
  },
  { _id: false },
);

const tournamentMatchdayLineupSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    provisionalFixtureKey: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    fixtureNumber: {
      type: Number,
      min: 1,
      default: null,
      validate: { validator: (value) => value === null || Number.isInteger(value), message: 'Fixture number must be an integer.' },
    },
    scheduledAt: { type: Date, default: null },
    venue: { type: String, trim: true, maxlength: 200, default: '' },
    officials: { type: String, trim: true, maxlength: 300, default: '' },
    stage: { type: String, trim: true, maxlength: 60, default: '' },
    round: { type: String, trim: true, maxlength: 80, default: '' },
    homeParticipant: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentParticipant', required: true },
    awayParticipant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TournamentParticipant',
      required: true,
      validate: {
        validator(value) {
          return String(value || '') !== String(this.homeParticipant || '');
        },
        message: 'Home and away participants must be different.',
      },
    },
    home: { type: sideSchema, default: () => ({}) },
    away: { type: sideSchema, default: () => ({}) },
    status: { type: String, enum: Object.values(TOURNAMENT_LINEUP_STATUS), default: TOURNAMENT_LINEUP_STATUS.DRAFT, required: true },
    matchCreated: { type: Boolean, default: false },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

tournamentMatchdayLineupSchema.index({ tournament: 1, provisionalFixtureKey: 1 }, { unique: true });
tournamentMatchdayLineupSchema.index({ tournament: 1, status: 1, updatedAt: -1 });
tournamentMatchdayLineupSchema.index({ tournament: 1, homeParticipant: 1, awayParticipant: 1 });

tournamentMatchdayLineupSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    delete returned.updatedBy;
    return returned;
  },
});

const TournamentMatchdayLineup = mongoose.model('TournamentMatchdayLineup', tournamentMatchdayLineupSchema);

export default TournamentMatchdayLineup;
