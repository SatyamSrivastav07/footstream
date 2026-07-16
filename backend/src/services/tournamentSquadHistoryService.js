import TournamentSquadHistory from '../models/TournamentSquadHistory.js';
import { serializeTournamentSquadHistory } from '../serializers/tournamentSerializers.js';

const idString = (value) => String(value?._id || value || '');

const boundedMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== 'object') return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .slice(0, 20)
      .map(([key, value]) => {
        if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return [key, value];
        return [key, String(value).slice(0, 120)];
      }),
  );
};

export const createSquadHistory = async ({
  historyModel = TournamentSquadHistory,
  tournament,
  participant,
  squad,
  action,
  actor,
  actorRole,
  message,
  metadata = {},
}) => historyModel.create({
  tournament: tournament._id || tournament,
  participant: participant._id || participant,
  squad: squad._id || squad,
  action,
  actorUser: actor,
  actorRole,
  safeMessage: String(message || '').slice(0, 500),
  metadata: boundedMetadata(metadata),
});

export const listSquadHistory = async ({ historyModel = TournamentSquadHistory, tournamentId, participantId, squadId, query = {} }) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 100);
  const filter = { tournament: tournamentId, participant: participantId };
  if (squadId) filter.squad = squadId;
  const [history, total] = await Promise.all([
    historyModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    historyModel.countDocuments(filter),
  ]);
  return { history: history.map(serializeTournamentSquadHistory), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const historyKey = ({ tournament, participant, squad }) =>
  `${idString(tournament)}:${idString(participant)}:${idString(squad)}`;
