import Match from '../models/Match.js';
import MatchEvent from '../models/MatchEvent.js';
import AppError from '../utils/AppError.js';
import { calculateScore, compactSnapshot } from './liveMatchService.js';
import { deriveResult, participatedSnapshot } from './resultService.js';

const idString = (value) => String(value?._id || value || '');
const plain = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : { ...value });
const asArray = (value) => (Array.isArray(value) ? value : []);

const snapshotMap = (match) => new Map(
  [...asArray(match.startingXI), ...asArray(match.substitutes)]
    .map((snapshot) => [idString(snapshot.player), compactSnapshot(snapshot)]),
);

const normalizeNumber = (value, fallback = 0) => (value === '' || value === null || value === undefined ? fallback : Number(value));

const plural = (count, singular, pluralValue = `${singular}s`) => (count === 1 ? singular : pluralValue);

const scoreFromInput = (match, input) => {
  if (Number.isInteger(input.finalTeamScore) && Number.isInteger(input.finalOpponentScore)) {
    return { teamScore: input.finalTeamScore, opponentScore: input.finalOpponentScore };
  }
  if (Number.isInteger(input.homeGoals) && Number.isInteger(input.awayGoals)) {
    return match.teamSide === 'home'
      ? { teamScore: input.homeGoals, opponentScore: input.awayGoals }
      : { teamScore: input.awayGoals, opponentScore: input.homeGoals };
  }
  throw new AppError('Enter the final score for both teams.', 400, 'DIRECT_SCORE_REQUIRED', [
    { field: 'finalTeamScore', message: 'Enter your team goals.' },
    { field: 'finalOpponentScore', message: 'Enter opponent goals.' },
  ]);
};

const goalSide = (goal) => goal.scoringSide || goal.side;

const countGoalsBySide = (goals) => asArray(goals).reduce((counts, goal) => {
  const side = goalSide(goal);
  if (side === 'team') counts.team += 1;
  if (side === 'opponent') counts.opponent += 1;
  return counts;
}, { team: 0, opponent: 0 });

const scoreGoalCountMessage = (label, score, count) => (
  `${label} score is ${score}, but ${count} ${label.toLowerCase()} ${plural(count, 'goal entry', 'goal entries')} ${count === 1 ? 'has' : 'have'} been added.`
);

const assertGoalCountsMatchScore = ({ teamScore, opponentScore, goals }) => {
  const counts = countGoalsBySide(goals);
  if (counts.team !== teamScore) {
    const message = scoreGoalCountMessage('Team', teamScore, counts.team);
    throw new AppError(message, 400, 'DIRECT_TEAM_SCORE_MISMATCH', [
      { field: 'goals', message },
      { field: 'finalTeamScore', message: `Team score must match the number of team goal entries (${counts.team}).` },
    ]);
  }
  if (counts.opponent !== opponentScore) {
    const message = scoreGoalCountMessage('Opponent', opponentScore, counts.opponent);
    throw new AppError(message, 400, 'DIRECT_OPPONENT_SCORE_MISMATCH', [
      { field: 'goals', message },
      { field: 'finalOpponentScore', message: `Opponent score must match the number of opponent goal entries (${counts.opponent}).` },
    ]);
  }
};

const assertDirectResultMatch = (match) => {
  if (!match) throw new AppError('Match not found.', 404, 'MATCH_NOT_FOUND');
  if ((match.matchMode || 'stream') !== 'direct') {
    throw new AppError('Only Direct Input Result matches can use this form.', 409, 'MATCH_NOT_DIRECT');
  }
  if (match.status === 'cancelled' || !match.isActive) throw new AppError('This match is not available.', 404, 'MATCH_NOT_FOUND');
};

const assertLineupReady = (match) => {
  const starters = asArray(match.startingXI);
  const playerIds = starters.map((player) => idString(player.player));
  if (new Set(playerIds).size !== playerIds.length) throw new AppError('Starting lineup contains a duplicate player.', 400, 'DUPLICATE_STARTER');
  const goalkeepers = starters.filter((player) => String(player.position || '').toUpperCase() === 'GK');
  if (goalkeepers.length !== 1) throw new AppError('Starting lineup must contain exactly one goalkeeper.', 400, 'INVALID_GOALKEEPER_COUNT');
  if (starters.filter((player) => player.isCaptain).length > 1) throw new AppError('Starting lineup cannot contain more than one captain.', 400, 'DUPLICATE_CAPTAIN');
};

