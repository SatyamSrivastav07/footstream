import mongoose from 'mongoose';
import { URL } from 'node:url';
import {
  DEFAULT_TOURNAMENT_CONFIGURATION,
  GROUP_ALLOCATION_MODE,
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_AWARD_IDENTIFIER,
  TOURNAMENT_COMPETITION_FORMAT,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_MATCH_FORMAT_LABEL,
  TOURNAMENT_PLAYERS_ON_FIELD,
  TOURNAMENT_SCOPE,
  TOURNAMENT_TIEBREAK_TYPE,
  TOURNAMENT_VISIBILITY,
  isValidPlayersOnField,
  starterCountForTournament,
} from '../constants/tournamentConstants.js';

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    address: { type: String, trim: true, maxlength: 240, default: '' },
    city: { type: String, trim: true, maxlength: 100, default: '' },
  },
  { _id: false },
);

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    shortName: { type: String, trim: true, maxlength: 32, default: '' },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 180,
      match: [slugPattern, 'Tournament slug must be lowercase kebab-case.'],
    },
    seriesName: { type: String, trim: true, maxlength: 160, default: '' },
    seriesSlug: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 180,
      default: '',
      validate: { validator: (value) => !value || slugPattern.test(value), message: 'Series slug must be lowercase kebab-case.' },
    },
    seasonLabel: { type: String, trim: true, maxlength: 80, default: '' },
    editionNumber: {
      type: Number,
      min: 1,
      default: null,
      validate: { validator: (value) => value === null || Number.isInteger(value), message: 'Edition number must be an integer.' },
    },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    scope: { type: String, enum: Object.values(TOURNAMENT_SCOPE), required: true, default: DEFAULT_TOURNAMENT_CONFIGURATION.tournamentScope },
    competitionFormat: {
      type: String,
      enum: Object.values(TOURNAMENT_COMPETITION_FORMAT),
      required: true,
      default: DEFAULT_TOURNAMENT_CONFIGURATION.competitionFormat,
    },
    matchFormat: {
      type: String,
      enum: Object.values(TOURNAMENT_MATCH_FORMAT_LABEL),
      required: true,
      default: DEFAULT_TOURNAMENT_CONFIGURATION.matchFormatLabel,
    },

    hostTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    logo: { type: imageAssetSchema, default: () => ({}) },
    coverImage: { type: imageAssetSchema, default: () => ({}) },
    primaryColor: { type: String, trim: true, default: '#84cc16', match: [hexColorPattern, 'Primary color must be a hex color.'] },
    secondaryColor: { type: String, trim: true, default: '#020617', match: [hexColorPattern, 'Secondary color must be a hex color.'] },

    country: { type: String, trim: true, maxlength: 100, default: '' },
    state: { type: String, trim: true, maxlength: 100, default: '' },
    city: { type: String, trim: true, maxlength: 100, default: '' },
    primaryVenue: { type: String, trim: true, maxlength: 180, default: '' },
    additionalVenues: { type: [venueSchema], default: [] },

    registrationOpen: { type: Date, default: null },
    registrationClose: { type: Date, default: null },
    squadLock: { type: Date, default: null },
    fixturePublish: { type: Date, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    approvalStatus: { type: String, enum: Object.values(TOURNAMENT_APPROVAL_STATUS), default: TOURNAMENT_APPROVAL_STATUS.DRAFT, required: true },
    submittedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 2000, default: '' },
    changeRequest: { type: String, trim: true, maxlength: 3000, default: '' },

    lifecycleStatus: { type: String, enum: Object.values(TOURNAMENT_LIFECYCLE_STATUS), default: TOURNAMENT_LIFECYCLE_STATUS.DRAFT, required: true },
    visibility: { type: String, enum: Object.values(TOURNAMENT_VISIBILITY), default: TOURNAMENT_VISIBILITY.PRIVATE, required: true },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },

    playersOnField: { type: Number, min: TOURNAMENT_PLAYERS_ON_FIELD.MIN, max: TOURNAMENT_PLAYERS_ON_FIELD.MAX, default: DEFAULT_TOURNAMENT_CONFIGURATION.playersOnField },
    minimumSquad: { type: Number, min: 1, default: DEFAULT_TOURNAMENT_CONFIGURATION.minimumTournamentSquadSize },
    maximumSquad: { type: Number, min: 1, default: DEFAULT_TOURNAMENT_CONFIGURATION.maximumTournamentSquadSize },
    maximumMatchdaySquad: { type: Number, min: 1, default: DEFAULT_TOURNAMENT_CONFIGURATION.maximumMatchdaySquadSize },
    maximumSubstitutes: { type: Number, min: 0, default: DEFAULT_TOURNAMENT_CONFIGURATION.maximumSubstitutes },
    rollingSubs: { type: Boolean, default: DEFAULT_TOURNAMENT_CONFIGURATION.rollingSubstitutions },

    minimumTeams: { type: Number, min: 2, default: DEFAULT_TOURNAMENT_CONFIGURATION.minimumTeams },
    maximumTeams: { type: Number, min: 2, default: DEFAULT_TOURNAMENT_CONFIGURATION.maximumTeams },
    plannedTeams: { type: Number, min: 2, default: null },

    winPoints: { type: Number, min: 0, default: DEFAULT_TOURNAMENT_CONFIGURATION.winPoints },
    drawPoints: { type: Number, min: 0, default: DEFAULT_TOURNAMENT_CONFIGURATION.drawPoints },
    lossPoints: { type: Number, min: 0, default: DEFAULT_TOURNAMENT_CONFIGURATION.lossPoints },

    numberOfGroups: { type: Number, min: 0, default: 0 },
    teamsPerGroup: { type: Number, min: 0, default: 0 },
    qualifiersPerGroup: { type: Number, min: 0, default: 0 },
    groupMode: { type: String, enum: Object.values(GROUP_ALLOCATION_MODE), default: DEFAULT_TOURNAMENT_CONFIGURATION.groupAllocationMode },

    matchMinutes: { type: Number, min: 1, max: 150, default: 90 },
    halfMinutes: { type: Number, min: 1, max: 75, default: 45 },
    extraTime: { type: Boolean, default: false },
    penalties: { type: Boolean, default: false },

    walkoverEnabled: { type: Boolean, default: DEFAULT_TOURNAMENT_CONFIGURATION.walkoverEnabled },
    walkoverWinnerGoals: { type: Number, min: 0, default: DEFAULT_TOURNAMENT_CONFIGURATION.walkoverWinnerGoals },
    walkoverLoserGoals: { type: Number, min: 0, default: DEFAULT_TOURNAMENT_CONFIGURATION.walkoverLoserGoals },
    walkoverPoints: { type: Number, min: 0, default: DEFAULT_TOURNAMENT_CONFIGURATION.winPoints },

    awardsEnabled: { type: [String], enum: Object.values(TOURNAMENT_AWARD_IDENTIFIER), default: DEFAULT_TOURNAMENT_CONFIGURATION.enabledAwards },
    tiebreakOrder: { type: [String], enum: Object.values(TOURNAMENT_TIEBREAK_TYPE), default: DEFAULT_TOURNAMENT_CONFIGURATION.tiebreakPriority },

    galleryEnabled: { type: Boolean, default: true },
    officialsEnabled: { type: Boolean, default: false },
    shareEnabled: { type: Boolean, default: true },
    qrEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

