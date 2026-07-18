import { clampCoordinate, getFormationDefinition, isManualFormation } from './formationDefinitions.js';
import { normalizePlan, playerIdOf } from './tacticalBoardValidation.js';

const positionGroup = (position = '') => {
  const key = String(position).toUpperCase();
  if (key === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(key)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'MID'].includes(key)) return 'MID';
  if (['LW', 'RW', 'ST', 'CF', 'FWD'].includes(key)) return 'FWD';
  return 'ANY';
};

const roleOrder = { GK: 0, DEF: 1, MID: 2, AM: 3, FWD: 4, ANY: 5 };

const sortPlayers = (players) => [...players].sort((a, b) =>
  roleOrder[positionGroup(a.position)] - roleOrder[positionGroup(b.position)] ||
  Number(a.jerseyNumber || 999) - Number(b.jerseyNumber || 999) ||
  String(a.name || '').localeCompare(String(b.name || '')));

const takeBestPlayer = (pool, slotRole) => {
  const wanted = slotRole === 'AM' ? 'MID' : slotRole;
  let index = pool.findIndex((player) => positionGroup(player.position) === wanted);
  if (slotRole === 'GK' && index === -1) index = 0;
  if (index === -1 && slotRole !== 'GK') index = pool.findIndex((player) => positionGroup(player.position) !== 'GK');
  if (index === -1) index = 0;
  if (index === -1) return null;
  const [player] = pool.splice(index, 1);
  return player;
};

export const autoArrangeTacticalPlan = ({ teamId, formation, players = [], currentPlan }) => {
  const definition = getFormationDefinition(formation);
  const pool = sortPlayers(players.filter((player) => player.isActive !== false));
  const pitchPlayers = [];
  if (isManualFormation(formation)) {
    const template = getFormationDefinition('4-3-3').slots;
    template.forEach((slot) => {
      const player = takeBestPlayer(pool, slot.role);
      if (player) {
        pitchPlayers.push({
          playerId: playerIdOf(player),
          slotId: null,
          x: clampCoordinate(slot.x),
          y: clampCoordinate(slot.y),
        });
      }
    });
  } else {
    definition.slots.forEach((slot) => {
      const player = takeBestPlayer(pool, slot.role);
      if (player) pitchPlayers.push({ playerId: playerIdOf(player), slotId: slot.id, x: null, y: null });
    });
  }

  const assigned = new Set(pitchPlayers.map((entry) => entry.playerId));
  const next = normalizePlan({
    ...currentPlan,
    formation,
    mode: definition.mode,
    pitchPlayers,
    benchPlayerIds: players.map(playerIdOf).filter((playerId) => !assigned.has(playerId)),
    goalkeeperId: pitchPlayers.find((entry) => {
      const player = players.find((item) => playerIdOf(item) === entry.playerId);
      return positionGroup(player?.position) === 'GK';
    })?.playerId || pitchPlayers[0]?.playerId || '',
  }, players, teamId);

  return next;
};

