import { clampCoordinate, getFormationDefinition, isManualFormation } from './formationDefinitions.js';

export const playerIdOf = (player) => String(player?._id || player?.id || player?.playerId || player || '');

export const unique = (values) => [...new Set(values.filter(Boolean).map(String))];

export const normalizePlan = (plan, players = [], teamId = '') => {
  const validPlayers = new Set(players.map(playerIdOf));
  const formation = getFormationDefinition(plan?.formation)?.id;
  const manual = isManualFormation(formation);
  const validSlots = new Set(getFormationDefinition(formation).slots.map((slot) => slot.id));
  const seen = new Set();
  const pitchPlayers = [];

  (Array.isArray(plan?.pitchPlayers) ? plan.pitchPlayers : []).forEach((entry) => {
    const playerId = playerIdOf(entry?.playerId);
    if (!validPlayers.has(playerId) || seen.has(playerId)) return;
    seen.add(playerId);
    if (manual) {
      pitchPlayers.push({
        playerId,
        slotId: null,
        x: clampCoordinate(entry?.x),
        y: clampCoordinate(entry?.y),
      });
      return;
    }
    if (!entry?.slotId || !validSlots.has(String(entry.slotId))) return;
    pitchPlayers.push({
      playerId,
      slotId: String(entry.slotId),
      x: null,
      y: null,
    });
  });

  const benchSeen = new Set(seen);
  const restoredBench = (Array.isArray(plan?.benchPlayerIds) ? plan.benchPlayerIds : [])
    .map(String)
    .filter((playerId) => validPlayers.has(playerId) && !benchSeen.has(playerId) && !benchSeen.has(`bench:${playerId}`));
  restoredBench.forEach((playerId) => benchSeen.add(playerId));
  const newPlayers = players.map(playerIdOf).filter((playerId) => !benchSeen.has(playerId));
  const playerIdsInPlan = new Set([...pitchPlayers.map((entry) => entry.playerId), ...restoredBench, ...newPlayers]);
  const roleId = (value) => {
    const playerId = playerIdOf(value);
    return playerIdsInPlan.has(playerId) ? playerId : '';
  };

  return {
    version: 1,
    teamId,
    formation,
    mode: manual ? 'manual' : 'preset',
    pitchPlayers,
    benchPlayerIds: [...restoredBench, ...newPlayers],
    captainId: roleId(plan?.captainId),
    viceCaptainId: roleId(plan?.viceCaptainId),
    goalkeeperId: roleId(plan?.goalkeeperId),
    updatedAt: plan?.updatedAt || null,
  };
};

export const validateTacticalPlan = (plan, players = []) => {
  const errors = [];
  const playerIds = new Set(players.map(playerIdOf));
  const pitch = Array.isArray(plan?.pitchPlayers) ? plan.pitchPlayers : [];
  const bench = Array.isArray(plan?.benchPlayerIds) ? plan.benchPlayerIds : [];
  const allIds = [...pitch.map((entry) => entry.playerId), ...bench].filter(Boolean).map(String);
  if (new Set(allIds).size !== allIds.length) errors.push('A player can appear only once on the pitch or bench.');

  const definition = getFormationDefinition(plan?.formation);
  if (!definition) errors.push('Choose a valid formation.');
  const validSlots = new Set(definition.slots.map((slot) => slot.id));
  if (!isManualFormation(plan?.formation)) {
    if (pitch.length > definition.playerCount) errors.push(`This formation allows a maximum of ${definition.playerCount} players on the pitch.`);
    const slotIds = pitch.map((entry) => entry.slotId).filter(Boolean);
    if (new Set(slotIds).size !== slotIds.length) errors.push('Each pitch slot can contain only one player.');
    if (slotIds.some((slotId) => !validSlots.has(slotId))) errors.push('One or more players are assigned to an invalid formation slot.');
  } else if (pitch.some((entry) => entry.x < 0 || entry.x > 100 || entry.y < 0 || entry.y > 100)) {
    errors.push('Manual player coordinates must stay inside the pitch.');
  }

  const planPlayerIds = new Set(allIds);
  ['captainId', 'viceCaptainId', 'goalkeeperId'].forEach((field) => {
    if (plan?.[field] && (!planPlayerIds.has(String(plan[field])) || !playerIds.has(String(plan[field])))) errors.push('Leadership roles must reference players in this tactical plan.');
  });
  if (plan?.captainId && plan?.viceCaptainId && String(plan.captainId) === String(plan.viceCaptainId)) errors.push('Captain and Vice Captain must be different players.');
  return errors;
};

