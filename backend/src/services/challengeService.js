import Team from '../models/Team.js';
import TeamChallenge from '../models/TeamChallenge.js';
import Match from '../models/Match.js';
import AppError from '../utils/AppError.js';
import { serializePublicTeam } from './publicProfileService.js';

const idString = (value) => String(value?._id || value || '');
const sameId = (left, right) => idString(left) === idString(right);

const activePublicTeamFilter = (teamId) => ({ _id: teamId, isPublished: true, isArchived: false });
const currentStatus = (status) => String(status || '').toLowerCase();
const pendingStatuses = ['pending', 'Pending'];
const statusValue = (value) => currentStatus(value);
const isPendingStatus = (value) => pendingStatuses.includes(value) || statusValue(value) === 'pending';

export const challengeDateTime = ({ proposedDate, proposedTime }) => {
  const date = proposedDate instanceof Date ? proposedDate : new Date(proposedDate);
  if (Number.isNaN(date.getTime())) return null;
  const [hours, minutes] = String(proposedTime || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const combined = new Date(date);
  combined.setUTCHours(hours, minutes, 0, 0);
  return combined;
};

const publicTeam = (team) => team && typeof team === 'object' ? serializePublicTeam(team) : team;
const plain = (value) => (value?.toObject ? value.toObject() : value);
const snapshotChallenge = (challenge) => ({
  venue: challenge.venue,
  proposedDate: challenge.proposedDate,
  proposedTime: challenge.proposedTime,
  matchType: challenge.matchType,
  squadSize: challenge.squadSize,
  message: challenge.message || '',
});
const statusLabel = (status) => currentStatus(status);
const createdMatchSummary = (match) => (match && typeof match === 'object' ? {
  _id: match._id,
  team: match.team,
  opponent: match.opponent,
  venue: match.venue,
  matchType: match.matchType,
  scheduledAt: match.scheduledAt,
  status: match.status,
} : match);
const serializeCounterProposal = (proposal) => proposal && ({
  proposedByTeam: publicTeam(proposal.proposedByTeam),
  venue: proposal.venue,
  proposedDate: proposal.proposedDate,
  proposedTime: proposal.proposedTime,
  message: proposal.message || '',
  createdAt: proposal.createdAt,
});

export const serializeChallenge = (challenge) => ({
  _id: challenge._id,
  challengerTeam: publicTeam(challenge.challengerTeam),
  challengedTeam: publicTeam(challenge.challengedTeam),
  matchType: challenge.matchType,
  squadSize: challenge.squadSize,
  venue: challenge.venue,
  proposedDate: challenge.proposedDate,
  proposedTime: challenge.proposedTime,
  message: challenge.message || '',
  status: statusLabel(challenge.status),
  counterProposal: serializeCounterProposal(challenge.counterProposal),
  acceptedAt: challenge.acceptedAt,
  declinedAt: challenge.declinedAt,
  cancelledAt: challenge.cancelledAt,
  finalizedBy: publicTeam(challenge.finalizedBy),
  createdMatch: createdMatchSummary(challenge.createdMatch),
  createdAt: challenge.createdAt,
  updatedAt: challenge.updatedAt,
});

export const serializeChallengeHistory = (challenge) => ({
  history: (challenge.history || [])
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((item) => ({
      action: item.action,
      actorTeam: publicTeam(item.actorTeam),
      previousStatus: item.previousStatus,
      nextStatus: item.nextStatus,
      snapshot: item.snapshot,
      createdAt: item.createdAt,
    })),
});

const findActivePublicTeam = async ({ teamModel, teamId, notFoundMessage }) => {
  const team = await teamModel.findOne(activePublicTeamFilter(teamId));
  if (!team) throw new AppError(notFoundMessage, 404, 'TEAM_NOT_FOUND');
  return team;
};

const appendHistory = ({ challenge, action, actorTeam, actorUser, previousStatus, nextStatus, snapshot, at = new Date() }) => {
  challenge.history = challenge.history || [];
  challenge.history.push({
    action,
    actorTeam,
    actorUser,
    previousStatus: previousStatus ?? null,
    nextStatus: nextStatus ?? null,
    snapshot,
    createdAt: at,
  });
};

const matchTypeMap = { Friendly: 'friendly', Practice: 'practice', League: 'league' };
const challengeUrl = '/team/challenges';
const fixtureUrl = (matchId) => `/team/matches/${matchId}`;

export const createChallenge = async ({
  challengeModel = TeamChallenge,
  teamModel = Team,
  teamId,
  userId,
  input,
  now = new Date(),
  notifyTeam = async () => {},
}) => {
  if (sameId(teamId, input.challengedTeam)) throw new AppError('A team cannot challenge itself.', 400, 'CHALLENGE_SAME_TEAM');
  const proposedAt = challengeDateTime(input);
  if (!proposedAt || proposedAt <= now) throw new AppError('Challenge date and time must be in the future.', 400, 'CHALLENGE_PAST_DATE');
  const [challengerTeam, challengedTeam] = await Promise.all([
    findActivePublicTeam({ teamModel, teamId, notFoundMessage: 'Your team must be public and active before sending challenges.' }),
    findActivePublicTeam({ teamModel, teamId: input.challengedTeam, notFoundMessage: 'Opponent team is not available for challenges.' }),
  ]);
  const duplicateFilter = {
    status: { $in: pendingStatuses },
    proposedDate: input.proposedDate,
    $or: [
      { challengerTeam: teamId, challengedTeam: input.challengedTeam },
      { challengerTeam: input.challengedTeam, challengedTeam: teamId },
    ],
  };
  const duplicate = await challengeModel.exists(duplicateFilter);
  if (duplicate) throw new AppError('A pending challenge already exists between these teams for that date.', 409, 'CHALLENGE_DUPLICATE_PENDING');
  const challenge = await challengeModel.create({
    challengerTeam: teamId,
    challengedTeam: input.challengedTeam,
    createdBy: userId,
    matchType: input.matchType,
    squadSize: input.squadSize,
    venue: input.venue,
    proposedDate: input.proposedDate,
    proposedTime: input.proposedTime,
    message: input.message || '',
    status: 'pending',
    history: [{
      action: 'created',
      actorTeam: teamId,
      actorUser: userId,
      previousStatus: null,
      nextStatus: 'pending',
      snapshot: {
        venue: input.venue,
        proposedDate: input.proposedDate,
        proposedTime: input.proposedTime,
        matchType: input.matchType,
        squadSize: input.squadSize,
        message: input.message || '',
      },
      createdAt: now,
    }],
  });
  await notifyTeam({
    teamId: input.challengedTeam,
    type: 'challenge_received',
    title: 'New team challenge',
    message: `${challengerTeam.name} challenged your team.`,
    entityType: 'challenge',
    entityId: challenge._id,
    actionUrl: challengeUrl,
    dedupeKey: `challenge:${challenge._id}:received`,
  });
  return serializeChallenge({
    ...(challenge.toObject ? challenge.toObject() : challenge),
    challengerTeam: challengerTeam.toObject ? challengerTeam.toObject() : challengerTeam,
    challengedTeam: challengedTeam.toObject ? challengedTeam.toObject() : challengedTeam,
  });
};

const listFilter = (teamId, direction, query = {}) => {
  const filter = direction === 'sent' ? { challengerTeam: teamId } : { challengedTeam: teamId };
  if (query.status) filter.status = query.status;
  if (query.matchType) filter.matchType = query.matchType;
  if (query.squadSize) filter.squadSize = query.squadSize;
  if (query.from || query.to) {
    filter.proposedDate = {};
    if (query.from) filter.proposedDate.$gte = new Date(query.from);
    if (query.to) {
      const end = new Date(query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) end.setUTCHours(23, 59, 59, 999);
      filter.proposedDate.$lte = end;
    }
  }
  return filter;
};

const challengeQuery = (query) => query
  .populate('challengerTeam')
  .populate('challengedTeam')
  .populate('counterProposal.proposedByTeam')
  .populate('finalizedBy')
  .populate('createdMatch')
  .lean();

export const listChallenges = async ({ challengeModel = TeamChallenge, teamId, direction, query = {} }) => {
  const filter = listFilter(teamId, direction, query);
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 100);
  const challenges = await challengeQuery(challengeModel.find(filter).sort({ status: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit));
  const serialized = challenges.map(serializeChallenge).filter((challenge) => {
    if (!query.opponent) return true;
    const opponent = direction === 'sent' ? challenge.challengedTeam : challenge.challengerTeam;
    return opponent?.name?.toLowerCase().includes(query.opponent.toLowerCase());
  });
  return { challenges: serialized, pagination: { page, limit } };
};

export const listAllChallenges = async ({ challengeModel = TeamChallenge, query = {} } = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  const challenges = await challengeQuery(challengeModel.find(filter).sort({ createdAt: -1 }).limit(200));
  return { challenges: challenges.map(serializeChallenge) };
};

export const listChallengeableTeams = async ({ teamModel = Team, teamId, query = {} }) => {
  const filter = { isPublished: true, isArchived: false, _id: { $ne: teamId } };
  if (query.search) filter.name = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const teams = await teamModel.find(filter).sort({ name: 1, _id: 1 }).limit(20).lean();
  return {
    teams: teams.map((team) => ({ _id: team._id, ...serializePublicTeam(team) })),
  };
};

const challengeForTeam = async ({ challengeModel = TeamChallenge, teamId, challengeId }) => {
  const challenge = await challengeModel.findOne({
    _id: challengeId,
    $or: [{ challengerTeam: teamId }, { challengedTeam: teamId }],
  }).populate('challengerTeam').populate('challengedTeam').populate('counterProposal.proposedByTeam').populate('finalizedBy').populate('createdMatch');
  if (!challenge) throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  return challenge;
};

export const getChallengeForTeam = async ({ challengeModel = TeamChallenge, teamId, challengeId }) => {
  const challenge = await challengeForTeam({ challengeModel, teamId, challengeId });
  return serializeChallenge(challenge.toObject ? challenge.toObject() : challenge);
};

export const getChallengeForAdmin = async ({ challengeModel = TeamChallenge, challengeId }) => {
  const challenge = await challengeQuery(challengeModel.findOne({ _id: challengeId }));
  if (!challenge) throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  return serializeChallenge(challenge);
};

const assertActiveTeams = async ({ teamModel = Team, challenge }) => {
  const [challengerTeam, challengedTeam] = await Promise.all([
    findActivePublicTeam({ teamModel, teamId: idString(challenge.challengerTeam), notFoundMessage: 'Challenger team is not available.' }),
    findActivePublicTeam({ teamModel, teamId: idString(challenge.challengedTeam), notFoundMessage: 'Challenged team is not available.' }),
  ]);
  return { challengerTeam, challengedTeam };
};

const findExistingChallengeMatch = async ({ matchModel, challenge }) => {
  if (challenge.createdMatch && typeof challenge.createdMatch === 'object' && (challenge.createdMatch.opponent || challenge.createdMatch.scheduledAt)) return challenge.createdMatch;
  if (challenge.createdMatch) return matchModel.findOne({ _id: idString(challenge.createdMatch), isActive: true });
  return matchModel.findOne({ sourceChallenge: challenge._id, isActive: true });
};

export const createFixtureForChallenge = async ({
  matchModel = Match,
  teamModel = Team,
  challenge,
  userId,
  now = new Date(),
}) => {
  const existing = await findExistingChallengeMatch({ matchModel, challenge });
  if (existing) return existing;
  const { challengedTeam } = await assertActiveTeams({ teamModel, challenge });
  const scheduledAt = challengeDateTime(challenge);
  if (!scheduledAt || scheduledAt <= now) throw new AppError('Challenge date and time must still be in the future.', 400, 'CHALLENGE_PAST_DATE');
  if (!challenge.venue?.trim()) throw new AppError('Venue is required before creating a fixture.', 400, 'CHALLENGE_VENUE_REQUIRED');
  const matchType = matchTypeMap[challenge.matchType];
  if (!matchType) throw new AppError('Challenge match type cannot be mapped to a fixture.', 400, 'CHALLENGE_MATCH_TYPE_INVALID');
  try {
    return await matchModel.create({
      team: idString(challenge.challengerTeam),
      registeredOpponentTeam: idString(challenge.challengedTeam),
      opponent: { name: challengedTeam.name, temporaryPlayers: [] },
      tournament: '',
      venue: challenge.venue,
      matchType,
      matchFormat: challenge.squadSize,
      teamSide: 'home',
      scheduledAt,
      formation: null,
      customFormation: '',
      startingXI: [],
      substitutes: [],
      notes: `Created from team challenge ${challenge._id}.`,
      status: 'scheduled',
      isActive: true,
      createdBy: userId,
      sourceChallenge: challenge._id,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const retryMatch = await matchModel.findOne({ sourceChallenge: challenge._id, isActive: true });
      if (retryMatch) return retryMatch;
    }
    throw error;
  }
};

const finalizeChallengeAcceptance = async ({ challengeModel = TeamChallenge, matchModel = Match, teamModel = Team, challenge, teamId, userId, action, now = new Date(), notifyTeam = async () => {} }) => {
  const previousStatus = statusValue(challenge.status);
  const existing = await findExistingChallengeMatch({ matchModel, challenge });
  if (existing) {
    challenge.status = 'accepted';
    challenge.acceptedAt = challenge.acceptedAt || now;
    challenge.finalizedBy = challenge.finalizedBy || teamId;
    challenge.createdMatch = existing._id;
    await challenge.save();
    return serializeChallenge({ ...plain(challenge), createdMatch: plain(existing) });
  }
  const fixture = await createFixtureForChallenge({ matchModel, teamModel, challenge, userId, now });
  challenge.status = 'accepted';
  challenge.acceptedAt = now;
  challenge.finalizedBy = teamId;
  challenge.createdMatch = fixture._id;
  challenge.counterProposal = null;
  appendHistory({ challenge, action, actorTeam: teamId, actorUser: userId, previousStatus, nextStatus: 'accepted', snapshot: snapshotChallenge(challenge), at: now });
  appendHistory({ challenge, action: 'fixture-created', actorTeam: teamId, actorUser: userId, previousStatus: 'accepted', nextStatus: 'accepted', snapshot: snapshotChallenge(challenge), at: now });
  try {
    await challenge.save();
  } catch (error) {
    const retryMatch = await matchModel.findOne({ sourceChallenge: challenge._id, isActive: true });
    if (retryMatch) {
      challenge.createdMatch = retryMatch._id;
      await challengeModel.updateOne({ _id: challenge._id }, { $set: { status: 'accepted', acceptedAt: challenge.acceptedAt, finalizedBy: teamId, createdMatch: retryMatch._id }, $push: { history: { $each: challenge.history.slice(-2) } } });
      return serializeChallenge({ ...plain(challenge), createdMatch: plain(retryMatch) });
    }
    throw error;
  }
  const recipientTeamId = action === 'counter-accepted' ? idString(challenge.challengedTeam) : idString(challenge.challengerTeam);
  await notifyTeam({
    teamId: recipientTeamId,
    type: action === 'counter-accepted' ? 'challenge_counter_accepted' : 'challenge_accepted',
    title: action === 'counter-accepted' ? 'Counter proposal accepted' : 'Challenge accepted',
    message: 'A challenge was accepted and a fixture was created.',
    entityType: 'challenge',
    entityId: challenge._id,
    actionUrl: challengeUrl,
    dedupeKey: `challenge:${challenge._id}:${action}`,
  });
  await notifyTeam({
    teamId: idString(challenge.challengerTeam),
    type: 'challenge_fixture_created',
    title: 'Fixture created',
    message: 'A scheduled fixture was created from your challenge.',
    entityType: 'match',
    entityId: fixture._id,
    actionUrl: fixtureUrl(fixture._id),
    dedupeKey: `challenge:${challenge._id}:fixture-created`,
  });
  return serializeChallenge({ ...plain(challenge), createdMatch: plain(fixture) });
};

const transitionChallenge = async ({ challengeModel = TeamChallenge, matchModel = Match, teamModel = Team, teamId, userId, challengeId, action, notifyTeam = async () => {} }) => {
  const challenge = await challengeForTeam({ challengeModel, teamId, challengeId });
  if (action === 'accept' && statusValue(challenge.status) === 'accepted' && challenge.createdMatch) {
    if (!sameId(challenge.challengedTeam, teamId)) throw new AppError('Only the challenged team can respond.', 403, 'CHALLENGE_RECEIVER_ONLY');
    const existing = await findExistingChallengeMatch({ matchModel, challenge });
    return serializeChallenge({ ...plain(challenge), createdMatch: plain(existing || challenge.createdMatch) });
  }
  if (!isPendingStatus(challenge.status)) throw new AppError('Only pending challenges can be updated.', 409, 'CHALLENGE_NOT_PENDING');
  if (action === 'accept') {
    if (!sameId(challenge.challengedTeam, teamId)) throw new AppError('Only the challenged team can respond.', 403, 'CHALLENGE_RECEIVER_ONLY');
    return finalizeChallengeAcceptance({ challengeModel, matchModel, teamModel, challenge, teamId, userId, action: 'accepted', notifyTeam });
  }
  if (action === 'decline') {
    if (!sameId(challenge.challengedTeam, teamId)) throw new AppError('Only the challenged team can respond.', 403, 'CHALLENGE_RECEIVER_ONLY');
    const previousStatus = statusValue(challenge.status);
    challenge.status = 'declined';
    challenge.declinedAt = new Date();
    appendHistory({ challenge, action: 'declined', actorTeam: teamId, actorUser: userId, previousStatus, nextStatus: 'declined', snapshot: snapshotChallenge(challenge) });
    await notifyTeam({
      teamId: idString(challenge.challengerTeam),
      type: 'challenge_declined',
      title: 'Challenge declined',
      message: 'Your team challenge was declined.',
      entityType: 'challenge',
      entityId: challenge._id,
      actionUrl: challengeUrl,
      dedupeKey: `challenge:${challenge._id}:declined`,
    });
  }
  if (action === 'cancel') {
    if (!sameId(challenge.challengerTeam, teamId)) throw new AppError('Only the sender can cancel this challenge.', 403, 'CHALLENGE_SENDER_ONLY');
    const previousStatus = statusValue(challenge.status);
    challenge.status = 'cancelled';
    challenge.cancelledAt = new Date();
    appendHistory({ challenge, action: 'cancelled', actorTeam: teamId, actorUser: userId, previousStatus, nextStatus: 'cancelled', snapshot: snapshotChallenge(challenge) });
    await notifyTeam({
      teamId: idString(challenge.challengedTeam),
      type: 'challenge_cancelled',
      title: 'Challenge cancelled',
      message: 'A team challenge was cancelled.',
      entityType: 'challenge',
      entityId: challenge._id,
      actionUrl: challengeUrl,
      dedupeKey: `challenge:${challenge._id}:cancelled`,
    });
  }
  await challenge.save();
  return serializeChallenge(challenge.toObject ? challenge.toObject() : challenge);
};

export const acceptChallenge = (args) => transitionChallenge({ ...args, action: 'accept' });
export const declineChallenge = (args) => transitionChallenge({ ...args, action: 'decline' });
export const cancelChallenge = (args) => transitionChallenge({ ...args, action: 'cancel' });

export const counterChallenge = async ({ challengeModel = TeamChallenge, teamId, userId, challengeId, input, now = new Date(), notifyTeam = async () => {} }) => {
  const challenge = await challengeForTeam({ challengeModel, teamId, challengeId });
  if (!isPendingStatus(challenge.status)) throw new AppError('Only pending challenges can be countered.', 409, 'CHALLENGE_NOT_PENDING');
  if (!sameId(challenge.challengedTeam, teamId)) throw new AppError('Only the challenged team can suggest changes.', 403, 'CHALLENGE_RECEIVER_ONLY');
  const proposedAt = challengeDateTime(input);
  if (!proposedAt || proposedAt <= now) throw new AppError('Counter proposal date and time must be in the future.', 400, 'CHALLENGE_PAST_DATE');
  const previousStatus = statusValue(challenge.status);
  challenge.counterProposal = {
    proposedByTeam: teamId,
    venue: input.venue,
    proposedDate: input.proposedDate,
    proposedTime: input.proposedTime,
    message: input.message || '',
    createdAt: now,
  };
  challenge.status = 'countered';
  appendHistory({
    challenge,
    action: 'countered',
    actorTeam: teamId,
    actorUser: userId,
    previousStatus,
    nextStatus: 'countered',
    snapshot: { ...snapshotChallenge(challenge), venue: input.venue, proposedDate: input.proposedDate, proposedTime: input.proposedTime, message: input.message || '' },
    at: now,
  });
  await challenge.save();
  await notifyTeam({
    teamId: idString(challenge.challengerTeam),
    type: 'challenge_countered',
    title: 'Counter proposal received',
    message: 'A challenged team suggested changes to your challenge.',
    entityType: 'challenge',
    entityId: challenge._id,
    actionUrl: challengeUrl,
    dedupeKey: `challenge:${challenge._id}:countered:${now.getTime()}`,
  });
  return serializeChallenge(plain(challenge));
};

export const acceptCounterChallenge = async ({ challengeModel = TeamChallenge, matchModel = Match, teamModel = Team, teamId, userId, challengeId, now = new Date(), notifyTeam = async () => {} }) => {
  const challenge = await challengeForTeam({ challengeModel, teamId, challengeId });
  if (statusValue(challenge.status) === 'accepted' && challenge.createdMatch) {
    if (!sameId(challenge.challengerTeam, teamId)) throw new AppError('Only the challenger can accept a counter proposal.', 403, 'CHALLENGE_CHALLENGER_ONLY');
    const existing = await findExistingChallengeMatch({ matchModel, challenge });
    return serializeChallenge({ ...plain(challenge), createdMatch: plain(existing || challenge.createdMatch) });
  }
  if (statusValue(challenge.status) !== 'countered' || !challenge.counterProposal) throw new AppError('Only countered challenges can resolve a counter proposal.', 409, 'CHALLENGE_NOT_COUNTERED');
  if (!sameId(challenge.challengerTeam, teamId)) throw new AppError('Only the challenger can accept a counter proposal.', 403, 'CHALLENGE_CHALLENGER_ONLY');
  challenge.venue = challenge.counterProposal.venue;
  challenge.proposedDate = challenge.counterProposal.proposedDate;
  challenge.proposedTime = challenge.counterProposal.proposedTime;
  if (challenge.counterProposal.message) challenge.message = challenge.counterProposal.message;
  return finalizeChallengeAcceptance({ challengeModel, matchModel, teamModel, challenge, teamId, userId, action: 'counter-accepted', now, notifyTeam });
};

export const rejectCounterChallenge = async ({ challengeModel = TeamChallenge, teamId, userId, challengeId, now = new Date(), notifyTeam = async () => {} }) => {
  const challenge = await challengeForTeam({ challengeModel, teamId, challengeId });
  if (statusValue(challenge.status) !== 'countered' || !challenge.counterProposal) throw new AppError('Only countered challenges can resolve a counter proposal.', 409, 'CHALLENGE_NOT_COUNTERED');
  if (!sameId(challenge.challengerTeam, teamId)) throw new AppError('Only the challenger can reject a counter proposal.', 403, 'CHALLENGE_CHALLENGER_ONLY');
  const previousStatus = statusValue(challenge.status);
  challenge.counterProposal = null;
  challenge.status = 'pending';
  appendHistory({ challenge, action: 'counter-rejected', actorTeam: teamId, actorUser: userId, previousStatus, nextStatus: 'pending', snapshot: snapshotChallenge(challenge), at: now });
  await challenge.save();
  await notifyTeam({
    teamId: idString(challenge.challengedTeam),
    type: 'challenge_counter_rejected',
    title: 'Counter proposal rejected',
    message: 'Your counter proposal was rejected.',
    entityType: 'challenge',
    entityId: challenge._id,
    actionUrl: challengeUrl,
    dedupeKey: `challenge:${challenge._id}:counter-rejected:${now.getTime()}`,
  });
  return serializeChallenge(plain(challenge));
};

export const getChallengeHistoryForTeam = async ({ challengeModel = TeamChallenge, teamId, challengeId }) => {
  const challenge = await challengeModel.findOne({
    _id: challengeId,
    $or: [{ challengerTeam: teamId }, { challengedTeam: teamId }],
  }).populate('history.actorTeam').lean();
  if (!challenge) throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  return serializeChallengeHistory(challenge);
};

export const getChallengeHistoryForAdmin = async ({ challengeModel = TeamChallenge, challengeId }) => {
  const challenge = await challengeModel.findOne({ _id: challengeId }).populate('history.actorTeam').lean();
  if (!challenge) throw new AppError('Challenge not found.', 404, 'CHALLENGE_NOT_FOUND');
  return serializeChallengeHistory(challenge);
};
