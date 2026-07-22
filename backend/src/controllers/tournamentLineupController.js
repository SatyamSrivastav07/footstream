import asyncHandler from '../utils/asyncHandler.js';
import {
  assignSlot,
  addStarter,
  addSubstitute,
  autoPlaceLineupSide,
  clearSlot,
  createLineup,
  getAdminLineup,
  getAdminLineupHistory,
  getHostedLineup,
  getLineupEligiblePlayers,
  hostedLineupHistory,
  listAdminLineups,
  listHostedLineups,
  lockLineup,
  removePlayer,
  setCaptain,
  setGoalkeeper,
  submitLineup,
  unlockLineup,
  updateLineupPairing,
  updateLineupSide,
} from '../services/tournamentLineupService.js';

const sideMutation = async ({ req, side }) => {
  const base = { tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, side, user: req.user };
  if (req.body.action === 'formation') return updateLineupSide({ ...base, data: req.body });
  if (req.body.action === 'addStarter') return addStarter({ ...base, squadPlayerId: req.body.squadPlayerId });
  if (req.body.action === 'addSubstitute') return addSubstitute({ ...base, squadPlayerId: req.body.squadPlayerId });
  if (req.body.action === 'removePlayer') return removePlayer({ ...base, squadPlayerId: req.body.squadPlayerId });
  if (req.body.action === 'setCaptain') return setCaptain({ ...base, squadPlayerId: req.body.squadPlayerId });
  if (req.body.action === 'assignSlot') return assignSlot({ ...base, squadPlayerId: req.body.squadPlayerId, slotId: req.body.slotId });
  if (req.body.action === 'autoPlace') return autoPlaceLineupSide(base);
  if (req.body.action === 'clearSlot') return clearSlot({ ...base, squadPlayerId: req.body.squadPlayerId });
  return setGoalkeeper({ ...base, squadPlayerId: req.body.squadPlayerId });
};

export const hostedLineups = asyncHandler(async (req, res) => {
  const data = await listHostedLineups({ tournamentId: req.params.tournamentId, user: req.user, query: req.query });
  res.json({ success: true, data });
});

export const postLineup = asyncHandler(async (req, res) => {
  const data = await createLineup({ tournamentId: req.params.tournamentId, user: req.user, data: req.body });
  res.status(201).json({ success: true, data });
});

export const readLineup = asyncHandler(async (req, res) => {
  const data = await getHostedLineup({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, user: req.user });
  res.json({ success: true, data });
});

export const patchLineup = asyncHandler(async (req, res) => {
  const data = await updateLineupPairing({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, user: req.user, data: req.body });
  res.json({ success: true, data });
});

export const patchHomeLineup = asyncHandler(async (req, res) => {
  const data = await sideMutation({ req, side: 'home' });
  res.json({ success: true, data });
});

export const patchAwayLineup = asyncHandler(async (req, res) => {
  const data = await sideMutation({ req, side: 'away' });
  res.json({ success: true, data });
});

export const postSubmitLineup = asyncHandler(async (req, res) => {
  const data = await submitLineup({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, user: req.user });
  res.json({ success: true, data });
});

export const postLockLineup = asyncHandler(async (req, res) => {
  const data = await lockLineup({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, user: req.user });
  res.json({ success: true, data });
});

export const postUnlockLineup = asyncHandler(async (req, res) => {
  const data = await unlockLineup({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, user: req.user });
  res.json({ success: true, data });
});

export const getLineupHistory = asyncHandler(async (req, res) => {
  const data = await hostedLineupHistory({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, user: req.user, query: req.query });
  res.json({ success: true, data });
});

export const homeEligiblePlayers = asyncHandler(async (req, res) => {
  const data = await getLineupEligiblePlayers({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, side: 'home', user: req.user });
  res.json({ success: true, data });
});

export const awayEligiblePlayers = asyncHandler(async (req, res) => {
  const data = await getLineupEligiblePlayers({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, side: 'away', user: req.user });
  res.json({ success: true, data });
});

export const adminLineups = asyncHandler(async (req, res) => {
  const data = await listAdminLineups({ tournamentId: req.params.tournamentId });
  res.json({ success: true, data });
});

export const adminLineup = asyncHandler(async (req, res) => {
  const data = await getAdminLineup({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId });
  res.json({ success: true, data });
});

export const adminLineupHistory = asyncHandler(async (req, res) => {
  const data = await getAdminLineupHistory({ tournamentId: req.params.tournamentId, lineupId: req.params.lineupId, query: req.query });
  res.json({ success: true, data });
});
