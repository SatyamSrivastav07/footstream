import Match from '../models/Match.js';

const hasValue = (value) => Boolean(String(value || '').trim());
const hasStarters = (match) => Array.isArray(match.startingXI) && match.startingXI.length > 0;

export const buildMatchDayChecklist = (match) => {
  const streamReady = match.matchMode === 'direct' || Boolean(match.stream?.isEnabled && match.stream?.embedUrl);
  const items = [
    { key: 'startingXI', label: 'Starting XI Selected', complete: hasStarters(match) },
    { key: 'formation', label: 'Formation Loaded', complete: hasValue(match.formation) },
    { key: 'captain', label: 'Captain Assigned', complete: (match.startingXI || []).some((player) => player.isCaptain) },
    { key: 'viceCaptain', label: 'Vice Captain Assigned', complete: (match.startingXI || []).some((player) => player.isViceCaptain) },
    { key: 'stream', label: 'Stream Ready', complete: streamReady },
    { key: 'venue', label: 'Venue Selected', complete: hasValue(match.venue) },
    { key: 'referee', label: 'Referee Added', complete: hasValue(match.directResult?.refereeName || match.refereeName) },
  ];
  const completed = items.filter((item) => item.complete).length;
  return { items, completed, total: items.length, percentage: Math.round((completed / items.length) * 100) };
};

export const getMatchDayChecklist = async ({ matchModel = Match, matchId, teamId }) => {
  const match = await matchModel.findOne({ _id: matchId, team: teamId, isActive: true }).lean();
  if (!match) return null;
  return { checklist: buildMatchDayChecklist(match) };
};