tournamentSchema.pre('validate', function validateTournamentFoundation() {
  if (this.matchFormat === TOURNAMENT_MATCH_FORMAT_LABEL.CUSTOM && !isValidPlayersOnField(this.playersOnField)) {
    this.invalidate('playersOnField', 'Custom tournaments require a valid players-on-field count.');
  }
  if (this.matchFormat !== TOURNAMENT_MATCH_FORMAT_LABEL.CUSTOM) {
    this.playersOnField = starterCountForTournament({ matchFormatLabel: this.matchFormat });
  }
  if (this.minimumSquad > this.maximumSquad) this.invalidate('minimumSquad', 'Minimum squad cannot exceed maximum squad.');
  if (this.maximumMatchdaySquad > this.maximumSquad) this.invalidate('maximumMatchdaySquad', 'Matchday squad cannot exceed maximum squad.');
  if (this.maximumSubstitutes >= this.maximumMatchdaySquad) this.invalidate('maximumSubstitutes', 'Substitutes must be fewer than matchday squad size.');
  if (this.minimumTeams > this.maximumTeams) this.invalidate('minimumTeams', 'Minimum teams cannot exceed maximum teams.');
  if (this.plannedTeams && (this.plannedTeams < this.minimumTeams || this.plannedTeams > this.maximumTeams)) {
    this.invalidate('plannedTeams', 'Planned teams must fit within minimum and maximum team limits.');
  }
  if (this.halfMinutes * 2 > this.matchMinutes) this.invalidate('halfMinutes', 'Half minutes cannot exceed match minutes.');
  if (this.registrationOpen && this.registrationClose && this.registrationOpen >= this.registrationClose) {
    this.invalidate('registrationClose', 'Registration close must be after registration open.');
  }
  if (this.registrationClose && this.squadLock && this.registrationClose > this.squadLock) {
    this.invalidate('squadLock', 'Squad lock cannot be before registration close.');
  }
  if (this.squadLock && this.startDate && this.squadLock > this.startDate) {
    this.invalidate('squadLock', 'Squad lock cannot be after tournament start.');
  }
  if (this.fixturePublish && this.startDate && this.fixturePublish > this.startDate) {
    this.invalidate('fixturePublish', 'Fixture publish date cannot be after tournament start.');
  }
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    this.invalidate('endDate', 'End date cannot be before start date.');
  }
  if (new Set(this.awardsEnabled).size !== this.awardsEnabled.length) this.invalidate('awardsEnabled', 'Awards must be unique.');
  if (new Set(this.tiebreakOrder).size !== this.tiebreakOrder.length) this.invalidate('tiebreakOrder', 'Tiebreak order must be unique.');
  if (this.editionNumber && !this.seriesSlug) this.invalidate('seriesSlug', 'Series slug is required when edition number is set.');
});

tournamentSchema.index({ slug: 1 }, { unique: true });
tournamentSchema.index({ approvalStatus: 1, createdAt: -1 });
tournamentSchema.index({ hostTeam: 1, createdAt: -1 });
tournamentSchema.index({ startDate: 1 });
tournamentSchema.index({ endDate: 1 });
tournamentSchema.index({ scope: 1, startDate: -1 });
tournamentSchema.index({ seriesSlug: 1, editionNumber: 1 }, { sparse: true });
tournamentSchema.index({ isPublished: 1, visibility: 1, approvalStatus: 1, startDate: -1 });
tournamentSchema.index({ isArchived: 1, createdAt: -1 });

tournamentSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.__v;
    delete returned.createdBy;
    delete returned.updatedBy;
    delete returned.reviewedBy;
    if (returned.logo) delete returned.logo.publicId;
    if (returned.coverImage) delete returned.coverImage.publicId;
    return returned;
  },
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

export default Tournament;
