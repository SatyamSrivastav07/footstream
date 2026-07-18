import { TEAM_STATUSES } from '../models/Team.js';
import AppError from '../utils/AppError.js';

export const normalizeTeamStatus = (team = {}) => {
  if (team.isArchived || team.status === TEAM_STATUSES.ARCHIVED) return TEAM_STATUSES.ARCHIVED;
  return team.status || TEAM_STATUSES.APPROVED;
};

export const TEAM_STATUS_TRANSITIONS = Object.freeze({
  [TEAM_STATUSES.PENDING]: [TEAM_STATUSES.APPROVED, TEAM_STATUSES.REJECTED, TEAM_STATUSES.CHANGES_REQUESTED],
  [TEAM_STATUSES.CHANGES_REQUESTED]: [TEAM_STATUSES.PENDING, TEAM_STATUSES.APPROVED, TEAM_STATUSES.REJECTED],
  [TEAM_STATUSES.REJECTED]: [TEAM_STATUSES.PENDING],
  [TEAM_STATUSES.APPROVED]: [TEAM_STATUSES.SUSPENDED, TEAM_STATUSES.ARCHIVED],
  [TEAM_STATUSES.SUSPENDED]: [TEAM_STATUSES.APPROVED, TEAM_STATUSES.ARCHIVED],
  [TEAM_STATUSES.ARCHIVED]: [],
});

export const assertTeamTransition = (team, nextStatus) => {
  const current = normalizeTeamStatus(team);
  if (current === nextStatus) {
    throw new AppError(`Team is already ${nextStatus}.`, 409, 'TEAM_STATUS_UNCHANGED');
  }
  if (!TEAM_STATUS_TRANSITIONS[current]?.includes(nextStatus)) {
    throw new AppError(`Team cannot move from ${current} to ${nextStatus}.`, 409, 'TEAM_STATUS_TRANSITION_INVALID');
  }
  return current;
};

export const assertTeamOperational = (team) => {
  const status = normalizeTeamStatus(team);
  if (status !== TEAM_STATUSES.APPROVED) {
    throw new AppError('This team is not approved for active team operations.', 403, 'TEAM_NOT_OPERATIONAL');
  }
};
