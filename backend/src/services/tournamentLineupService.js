import mongoose from 'mongoose';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_FORMATION_PRESETS,
  TOURNAMENT_LIFECYCLE_STATUS,
  TOURNAMENT_LINEUP_STATUS,
  TOURNAMENT_SQUAD_STATUS,
} from '../constants/tournamentConstants.js';
import Tournament from '../models/Tournament.js';
import TournamentParticipant from '../models/TournamentParticipant.js';
import TournamentSquad from '../models/TournamentSquad.js';
import TournamentSquadPlayer from '../models/TournamentSquadPlayer.js';
import TournamentMatchdayLineup from '../models/TournamentMatchdayLineup.js';
import AppError from '../utils/AppError.js';
import { serializeTournamentLineupHost, serializeTournamentParticipantPublic, serializeTournamentSquadPlayerPublic } from '../serializers/tournamentSerializers.js';
import { createLineupHistory, listLineupHistory } from './tournamentLineupHistoryService.js';

const idString = (value) => String(value?._id || value || '');
const editableStatuses = new Set([TOURNAMENT_LINEUP_STATUS.DRAFT]);
const readySquadStatuses = [TOURNAMENT_SQUAD_STATUS.APPROVED, TOURNAMENT_SQUAD_STATUS.LOCKED];

export const formationPresetsForPlayers = (playersOnField) => TOURNAMENT_FORMATION_PRESETS[Number(playersOnField)] || [];

const parseFormationTotal = (formation) => {
  if (!/^\d+(?:-\d+){1,5}$/.test(String(formation || ''))) return null;
  return String(formation).split('-').reduce((total, part) => total + Number(part), 1);
};

const parseOutfieldLines = (formation) => {
  if (!/^\d+(?:-\d+){1,5}$/.test(String(formation || ''))) return [];
  return String(formation).split('-').map((part) => Number(part));
};

export const formationSlots = ({ formation, customFormation, playersOnField }) => {
  const effectiveFormation = formation === 'custom' ? customFormation : formation;
  const lines = parseOutfieldLines(effectiveFormation);
  if (!lines.length) return [];
  const slots = [{ slotId: 'GK', lineIndex: 0, positionIndex: 0, roleLabel: 'Goalkeeper', x: 0.5, y: 0.92 }];
  lines.forEach((count, lineIndex) => {
    const y = 0.78 - (lineIndex * (0.58 / Math.max(lines.length - 1, 1)));
    for (let index = 0; index < count; index += 1) {
      slots.push({
        slotId: `L${lineIndex + 1}-P${index + 1}`,
        lineIndex: lineIndex + 1,
        positionIndex: index,
        roleLabel: `Line ${lineIndex + 1}`,
        x: (index + 1) / (count + 1),
        y: Number(y.toFixed(3)),
      });
    }
  });
  return slots.slice(0, Number(playersOnField) || slots.length);
};

export const validateTournamentFormation = ({ formation, customFormation, playersOnField }) => {
  if (!formation) return;
  if (formation === 'custom') {
    const total = parseFormationTotal(customFormation);
    if (total !== Number(playersOnField)) {
      throw new AppError(`Custom formation lines plus one goalkeeper must equal ${playersOnField} starters.`, 400, 'INVALID_TOURNAMENT_FORMATION');
    }
    return;
  }
  if (!formationPresetsForPlayers(playersOnField).includes(formation)) {
    throw new AppError(`Choose a formation compatible with ${playersOnField} players.`, 400, 'INVALID_TOURNAMENT_FORMATION');
  }
};

const ensureHostTournament = async ({ tournamentId, user }) => {
  const tournament = await Tournament.findOne({ _id: tournamentId, hostTeam: user.team });
  if (!tournament) throw new AppError('Tournament not found.', 404, 'TOURNAMENT_NOT_FOUND');
  return tournament;
};

const participantsMapFor = async (tournamentId) => {
  const participants = await TournamentParticipant.find({ tournament: tournamentId }).lean();
  return Object.fromEntries(participants.map((participant) => [idString(participant._id), serializeTournamentParticipantPublic(participant)]));
};

const serializeLineup = async (lineup) => serializeTournamentLineupHost(lineup, await participantsMapFor(lineup.tournament));

