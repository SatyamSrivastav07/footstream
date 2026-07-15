import mongoose from 'mongoose';
import { URL } from 'node:url';
import { TOURNAMENT_PLAYER_SOURCE_TYPE } from '../constants/tournamentConstants.js';
import { PLAYER_POSITIONS } from './Player.js';

const validHttpUrl = (value) => {
  if (!value) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const imageAssetSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, maxlength: 2048, default: '', validate: { validator: validHttpUrl, message: 'Image URL must use HTTP or HTTPS.' } },
    publicId: { type: String, trim: true, maxlength: 300, default: '' },
    width: { type: Number, min: 1, default: null },
    height: { type: Number, min: 1, default: null },
    format: { type: String, trim: true, maxlength: 20, default: '' },
    bytes: { type: Number, min: 0, default: null },
  },
  { _id: false },
);

const normalizeName = (value = '') => value.trim().toLowerCase().replace(/\s+/g, ' ');

const tournamentSquadPlayerSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentParticipant', required: true },
    squad: { type: mongoose.Schema.Types.ObjectId, ref: 'TournamentSquad', required: true },
    sourceType: { type: String, enum: Object.values(TOURNAMENT_PLAYER_SOURCE_TYPE), required: true },
    registeredPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    normalizedName: { type: String, required: true, trim: true, lowercase: true, maxlength: 140 },
    position: { type: String, enum: PLAYER_POSITIONS, required: true },
    jersey: {
      type: Number,
      min: 1,
      max: 99,
      default: null,
      validate: { validator: (value) => value === null || Number.isInteger(value), message: 'Jersey must be an integer.' },
    },
    photo: { type: imageAssetSchema, default: () => ({}) },
    captain: { type: Boolean, default: false },
    viceCaptain: { type: Boolean, default: false },
    goalkeeper: { type: Boolean, default: false },
  },
  { timestamps: true },
);

tournamentSquadPlayerSchema.pre('validate', function validateTournamentSquadPlayer() {
  this.normalizedName = normalizeName(this.name);
  if (this.sourceType === TOURNAMENT_PLAYER_SOURCE_TYPE.REGISTERED_PLAYER && !this.registeredPlayer) {
    this.invalidate('registeredPlayer', 'Registered squad players require a Player reference.');
  }
  if (this.sourceType === TOURNAMENT_PLAYER_SOURCE_TYPE.MANUAL_PLAYER && this.registeredPlayer) {
    this.invalidate('registeredPlayer', 'Manual tournament players cannot reference a permanent Player.');
  }
  if (this.captain && this.viceCaptain) {
    this.invalidate('viceCaptain', 'A tournament player cannot be captain and vice-captain.');
  }
});

tournamentSquadPlayerSchema.index({ tournament: 1, participant: 1, squad: 1 });
tournamentSquadPlayerSchema.index({ squad: 1, registeredPlayer: 1 }, {
  unique: true,
  partialFilterExpression: { registeredPlayer: { $type: 'objectId' } },
});
tournamentSquadPlayerSchema.index({ squad: 1, normalizedName: 1 }, { unique: true });
tournamentSquadPlayerSchema.index({ squad: 1, jersey: 1 }, {
  unique: true,
  partialFilterExpression: { jersey: { $type: 'number' } },
});
tournamentSquadPlayerSchema.index({ squad: 1, captain: 1 }, {
  unique: true,
  partialFilterExpression: { captain: true },
});
tournamentSquadPlayerSchema.index({ squad: 1, viceCaptain: 1 }, {
  unique: true,
  partialFilterExpression: { viceCaptain: true },
});

tournamentSquadPlayerSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    if (returned.photo) delete returned.photo.publicId;
    return returned;
  },
});

const TournamentSquadPlayer = mongoose.model('TournamentSquadPlayer', tournamentSquadPlayerSchema);

export default TournamentSquadPlayer;
