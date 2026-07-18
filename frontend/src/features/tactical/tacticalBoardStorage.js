import { DEFAULT_FORMATION_ID } from './formationDefinitions.js';
import { normalizePlan, validateTacticalPlan } from './tacticalBoardValidation.js';

export const TACTICAL_BOARD_VERSION = 1;

export const tacticalBoardKey = (teamId) => `footstream:tactical-board:${teamId || 'unknown-team'}`;

export const createEmptyPlan = (teamId, players = []) => normalizePlan({
  version: TACTICAL_BOARD_VERSION,
  teamId,
  formation: DEFAULT_FORMATION_ID,
  mode: 'preset',
  pitchPlayers: [],
  benchPlayerIds: players.map((player) => String(player._id || player.id)),
  captainId: '',
  viceCaptainId: '',
  goalkeeperId: '',
  updatedAt: null,
}, players, teamId);

const storageAvailable = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
};

export const loadTacticalPlan = (teamId, players = []) => {
  if (!storageAvailable()) return createEmptyPlan(teamId, players);
  try {
    const raw = window.localStorage.getItem(tacticalBoardKey(teamId));
    if (!raw) return createEmptyPlan(teamId, players);
    const parsed = JSON.parse(raw);
    if (parsed?.version !== TACTICAL_BOARD_VERSION || String(parsed.teamId || '') !== String(teamId || '')) {
      return createEmptyPlan(teamId, players);
    }
    return normalizePlan(parsed, players, teamId);
  } catch {
    return createEmptyPlan(teamId, players);
  }
};

export const saveTacticalPlan = (teamId, plan, players = []) => {
  const normalized = normalizePlan({ ...plan, updatedAt: new Date().toISOString() }, players, teamId);
  const errors = validateTacticalPlan(normalized, players);
  if (errors.length) return { ok: false, errors, plan: normalized };
  if (!storageAvailable()) return { ok: false, errors: ['Your browser storage is unavailable, so the tactical plan could not be saved.'], plan: normalized };
  window.localStorage.setItem(tacticalBoardKey(teamId), JSON.stringify(normalized));
  return { ok: true, errors: [], plan: normalized };
};

export const clearTacticalPlan = (teamId) => {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(tacticalBoardKey(teamId));
};