const ensureParticipant = async ({ tournament, participantId, fieldName = 'participant' }) => {
  const participant = await TournamentParticipant.findOne({ _id: participantId, tournament: tournament._id });
  if (!participant) throw new AppError(`${fieldName} does not belong to this tournament.`, 404, 'TOURNAMENT_PARTICIPANT_NOT_FOUND');
  return participant;
};

const ensureLineup = async ({ tournament, lineupId }) => {
  const lineup = await TournamentMatchdayLineup.findOne({ _id: lineupId, tournament: tournament._id });
  if (!lineup) throw new AppError('Lineup not found.', 404, 'TOURNAMENT_LINEUP_NOT_FOUND');
  return lineup;
};

const ensureEditable = (lineup) => {
  if (!editableStatuses.has(lineup.status)) throw new AppError('This lineup is read-only in its current status.', 409, 'TOURNAMENT_LINEUP_READ_ONLY');
};

const snapshotPlayer = (player) => ({
  squadPlayer: player._id,
  name: player.name,
  position: player.position,
  jersey: player.jersey,
  photoUrl: player.photo?.imageUrl || '',
  sourceType: player.sourceType,
});

const clearPlacement = (player) => ({
  ...player,
  slotId: '',
  lineIndex: null,
  positionIndex: null,
  roleLabel: '',
  x: null,
  y: null,
});

const selectedIds = (side) => new Set([...(side.startingPlayers || []), ...(side.substitutes || [])].map((player) => idString(player.squadPlayer)));

const ensureSquadForParticipant = async ({ tournament, participantId }) => {
  const squad = await TournamentSquad.findOne({ tournament: tournament._id, participant: participantId, status: { $in: readySquadStatuses } });
  if (!squad) throw new AppError('Participant squad must be approved or locked before matchday lineup selection.', 409, 'TOURNAMENT_SQUAD_NOT_READY');
  return squad;
};

const ensureSquadPlayer = async ({ tournament, participantId, squadPlayerId }) => {
  const squad = await ensureSquadForParticipant({ tournament, participantId });
  const player = await TournamentSquadPlayer.findOne({ _id: squadPlayerId, tournament: tournament._id, participant: participantId, squad: squad._id, isActive: true });
  if (!player) throw new AppError('Tournament squad player not found for this participant.', 404, 'TOURNAMENT_SQUAD_PLAYER_NOT_FOUND');
  return player;
};

const sideParticipantId = (lineup, side) => side === 'home' ? lineup.homeParticipant : lineup.awayParticipant;

const setSide = async ({ lineup, side, updates, actor, action, message }) => {
  const currentSide = typeof lineup[side]?.toObject === 'function' ? lineup[side].toObject() : (lineup[side] || {});
  lineup[side] = { ...currentSide, ...updates };
  lineup.updatedBy = actor._id;
  await lineup.save();
  await createLineupHistory({ tournament: lineup.tournament, lineup, action, actor: actor._id, actorRole: actor.role, message });
  return serializeLineup(lineup);
};

const addToSide = async ({ tournament, lineup, side, squadPlayerId, area, actor }) => {
  ensureEditable(lineup);
  const player = await ensureSquadPlayer({ tournament, participantId: sideParticipantId(lineup, side), squadPlayerId });
  const selected = selectedIds(lineup[side]);
  if (selected.has(idString(player._id))) throw new AppError('Player is already selected in this lineup side.', 409, 'TOURNAMENT_LINEUP_PLAYER_DUPLICATE');
  const currentSize = (lineup[side].startingPlayers || []).length + (lineup[side].substitutes || []).length;
  if (currentSize >= tournament.maximumMatchdaySquad) throw new AppError('Maximum matchday squad size reached.', 400, 'TOURNAMENT_MATCHDAY_SQUAD_LIMIT');
  const key = area === 'starting' ? 'startingPlayers' : 'substitutes';
  lineup[side][key].push(snapshotPlayer(player));
  lineup.updatedBy = actor._id;
  await lineup.save();
  await createLineupHistory({
    tournament,
    lineup,
    action: area === 'starting' ? 'player_added_to_starting' : 'player_added_to_bench',
    actor: actor._id,
    actorRole: actor.role,
    message: `${player.name} added to ${side} ${area === 'starting' ? 'starting lineup' : 'bench'}.`,
  });
  return serializeLineup(lineup);
};

