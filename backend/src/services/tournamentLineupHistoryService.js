import TournamentLineupHistory from '../models/TournamentLineupHistory.js';
import { serializeTournamentLineupHistory } from '../serializers/tournamentSerializers.js';

const boundedMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== 'object') return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .slice(0, 20)
      .map(([key, value]) => [key, value === null || ['string', 'number', 'boolean'].includes(typeof value) ? value : String(value).slice(0, 120)]),
  );
};

export const createLineupHistory = async ({
  historyModel = TournamentLineupHistory,
  tournament,
  lineup,
  action,
  actor,
  actorRole,
  message,
  metadata = {},
}) => historyModel.create({
  tournament: tournament._id || tournament,
  lineup: lineup._id || lineup,
  action,
  actorUser: actor,
  actorRole,
  safeMessage: String(message || '').slice(0, 500),
  metadata: boundedMetadata(metadata),
});

export const listLineupHistory = async ({ historyModel = TournamentLineupHistory, tournamentId, lineupId, query = {} }) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 100);
  const filter = { tournament: tournamentId, lineup: lineupId };
  const [history, total] = await Promise.all([
    historyModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    historyModel.countDocuments(filter),
  ]);
  return { history: history.map(serializeTournamentLineupHistory), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};
