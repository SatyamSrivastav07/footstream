import { DEFAULT_FORMATION_ID } from './formationDefinitions.js';
import { normalizePlan, validateTacticalPlan } from './tacticalBoardValidation.js';

export const TACTICAL_BOARD_VERSION = 1;
export const TACTICAL_LIBRARY_VERSION = 1;
export const TACTICAL_LIBRARY_LIMIT = 10;

export const tacticalBoardKey = (teamId) => `footstream:tactical-board:${teamId || 'unknown-team'}`;
export const tacticalLibraryKey = (teamId) => `footstream:tactical-board-library:${teamId || 'unknown-team'}`;

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

const planTitle = (plan, fallback = 'Untitled formation') => String(plan?.title || fallback).trim().slice(0, 80) || fallback;
const planId = () => `formation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createLibraryItem = (teamId, plan, players = [], title = '') => {
  const now = new Date().toISOString();
  const normalized = normalizePlan({ ...plan, updatedAt: now }, players, teamId);
  return {
    id: plan.id || planId(),
    title: planTitle({ title }, `${normalized.formation} plan`),
    favourite: Boolean(plan.favourite),
    preview: {
      formation: normalized.formation,
      pitchPlayers: normalized.pitchPlayers.map(({ playerId, slotId, x, y }) => ({ playerId, slotId, x, y })),
    },
    plan: normalized,
    createdAt: plan.createdAt || now,
    updatedAt: now,
    lastUsedAt: plan.lastUsedAt || now,
  };
};

export const loadTacticalLibrary = (teamId, players = []) => {
  if (!storageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(tacticalLibraryKey(teamId));
    if (!raw) {
      const legacy = loadTacticalPlan(teamId, players);
      return legacy.updatedAt ? [createLibraryItem(teamId, legacy, players, 'Default tactical plan')] : [];
    }
    const parsed = JSON.parse(raw);
    if (parsed?.version !== TACTICAL_LIBRARY_VERSION || String(parsed.teamId || '') !== String(teamId || '')) return [];
    return (Array.isArray(parsed.items) ? parsed.items : [])
      .slice(0, TACTICAL_LIBRARY_LIMIT)
      .map((item) => createLibraryItem(teamId, { ...(item.plan || {}), id: item.id, favourite: item.favourite, createdAt: item.createdAt, lastUsedAt: item.lastUsedAt }, players, item.title));
  } catch {
    return [];
  }
};

export const saveTacticalLibrary = (teamId, items = []) => {
  if (!storageAvailable()) return { ok: false, error: 'Your browser storage is unavailable.' };
  const payload = {
    version: TACTICAL_LIBRARY_VERSION,
    teamId,
    items: items.slice(0, TACTICAL_LIBRARY_LIMIT),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(tacticalLibraryKey(teamId), JSON.stringify(payload));
  return { ok: true, library: payload };
};

export const upsertTacticalLibraryItem = (teamId, items, item) => {
  const without = items.filter((existing) => existing.id !== item.id);
  const next = [item, ...without].slice(0, TACTICAL_LIBRARY_LIMIT);
  const result = saveTacticalLibrary(teamId, next);
  return result.ok ? next : items;
};

export const removeTacticalLibraryItem = (teamId, items, itemId) => {
  const next = items.filter((item) => item.id !== itemId);
  const result = saveTacticalLibrary(teamId, next);
  return result.ok ? next : items;
};