const removeFromSide = async ({ lineup, side, squadPlayerId, actor }) => {
  ensureEditable(lineup);
  const before = JSON.stringify(lineup[side]);
  lineup[side].startingPlayers = (lineup[side].startingPlayers || []).filter((player) => idString(player.squadPlayer) !== idString(squadPlayerId));
  lineup[side].substitutes = (lineup[side].substitutes || []).filter((player) => idString(player.squadPlayer) !== idString(squadPlayerId));
  if (idString(lineup[side].captain?.squadPlayer) === idString(squadPlayerId)) lineup[side].captain = null;
  if (idString(lineup[side].goalkeeper?.squadPlayer) === idString(squadPlayerId)) lineup[side].goalkeeper = null;
  if (before === JSON.stringify(lineup[side])) throw new AppError('Player is not selected in this lineup side.', 404, 'TOURNAMENT_LINEUP_PLAYER_NOT_SELECTED');
  lineup.updatedBy = actor._id;
  await lineup.save();
  await createLineupHistory({ tournament: lineup.tournament, lineup, action: 'player_removed', actor: actor._id, actorRole: actor.role, message: 'Player removed from lineup.' });
  return serializeLineup(lineup);
};

const setLeadership = async ({ lineup, side, squadPlayerId, actor, kind }) => {
  ensureEditable(lineup);
  const starter = (lineup[side].startingPlayers || []).find((player) => idString(player.squadPlayer) === idString(squadPlayerId));
  if (!starter) throw new AppError(`${kind === 'captain' ? 'Captain' : 'Goalkeeper'} must be selected from starters.`, 400, `TOURNAMENT_LINEUP_${kind.toUpperCase()}_INVALID`);
  if (kind === 'goalkeeper' && starter.position !== 'GK') throw new AppError('Goalkeeper must have GK position.', 400, 'TOURNAMENT_LINEUP_GOALKEEPER_REQUIRED');
  lineup[side][kind] = starter;
  lineup.updatedBy = actor._id;
  await lineup.save();
  await createLineupHistory({
    tournament: lineup.tournament,
    lineup,
    action: kind === 'captain' ? 'captain_changed' : 'goalkeeper_changed',
    actor: actor._id,
    actorRole: actor.role,
    message: `${side} ${kind} changed to ${starter.name}.`,
  });
  return serializeLineup(lineup);
};

const assignStarterSlot = async ({ tournament, lineup, side, squadPlayerId, slotId, actor }) => {
  ensureEditable(lineup);
  const sideData = lineup[side] || {};
  const slots = formationSlots({
    formation: sideData.formation,
    customFormation: sideData.customFormation,
    playersOnField: tournament.playersOnField,
  });
  const slot = slots.find((item) => item.slotId === slotId);
  if (!slot) throw new AppError('Choose a valid formation slot before placing this player.', 400, 'TOURNAMENT_LINEUP_SLOT_INVALID');
  const starters = sideData.startingPlayers || [];
  const playerIndex = starters.findIndex((player) => idString(player.squadPlayer) === idString(squadPlayerId));
  if (playerIndex === -1) throw new AppError('Only selected starters can be placed on the pitch.', 400, 'TOURNAMENT_LINEUP_SLOT_PLAYER_INVALID');
  if (slot.slotId === 'GK' && idString(sideData.goalkeeper?.squadPlayer) !== idString(squadPlayerId)) {
    throw new AppError('Only the selected goalkeeper can occupy the GK slot.', 400, 'TOURNAMENT_LINEUP_GK_SLOT_INVALID');
  }
  const existingIndex = starters.findIndex((player) => player.slotId === slot.slotId);
  if (existingIndex !== -1 && existingIndex !== playerIndex) {
    const currentSlot = starters[playerIndex].slotId;
    starters[existingIndex] = currentSlot
      ? { ...(starters[existingIndex].toObject?.() || starters[existingIndex]), ...slots.find((item) => item.slotId === currentSlot) }
      : clearPlacement(starters[existingIndex].toObject?.() || starters[existingIndex]);
  }
  starters[playerIndex] = { ...(starters[playerIndex].toObject?.() || starters[playerIndex]), ...slot };
  lineup[side].startingPlayers = starters;
  lineup.updatedBy = actor._id;
  await lineup.save();
  await createLineupHistory({ tournament, lineup, action: 'formation_changed', actor: actor._id, actorRole: actor.role, message: 'Pitch slot placement updated.' });
  return serializeLineup(lineup);
};

