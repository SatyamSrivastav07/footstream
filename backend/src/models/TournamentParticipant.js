import mongoose from 'mongoose';
import { URL } from 'node:url';
import {
  TOURNAMENT_PARTICIPANT_TYPE,
  TOURNAMENT_PARTICIPATION_STATUS,
  isParticipantTypeAllowedForScope,
} from '../constants/tournamentConstants.js';
import { slugify } from '../utils/slugify.js';

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

const tournamentParticipantSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    tournamentScope: { type: String, required: true },
    participantType: { type: String, enum: Object.values(TOURNAMENT_PARTICIPANT_TYPE), required: true },
    registeredTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    normalizedName: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    shortName: { type: String, trim: true, maxlength: 32, default: '' },
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 180 },
    logo: { type: imageAssetSchema, default: () => ({}) },
    primaryColor: { type: String, trim: true, maxlength: 32, default: '' },
    secondaryColor: { type: String, trim: true, maxlength: 32, default: '' },
    captainName: { type: String, trim: true, maxlength: 120, default: '' },
    managerName: { type: String, trim: true, maxlength: 120, default: '' },
    coachName: { type: String, trim: true, maxlength: 120, default: '' },
    seed: {
      type: Number,
      min: 1,
      default: null,
      validate: { validator: (value) => value === null || Number.isInteger(value), message: 'Seed must be an integer.' },
    },
    status: { type: String, enum: Object.values(TOURNAMENT_PARTICIPATION_STATUS), default: TOURNAMENT_PARTICIPATION_STATUS.PENDING, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

tournamentParticipantSchema.pre('validate', function validateTournamentParticipant() {
  this.normalizedName = normalizeName(this.displayName);
  if (!this.slug && this.displayName) this.slug = slugify(this.displayName);
  if (!isParticipantTypeAllowedForScope(this.tournamentScope, this.participantType)) {
    this.invalidate('participantType', 'Participant type is not allowed for this tournament scope.');
  }
  if (this.participantType === TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM && !this.registeredTeam) {
    this.invalidate('registeredTeam', 'Registered team participants require a Team reference.');
  }
  if (this.participantType !== TOURNAMENT_PARTICIPANT_TYPE.REGISTERED_TEAM && this.registeredTeam) {
    this.invalidate('registeredTeam', 'Manual tournament participants cannot reference a permanent Team.');
  }
});

tournamentParticipantSchema.index({ tournament: 1, registeredTeam: 1 }, {
  unique: true,
  partialFilterExpression: { registeredTeam: { $type: 'objectId' } },
});
tournamentParticipantSchema.index({ tournament: 1, normalizedName: 1 }, { unique: true });
tournamentParticipantSchema.index({ tournament: 1, slug: 1 }, { unique: true });
tournamentParticipantSchema.index({ tournament: 1, status: 1, seed: 1 });

tournamentParticipantSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.addedBy;
    if (returned.logo) delete returned.logo.publicId;
    return returned;
  },
});

const TournamentParticipant = mongoose.model('TournamentParticipant', tournamentParticipantSchema);

export default TournamentParticipant;
