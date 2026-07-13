import Team from '../models/Team.js';
import TeamChallenge from '../models/TeamChallenge.js';
import AppError from '../utils/AppError.js';
import { serializePublicTeam } from './publicProfileService.js';

const idString = (value) => String(value?._id || value || '');
const sameId = (left, right) => idString(left) === idString(right);

const activePublicTeamFilter = (teamId) => ({ _id: teamId, isPublished: true, isArchived: false });

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
  status: challenge.status,
  createdAt: challenge.createdAt,
  updatedAt: challenge.updatedAt,
});

const findActivePublicTeam = async ({ teamModel, teamId, notFoundMessage }) => {
  const team = await teamModel.findOne(activePublicTeamFilter(teamId));
  if (!team) throw new AppError(notFoundMessage, 404, 'TEAM_NOT_FOUND');
  return team;
};

export const createChallenge = async ({
  challengeModel = TeamChallenge,
  teamModel = Team,
  teamId,
  userId,
  input,
  now = new Date(),
}) => {
  if (sameId(teamId, input.challengedTeam)) throw new AppError('A team cannot challenge itself.', 400, 'CHALLENGE_SAME_TEAM');
  const proposedAt = challengeDateTime(input);
  if (!proposedAt || proposedAt <= now) throw new AppError('Challenge date and time must be in the future.', 400, 'CHALLENGE_PAST_DATE');
  const [challengerTeam, challengedTeam] = await Promise.all([
    findActivePublicTeam({ teamModel, teamId, notFoundMessage: 'Your team must be public and active before sending challenges.' }),
    findActivePublicTeam({ teamModel, teamId: input.challengedTeam, notFoundMessage: 'Opponent team is not available for challenges.' }),
  ]);
  const duplicateFilter = {
    status: 'Pending',
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
  return filter;
};

const challengeQuery = (query) => query
  .populate('challengerTeam')
  .populate('challengedTeam')
  .lean();

export const listChallenges = async ({ challengeModel = TeamChallenge, teamId, direction, query = {} }) => {
  const filter = listFilter(teamId, direction, query);
  const challenges = await challengeQuery(challengeModel.find(filter).sort({ createdAt: -1 }).limit(100));
  return { challenges: challenges.map(serializeChallenge) };
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
  }).populate('challengerTeam').populate('challengedTeam');
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

const transitionChallenge = async ({ challengeModel = TeamChallenge, teamId, challengeId, action }) => {
  const challenge = await challengeForTeam({ challengeModel, teamId, challengeId });
  if (challenge.status !== 'Pending') throw new AppError('Only pending challenges can be updated.', 409, 'CHALLENGE_NOT_PENDING');
  if (action === 'accept' || action === 'decline') {
    if (!sameId(challenge.challengedTeam, teamId)) throw new AppError('Only the challenged team can respond.', 403, 'CHALLENGE_RECEIVER_ONLY');
    challenge.status = action === 'accept' ? 'Accepted' : 'Declined';
  }
  if (action === 'cancel') {
    if (!sameId(challenge.challengerTeam, teamId)) throw new AppError('Only the sender can cancel this challenge.', 403, 'CHALLENGE_SENDER_ONLY');
    challenge.status = 'Cancelled';
  }
  await challenge.save();
  return serializeChallenge(challenge.toObject ? challenge.toObject() : challenge);
};

export const acceptChallenge = (args) => transitionChallenge({ ...args, action: 'accept' });
export const declineChallenge = (args) => transitionChallenge({ ...args, action: 'decline' });
export const cancelChallenge = (args) => transitionChallenge({ ...args, action: 'cancel' });