const clearStarterSlot = async ({ lineup, side, squadPlayerId, actor }) => {
  ensureEditable(lineup);
  const starters = lineup[side]?.startingPlayers || [];
  const playerIndex = starters.findIndex((player) => idString(player.squadPlayer) === idString(squadPlayerId));
  if (playerIndex === -1) throw new AppError('Only selected starters can be cleared from the pitch.', 400, 'TOURNAMENT_LINEUP_SLOT_PLAYER_INVALID');
  starters[playerIndex] = clearPlacement(starters[playerIndex].toObject?.() || starters[playerIndex]);
  lineup[side].startingPlayers = starters;
  lineup.updatedBy = actor._id;
  await lineup.save();
  await createLineupHistory({ tournament: lineup.tournament, lineup, action: 'formation_changed', actor: actor._id, actorRole: actor.role, message: 'Pitch slot placement cleared.' });
  return serializeLineup(lineup);
};

export const autoPlaceStarters = ({ sideData = {}, playersOnField }) => {
  const slots = formationSlots({ formation: sideData.formation, customFormation: sideData.customFormation, playersOnField });
  const starters = sideData.startingPlayers || [];
  const used = new Set(starters.map((player) => player.slotId).filter(Boolean));
  const available = slots.filter((slot) => !used.has(slot.slotId));
  return starters.map((player) => {
    if (player.slotId) return player;
    if (idString(player.squadPlayer) === idString(sideData.goalkeeper?.squadPlayer)) {
      const gk = slots.find((slot) => slot.slotId === 'GK');
      if (gk && !used.has('GK')) {
        used.add('GK');
        return { ...player, ...gk };
      }
    }
    const slot = available.find((item) => item.slotId !== 'GK');
    if (!slot) return player;
    available.splice(available.indexOf(slot), 1);
    used.add(slot.slotId);
    return { ...player, ...slot };
  });
};

const validateSideComplete = (lineup, side, tournament) => {
  const data = lineup[side] || {};
  const starters = data.startingPlayers || [];
  const bench = data.substitutes || [];
  if (starters.length !== tournament.playersOnField) throw new AppError(`${side} lineup must contain exactly ${tournament.playersOnField} starters.`, 400, 'TOURNAMENT_LINEUP_STARTER_COUNT');
  if (starters.length + bench.length > tournament.maximumMatchdaySquad) throw new AppError(`${side} matchday squad exceeds the tournament limit.`, 400, 'TOURNAMENT_MATCHDAY_SQUAD_LIMIT');
  const ids = [...starters, ...bench].map((player) => idString(player.squadPlayer));
  if (new Set(ids).size !== ids.length) throw new AppError(`${side} lineup contains duplicate players.`, 400, 'TOURNAMENT_LINEUP_PLAYER_DUPLICATE');
  const captainId = idString(data.captain?.squadPlayer);
  if (!captainId || !starters.some((player) => idString(player.squadPlayer) === captainId)) throw new AppError(`${side} captain must be a starter.`, 400, 'TOURNAMENT_LINEUP_CAPTAIN_INVALID');
  const goalkeeperId = idString(data.goalkeeper?.squadPlayer);
  if (!goalkeeperId || !starters.some((player) => idString(player.squadPlayer) === goalkeeperId && player.position === 'GK')) throw new AppError(`${side} requires a starting goalkeeper.`, 400, 'TOURNAMENT_LINEUP_GOALKEEPER_REQUIRED');
  if (!data.formation) throw new AppError(`${side} formation is required.`, 400, 'TOURNAMENT_LINEUP_FORMATION_REQUIRED');
  validateTournamentFormation({ formation: data.formation, customFormation: data.customFormation, playersOnField: tournament.playersOnField });
  const slots = formationSlots({ formation: data.formation, customFormation: data.customFormation, playersOnField: tournament.playersOnField });
  const validSlotIds = new Set(slots.map((slot) => slot.slotId));
  const assignedSlotIds = starters.map((player) => player.slotId).filter(Boolean);
  if (assignedSlotIds.length !== starters.length) throw new AppError(`${side} lineup must place every starter on the pitch.`, 400, 'TOURNAMENT_LINEUP_PLACEMENT_REQUIRED');
  if (new Set(assignedSlotIds).size !== assignedSlotIds.length) throw new AppError(`${side} lineup contains duplicate pitch slots.`, 400, 'TOURNAMENT_LINEUP_SLOT_DUPLICATE');
  if (assignedSlotIds.some((slotId) => !validSlotIds.has(slotId))) throw new AppError(`${side} lineup contains a slot that does not belong to this formation.`, 400, 'TOURNAMENT_LINEUP_SLOT_INVALID');
  if (!starters.some((player) => idString(player.squadPlayer) === goalkeeperId && player.slotId === 'GK')) {
    throw new AppError(`${side} goalkeeper must occupy the GK slot.`, 400, 'TOURNAMENT_LINEUP_GK_SLOT_INVALID');
  }
};

