import { TOURNAMENT_NOTIFICATION_TYPE } from '../constants/tournamentConstants.js';
import { createNotificationForSuperAdmins, createNotificationForTeam } from './notificationService.js';

const idString = (value) => String(value?._id || value || '');
const teamName = (team) => team?.name || 'FootStream team';
const tournamentName = (tournament) => tournament?.name || 'Tournament';

export const notifyTournamentApprovalSubmitted = async ({ tournament, hostTeam }) =>
  createNotificationForSuperAdmins({
    type: TOURNAMENT_NOTIFICATION_TYPE.APPROVAL_SUBMITTED,
    title: 'Tournament submitted for approval',
    message: `${tournamentName(tournament)} by ${teamName(hostTeam)} is ready for review.`,
    entityType: 'tournament',
    entityId: tournament._id,
    actionUrl: `/admin/tournaments/${tournament._id}`,
    dedupeKey: `tournament:${tournament._id}:approval-submitted:${tournament.submittedAt?.getTime?.() || Date.now()}`,
  });

export const notifyTournamentHostTeam = async ({ tournament, type, title, message, dedupeKeySuffix }) => {
  if (!tournament?.hostTeam) return;
  await createNotificationForTeam({
    teamId: tournament.hostTeam,
    type,
    title,
    message,
    entityType: 'tournament',
    entityId: tournament._id,
    actionUrl: `/team/hosted-tournaments/${tournament._id}`,
    dedupeKey: `tournament:${tournament._id}:${dedupeKeySuffix}`,
  });
};

export const notifyParticipantTeam = async ({ tournament, participant, teamId, type, title, message, dedupeKeySuffix }) => {
  if (!teamId) return;
  await createNotificationForTeam({
    teamId,
    type,
    title,
    message,
    entityType: 'tournamentParticipant',
    entityId: participant._id,
    actionUrl: `/team/tournaments/${tournament._id}`,
    dedupeKey: `tournament:${tournament._id}:participant:${idString(teamId)}:${dedupeKeySuffix}`,
  });
};