const requireTeamSnapshot = (snapshots, playerId, field) => {
  const snapshot = snapshots.get(idString(playerId));
  if (!snapshot) throw new AppError('Selected player is not in this match-day squad.', 400, 'PLAYER_NOT_IN_LINEUP', [
    { field, message: 'Choose a player from the selected Starting XI or bench.' },
  ]);
  return snapshot;
};

const eventCommon = (entry, type) => ({
  type,
  period: entry.period || 'second_half',
  minute: normalizeNumber(entry.minute, 0),
  stoppageMinute: entry.stoppageMinute === null || entry.stoppageMinute === undefined || entry.stoppageMinute === '' ? null : Number(entry.stoppageMinute),
  description: String(entry.description || '').trim(),
});

const buildGoalEvents = ({ match, input, snapshots, userId }) => {
  const goals = asArray(input.goals);
  const seen = new Set();
  return goals.map((goal) => {
    const side = goalSide(goal);
    if (!['team', 'opponent'].includes(side)) throw new AppError('Choose which side scored each goal.', 400, 'GOAL_SIDE_REQUIRED');
    const key = side === 'team'
      ? `team:${idString(goal.playerId)}:${goal.minute ?? 0}:${idString(goal.assistPlayerId)}`
      : `opponent:${String(goal.temporaryOpponentPlayerName || '').trim().toLowerCase()}:${goal.minute ?? 0}`;
    if (seen.has(key)) throw new AppError('Duplicate goal entry found.', 400, 'DUPLICATE_GOAL');
    seen.add(key);
    const event = { ...eventCommon(goal, 'goal'), match: match._id, scoringSide: side, createdBy: userId };
    if (side === 'team') {
      const scorer = requireTeamSnapshot(snapshots, goal.playerId, 'goals.playerId');
      Object.assign(event, { team: match.team, player: scorer.player, playerSnapshot: scorer });
      if (goal.assistPlayerId) {
        if (idString(goal.assistPlayerId) === idString(goal.playerId)) throw new AppError('A player cannot assist their own goal.', 400, 'ASSIST_EQUALS_SCORER');
        const assist = requireTeamSnapshot(snapshots, goal.assistPlayerId, 'goals.assistPlayerId');
        Object.assign(event, { assistPlayer: assist.player, assistPlayerSnapshot: assist });
      }
    } else {
      const name = String(goal.temporaryOpponentPlayerName || goal.name || '').trim();
      if (!name) throw new AppError('Enter the opponent goal scorer name.', 400, 'OPPONENT_SCORER_REQUIRED');
      Object.assign(event, { team: null, temporaryOpponentPlayerName: name });
    }
    return event;
  });
};

const buildCardEvents = ({ match, input, snapshots, userId, key, type }) => asArray(input[key]).map((card) => {
  const side = card.side || 'team';
  const event = { ...eventCommon(card, type), match: match._id, createdBy: userId };
  if (side === 'team') {
    const player = requireTeamSnapshot(snapshots, card.playerId, `${key}.playerId`);
    return { ...event, team: match.team, player: player.player, playerSnapshot: player };
  }
  const name = String(card.temporaryOpponentPlayerName || card.name || '').trim();
  if (!name) throw new AppError('Enter the opponent carded player name.', 400, 'OPPONENT_PLAYER_REQUIRED');
  return { ...event, team: null, temporaryOpponentPlayerName: name };
});

const buildSubstitutionEvents = ({ match, input, snapshots, userId }) => {
  const seen = new Set();
  return asArray(input.substitutions).map((substitution) => {
    const inId = idString(substitution.playerInId);
    const outId = idString(substitution.playerOutId);
    if (!inId || !outId || inId === outId) throw new AppError('Choose one player out and one different player in.', 400, 'INVALID_SUBSTITUTION');
    const key = `${outId}:${inId}:${substitution.minute ?? 0}`;
    if (seen.has(key)) throw new AppError('Duplicate substitution entry found.', 400, 'DUPLICATE_SUBSTITUTION');
    seen.add(key);
    const playerIn = requireTeamSnapshot(snapshots, inId, 'substitutions.playerInId');
    const playerOut = requireTeamSnapshot(snapshots, outId, 'substitutions.playerOutId');
    return {
      ...eventCommon(substitution, 'substitution'),
      match: match._id,
      team: match.team,
      playerIn: playerIn.player,
      playerInSnapshot: playerIn,
      playerOut: playerOut.player,
      playerOutSnapshot: playerOut,
      createdBy: userId,
    };
  });
};