const validateComplete = async ({ tournament, lineup }) => {
  await Promise.all([
    ensureSquadForParticipant({ tournament, participantId: lineup.homeParticipant }),
    ensureSquadForParticipant({ tournament, participantId: lineup.awayParticipant }),
  ]);
  validateSideComplete(lineup, 'home', tournament);
  validateSideComplete(lineup, 'away', tournament);
};

export const listHostedLineups = async ({ tournamentId, user, query = {} }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const [lineups, total, participants] = await Promise.all([
    TournamentMatchdayLineup.find({ tournament: tournament._id }).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    TournamentMatchdayLineup.countDocuments({ tournament: tournament._id }),
    participantsMapFor(tournament._id),
  ]);
  return { lineups: lineups.map((lineup) => serializeTournamentLineupHost(lineup, participants)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const createLineup = async ({ tournamentId, user, data }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const [home, away] = await Promise.all([
    ensureParticipant({ tournament, participantId: data.homeParticipant, fieldName: 'Home participant' }),
    ensureParticipant({ tournament, participantId: data.awayParticipant, fieldName: 'Away participant' }),
  ]);
  if (idString(home._id) === idString(away._id)) throw new AppError('Home and away participants must be different.', 400, 'TOURNAMENT_LINEUP_PARTICIPANTS_SAME');
  await Promise.all([
    ensureSquadForParticipant({ tournament, participantId: home._id }),
    ensureSquadForParticipant({ tournament, participantId: away._id }),
  ]);
  const lineup = await TournamentMatchdayLineup.create({
    tournament: tournament._id,
    provisionalFixtureKey: data.provisionalFixtureKey,
    homeParticipant: home._id,
    awayParticipant: away._id,
    createdBy: user._id,
    updatedBy: user._id,
  });
  await createLineupHistory({ tournament, lineup, action: 'lineup_created', actor: user._id, actorRole: user.role, message: 'Matchday lineup created.' });
  return { lineup: await serializeLineup(lineup) };
};

export const getHostedLineup = async ({ tournamentId, lineupId, user }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const lineup = await ensureLineup({ tournament, lineupId });
  return { lineup: await serializeLineup(lineup) };
};

export const updateLineupPairing = async ({ tournamentId, lineupId, user, data }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const lineup = await ensureLineup({ tournament, lineupId });
  ensureEditable(lineup);
  if (data.provisionalFixtureKey) lineup.provisionalFixtureKey = data.provisionalFixtureKey;
  if (data.homeParticipant || data.awayParticipant) {
    const homeId = data.homeParticipant || lineup.homeParticipant;
    const awayId = data.awayParticipant || lineup.awayParticipant;
    const [home, away] = await Promise.all([
      ensureParticipant({ tournament, participantId: homeId, fieldName: 'Home participant' }),
      ensureParticipant({ tournament, participantId: awayId, fieldName: 'Away participant' }),
    ]);
    if (idString(home._id) === idString(away._id)) throw new AppError('Home and away participants must be different.', 400, 'TOURNAMENT_LINEUP_PARTICIPANTS_SAME');
    lineup.homeParticipant = home._id;
    lineup.awayParticipant = away._id;
    lineup.home = {};
    lineup.away = {};
  }
  lineup.updatedBy = user._id;
  await lineup.save();
  return { lineup: await serializeLineup(lineup) };
};

export const getLineupEligiblePlayers = async ({ tournamentId, lineupId, side, user }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const lineup = await ensureLineup({ tournament, lineupId });
  const squad = await ensureSquadForParticipant({ tournament, participantId: sideParticipantId(lineup, side) });
  const players = await TournamentSquadPlayer.find({ tournament: tournament._id, participant: sideParticipantId(lineup, side), squad: squad._id, isActive: true }).sort({ jersey: 1, name: 1 }).lean();
  const selected = selectedIds(lineup[side]);
  return { players: players.map((player) => ({ ...serializeTournamentSquadPlayerPublic(player), selected: selected.has(idString(player._id)) })) };
};

export const updateLineupSide = async ({ tournamentId, lineupId, side, user, data }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const lineup = await ensureLineup({ tournament, lineupId });
  ensureEditable(lineup);
  const updates = {};
  if (Object.hasOwn(data, 'formation')) {
    validateTournamentFormation({ formation: data.formation, customFormation: data.customFormation, playersOnField: tournament.playersOnField });
    updates.formation = data.formation || '';
    updates.customFormation = data.formation === 'custom' ? data.customFormation : '';
    updates.startingPlayers = (lineup[side].startingPlayers || []).map(clearPlacement);
  }
  return { lineup: await setSide({ lineup, side, updates, actor: user, action: 'formation_changed', message: `${side} formation updated.` }) };
};

const mutationContext = async ({ tournamentId, lineupId, user }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const lineup = await ensureLineup({ tournament, lineupId });
  return { tournament, lineup };
};

export const addStarter = async ({ tournamentId, lineupId, side, user, squadPlayerId }) => {
  const { tournament, lineup } = await mutationContext({ tournamentId, lineupId, user });
  return { lineup: await addToSide({ tournament, lineup, side, user, actor: user, squadPlayerId, area: 'starting' }) };
};

export const addSubstitute = async ({ tournamentId, lineupId, side, user, squadPlayerId }) => {
  const { tournament, lineup } = await mutationContext({ tournamentId, lineupId, user });
  return { lineup: await addToSide({ tournament, lineup, side, user, actor: user, squadPlayerId, area: 'bench' }) };
};

export const removePlayer = async ({ tournamentId, lineupId, side, user, squadPlayerId }) => {
  const { lineup } = await mutationContext({ tournamentId, lineupId, user });
  return { lineup: await removeFromSide({ lineup, side, user, actor: user, squadPlayerId }) };
};

export const setCaptain = async ({ tournamentId, lineupId, side, user, squadPlayerId }) => {
  const { lineup } = await mutationContext({ tournamentId, lineupId, user });
  return { lineup: await setLeadership({ lineup, side, user, actor: user, squadPlayerId, kind: 'captain' }) };
};

export const setGoalkeeper = async ({ tournamentId, lineupId, side, user, squadPlayerId }) => {
  const { lineup } = await mutationContext({ tournamentId, lineupId, user });
  return { lineup: await setLeadership({ lineup, side, user, actor: user, squadPlayerId, kind: 'goalkeeper' }) };
};

export const assignSlot = async ({ tournamentId, lineupId, side, user, squadPlayerId, slotId }) => {
  const { tournament, lineup } = await mutationContext({ tournamentId, lineupId, user });
  return { lineup: await assignStarterSlot({ tournament, lineup, side, user, actor: user, squadPlayerId, slotId }) };
};

export const clearSlot = async ({ tournamentId, lineupId, side, user, squadPlayerId }) => {
  const { lineup } = await mutationContext({ tournamentId, lineupId, user });
  return { lineup: await clearStarterSlot({ lineup, side, user, actor: user, squadPlayerId }) };
};

export const submitLineup = async ({ tournamentId, lineupId, user }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const lineup = await ensureLineup({ tournament, lineupId });
  ensureEditable(lineup);
  await validateComplete({ tournament, lineup });
  lineup.status = TOURNAMENT_LINEUP_STATUS.SUBMITTED;
  lineup.home.submittedAt = new Date();
  lineup.away.submittedAt = new Date();
  lineup.updatedBy = user._id;
  await lineup.save();
  await createLineupHistory({ tournament, lineup, action: 'lineup_submitted', actor: user._id, actorRole: user.role, message: 'Matchday lineup submitted.' });
  return { lineup: await serializeLineup(lineup) };
};

export const lockLineup = async ({ tournamentId, lineupId, user }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  if (tournament.approvalStatus !== TOURNAMENT_APPROVAL_STATUS.APPROVED || tournament.lifecycleStatus === TOURNAMENT_LIFECYCLE_STATUS.ARCHIVED) {
    throw new AppError('Tournament must be approved and active before locking lineups.', 409, 'TOURNAMENT_NOT_OPERATIONAL');
  }
  const lineup = await ensureLineup({ tournament, lineupId });
  if (lineup.matchCreated) throw new AppError('Lineup is already attached to a future match and cannot be changed.', 409, 'TOURNAMENT_LINEUP_MATCH_ATTACHED');
  if (![TOURNAMENT_LINEUP_STATUS.DRAFT, TOURNAMENT_LINEUP_STATUS.SUBMITTED].includes(lineup.status)) throw new AppError('Only draft or submitted lineups can be locked.', 409, 'TOURNAMENT_LINEUP_LOCK_INVALID');
  await validateComplete({ tournament, lineup });
  lineup.status = TOURNAMENT_LINEUP_STATUS.LOCKED;
  lineup.home.lockedAt = new Date();
  lineup.away.lockedAt = new Date();
  lineup.updatedBy = user._id;
  await lineup.save();
  await createLineupHistory({ tournament, lineup, action: 'lineup_locked', actor: user._id, actorRole: user.role, message: 'Matchday lineup locked.' });
  return { lineup: await serializeLineup(lineup) };
};

export const unlockLineup = async ({ tournamentId, lineupId, user }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  const lineup = await ensureLineup({ tournament, lineupId });
  if (lineup.matchCreated) throw new AppError('Lineup is attached to a future match and cannot be unlocked.', 409, 'TOURNAMENT_LINEUP_MATCH_ATTACHED');
  if (lineup.status !== TOURNAMENT_LINEUP_STATUS.LOCKED) throw new AppError('Only locked lineups can be unlocked.', 409, 'TOURNAMENT_LINEUP_UNLOCK_INVALID');
  lineup.status = TOURNAMENT_LINEUP_STATUS.DRAFT;
  lineup.home.lockedAt = null;
  lineup.away.lockedAt = null;
  lineup.updatedBy = user._id;
  await lineup.save();
  await createLineupHistory({ tournament, lineup, action: 'lineup_unlocked', actor: user._id, actorRole: user.role, message: 'Matchday lineup unlocked.' });
  return { lineup: await serializeLineup(lineup) };
};

export const hostedLineupHistory = async ({ tournamentId, lineupId, user, query }) => {
  const tournament = await ensureHostTournament({ tournamentId, user });
  await ensureLineup({ tournament, lineupId });
  return listLineupHistory({ tournamentId: tournament._id, lineupId, query });
};

export const listAdminLineups = async ({ tournamentId }) => {
  if (!mongoose.isValidObjectId(tournamentId)) throw new AppError('Invalid tournament identifier.', 400, 'INVALID_TOURNAMENT_ID');
  const [lineups, participants] = await Promise.all([
    TournamentMatchdayLineup.find({ tournament: tournamentId }).sort({ updatedAt: -1 }).lean(),
    participantsMapFor(tournamentId),
  ]);
  return { lineups: lineups.map((lineup) => serializeTournamentLineupHost(lineup, participants)) };
};

export const getAdminLineup = async ({ tournamentId, lineupId }) => {
  if (!mongoose.isValidObjectId(tournamentId) || !mongoose.isValidObjectId(lineupId)) throw new AppError('Invalid lineup identifier.', 400, 'INVALID_TOURNAMENT_LINEUP_ID');
  const lineup = await TournamentMatchdayLineup.findOne({ _id: lineupId, tournament: tournamentId }).lean();
  if (!lineup) throw new AppError('Lineup not found.', 404, 'TOURNAMENT_LINEUP_NOT_FOUND');
  return { lineup: serializeTournamentLineupHost(lineup, await participantsMapFor(tournamentId)) };
};

export const getAdminLineupHistory = async ({ tournamentId, lineupId, query }) => {
  await getAdminLineup({ tournamentId, lineupId });
  return listLineupHistory({ tournamentId, lineupId, query });
};