const buildDirectEvents = ({ match, input, userId }) => {
  const snapshots = snapshotMap(match);
  return [
    ...buildGoalEvents({ match, input, snapshots, userId }),
    ...buildCardEvents({ match, input, snapshots, userId, key: 'yellowCards', type: 'yellow_card' }),
    ...buildCardEvents({ match, input, snapshots, userId, key: 'redCards', type: 'red_card' }),
    ...buildSubstitutionEvents({ match, input, snapshots, userId }),
  ].map((event, index) => ({ ...event, sequence: index + 1 }));
};

const applyDirectResult = async ({ eventModel, match, input, userId, now }) => {
  assertDirectResultMatch(match);
  assertLineupReady(match);
  const { teamScore, opponentScore } = scoreFromInput(match, input);
  if (teamScore < 0 || opponentScore < 0) throw new AppError('Scores cannot be negative.', 400, 'NEGATIVE_SCORE');
  assertGoalCountsMatchScore({ teamScore, opponentScore, goals: input.goals });
  const events = buildDirectEvents({ match, input, userId });
  const scores = calculateScore(events, match.teamSide);
  if (scores.teamScore !== teamScore || scores.opponentScore !== opponentScore) {
    throw new AppError('Goal entries must match the final score.', 400, 'DIRECT_SCORE_MISMATCH', [
      { field: 'goals', message: `Enter ${teamScore} team goal(s) and ${opponentScore} opponent goal(s).` },
    ]);
  }

  await eventModel.deleteMany({ match: match._id });
  if (events.length) await eventModel.create(events);
  match.status = 'completed';
  match.currentPeriod = 'full_time';
  match.completedAt = now;
  match.timerAnchorAt = null;
  match.timerBaseSeconds = (Number(input.matchDuration) || 90) * 60;
  match.liveMinute = Number(input.matchDuration) || 90;
  match.homeScore = scores.homeScore;
  match.awayScore = scores.awayScore;
  match.lastEventSequence = events.length;
  match.result = deriveResult(match, events);
  match.completionNotes = input.completionNotes || '';
  match.attendance = input.attendance ?? null;
  match.directResult = {
    ...(match.directResult || {}),
    submittedAt: match.directResult?.submittedAt || now,
    submittedBy: match.directResult?.submittedBy || userId,
    updatedAt: now,
    matchDuration: input.matchDuration ?? null,
    refereeName: input.refereeName || '',
    venueNotes: input.venueNotes || '',
  };
  if (Object.hasOwn(input, 'manOfTheMatchPlayerId')) {
    if (!input.manOfTheMatchPlayerId) match.manOfTheMatch = null;
    else {
      const snapshot = participatedSnapshot(match, events, input.manOfTheMatchPlayerId);
      if (!snapshot) throw new AppError('Man of the Match must be selected from a player who appeared in this match.', 400, 'INVALID_MAN_OF_THE_MATCH');
      match.manOfTheMatch = { player: snapshot.player, name: snapshot.name, jerseyNumber: snapshot.jerseyNumber ?? null, position: snapshot.position, photoUrl: snapshot.photoUrl || '' };
    }
  }
  match.resultConfirmedAt = now;
  match.resultConfirmedBy = userId;
  match.updatedBy = userId;
  await match.save();
  return { match: plain(match), result: match.result, events: events.map(plain) };
};

export const submitTeamDirectResult = async ({
  matchModel = Match, eventModel = MatchEvent, teamId, matchId, userId, input, now = new Date(),
}) => {
  const match = await matchModel.findOne({ _id: matchId, team: teamId, isActive: true });
  return applyDirectResult({ eventModel, match, input, userId, now });
};

export const submitAdminDirectResult = async ({
  matchModel = Match, eventModel = MatchEvent, matchId, userId, input, now = new Date(),
}) => {
  const match = await matchModel.findOne({ _id: matchId, isActive: true });
  return applyDirectResult({ eventModel, match, input, userId, now });
};

export const getDirectResult = async ({ matchModel = Match, eventModel = MatchEvent, matchId, teamId }) => {
  const filter = { _id: matchId, isActive: true };
  if (teamId) filter.team = teamId;
  const match = await matchModel.findOne(filter);
  assertDirectResultMatch(match);
  const events = await eventModel.find({ match: match._id, isUndone: false }).sort({ sequence: 1 }).lean();
  return { match: plain(match), result: match.result || deriveResult(match, events), events };
};
