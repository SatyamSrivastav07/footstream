import webPush from 'web-push';
import Match from '../models/Match.js';
import PushDelivery from '../models/PushDelivery.js';
import TeamFollow from '../models/TeamFollow.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

const preferenceForEvent = {
  team_match_reminder: 'matchReminder',
  team_match_started: 'matchStarted',
  team_goal: 'goal',
  team_half_time: 'halfTime',
  team_full_time: 'fullTime',
  team_result_published: 'resultPublished',
};

let configured = false;
const configureWebPush = () => {
  if (configured || !env.push.vapidPublicKey || !env.push.vapidPrivateKey) return Boolean(configured);
  webPush.setVapidDetails(env.push.vapidSubject, env.push.vapidPublicKey, env.push.vapidPrivateKey);
  configured = true;
  return true;
};

export const publicVapidKey = () => env.push.vapidPublicKey || '';

const publicPath = (path) => (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/');

export const serializePushPayload = ({ title, body, icon = '/favicon.svg', badge = '/favicon.svg', actionUrl = '/', tag, type, teamSlug, matchId }) => ({
  title: String(title || 'FootStream').slice(0, 120),
  body: String(body || '').slice(0, 240),
  icon,
  badge,
  actionUrl: publicPath(actionUrl),
  tag: String(tag || type || 'footstream').slice(0, 120),
  type,
  teamSlug,
  matchId: matchId ? String(matchId) : undefined,
});

const markDelivery = async ({ deliveryModel, follow, team, match, eventType, eventKey }) => {
  try {
    return await deliveryModel.create({ follow: follow._id, team, match, eventType, eventKey, status: 'pending' });
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
};

export const deliverToFollowers = async ({
  followModel = TeamFollow,
  deliveryModel = PushDelivery,
  webPushClient = webPush,
  teamIds,
  matchId = null,
  eventType,
  eventKey,
  payload,
}) => {
  if (webPushClient === webPush && !configureWebPush()) return { attempted: 0, sent: 0, failed: 0, skipped: 0, disabled: true };
  const pref = preferenceForEvent[eventType];
  const teams = [...new Set(teamIds.filter(Boolean).map(String))];
  const followers = await followModel.find({
    team: { $in: teams },
    isActive: true,
    'pushSubscription.endpoint': { $type: 'string', $ne: '' },
    ...(pref ? { [`preferences.${pref}`]: { $ne: false } } : {}),
  }).limit(1000);
  let sent = 0; let failed = 0; let skipped = 0;
  await Promise.allSettled(followers.map(async (follow) => {
    const delivery = await markDelivery({ deliveryModel, follow, team: follow.team, match: matchId, eventType, eventKey });
    if (!delivery) { skipped += 1; return; }
    try {
      await webPushClient.sendNotification(follow.pushSubscription, JSON.stringify(payload));
      delivery.status = 'sent';
      delivery.sentAt = new Date();
      sent += 1;
    } catch (error) {
      const statusCode = error?.statusCode;
      delivery.status = [404, 410].includes(statusCode) ? 'expired' : 'failed';
      delivery.errorCode = statusCode ? String(statusCode) : 'PUSH_SEND_FAILED';
      failed += 1;
      if ([404, 410].includes(statusCode)) {
        follow.pushSubscription = null;
        follow.isActive = false;
        follow.unfollowedAt = new Date();
        await follow.save();
      }
    }
    await delivery.save();
  }));
  return { attempted: followers.length, sent, failed, skipped, disabled: false };
};

const matchTeams = (match) => [match.team, match.registeredOpponentTeam].filter(Boolean).map((team) => team._id || team);

const PLACEHOLDER_PATTERN = /\{(?:teamName|opponentName|score|scorerName|matchTime)\}/g;

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');
const teamName = (match) => cleanText(match?.team?.name);
const opponentName = (match) => cleanText(match?.registeredOpponentTeam?.name) || cleanText(match?.opponent?.name) || 'Opponent';
const scoreText = (state = {}) => {
  const homeScore = Number.isFinite(Number(state.homeScore)) ? Number(state.homeScore) : null;
  const awayScore = Number.isFinite(Number(state.awayScore)) ? Number(state.awayScore) : null;
  return homeScore === null || awayScore === null ? '' : `${homeScore}-${awayScore}`;
};
const minuteText = (event = {}) => {
  const minute = Number(event.minute);
  return Number.isFinite(minute) && minute >= 0 ? `${minute}'` : '';
};
const noUnresolvedPlaceholders = (value, fallback) => {
  const rendered = cleanText(value).replace(PLACEHOLDER_PATTERN, '').trim();
  return rendered || fallback;
};

export const matchStartedBody = (match) => {
  const name = teamName(match);
  return name ? `${name} match has kicked off.` : 'A followed team match has kicked off.';
};

export const halfTimeBody = (match) => {
  const name = teamName(match);
  return name ? `${name} match has reached half-time.` : 'A followed team match has reached half-time.';
};

export const fullTimeBody = (match) => {
  const name = teamName(match);
  return name ? `${name} match has finished.` : 'A followed team match has finished.';
};

export const resultPublishedBody = (match) => {
  const name = teamName(match);
  return name ? `${name} match result is now official.` : 'Match result is now official.';
};

export const goalBody = ({ match, event = {}, state = {} }) => {
  const scorer = cleanText(event.playerSnapshot?.name) || cleanText(event.opponentPlayerName) || 'Goal';
  const score = scoreText(state);
  const minute = minuteText(event);
  const opponent = opponentName(match);
  const details = [
    minute ? `${minute} minute` : '',
    score ? `Score: ${score}` : '',
    opponent ? `vs ${opponent}` : '',
  ].filter(Boolean).join(' · ');
  return details ? `${scorer} scored. ${details}.` : `${scorer} scored.`;
};

export const reminderBody = (match) => {
  const name = teamName(match);
  const opponent = opponentName(match);
  return name ? `${name} vs ${opponent} is coming up.` : `Match vs ${opponent} is coming up.`;
};

export const buildMatchPayload = ({ match, eventType, title, body, tag }) => serializePushPayload({
  title,
  body: noUnresolvedPlaceholders(body, 'FootStream match update.'),
  type: eventType,
  tag,
  teamSlug: match.team?.slug,
  matchId: match._id,
  actionUrl: `/live/${match._id}`,
});

export const dispatchMatchPush = async ({ matchModel = Match, matchId, eventType, eventKey, title, body, bodyForMatch }) => {
  const match = await matchModel.findById(matchId).populate('team', 'name slug isPublished isArchived').populate('registeredOpponentTeam', 'name slug isPublished isArchived');
  if (!match || !match.team?.isPublished || match.team?.isArchived) return { skipped: true };
  const renderedBody = typeof bodyForMatch === 'function' ? bodyForMatch(match) : body;
  const payload = buildMatchPayload({ match, eventType, title, body: renderedBody, tag: eventKey });
  return deliverToFollowers({ teamIds: matchTeams(match), matchId: match._id, eventType, eventKey, payload });
};

export const queueMatchStartedPush = (matchId) => {
  void dispatchMatchPush({ matchId, eventType: 'team_match_started', eventKey: `match-started:${matchId}`, title: 'Match started', bodyForMatch: matchStartedBody }).catch(() => {});
};

export const queueHalfTimePush = (matchId) => {
  void dispatchMatchPush({ matchId, eventType: 'team_half_time', eventKey: `half-time:${matchId}`, title: 'Half-time', bodyForMatch: halfTimeBody }).catch(() => {});
};

export const queueFullTimePush = (matchId) => {
  void dispatchMatchPush({ matchId, eventType: 'team_full_time', eventKey: `full-time:${matchId}`, title: 'Full-time', bodyForMatch: fullTimeBody }).catch(() => {});
};

export const queueResultPublishedPush = (matchId) => {
  void dispatchMatchPush({ matchId, eventType: 'team_result_published', eventKey: `result-published:${matchId}`, title: 'Result published', bodyForMatch: resultPublishedBody }).catch(() => {});
};

export const queueGoalPush = (matchId, event, state) => {
  void dispatchMatchPush({ matchId, eventType: 'team_goal', eventKey: `goal:${event._id}`, title: 'Goal alert', bodyForMatch: (match) => goalBody({ match, event, state }) }).catch(() => {});
};

export const sendManualMatchReminder = async ({ matchModel = Match, teamId, matchId }) => {
  const match = await matchModel.findOne({ _id: matchId, team: teamId, status: 'scheduled', isActive: true }).populate('team', 'name slug isPublished isArchived').populate('registeredOpponentTeam', 'name slug isPublished isArchived');
  if (!match) {
    throw new AppError('Scheduled match not found.', 404, 'MATCH_NOT_FOUND');
  }
  return deliverToFollowers({
    teamIds: matchTeams(match),
    matchId: match._id,
    eventType: 'team_match_reminder',
    eventKey: `match-reminder:${match._id}`,
    payload: buildMatchPayload({
      match,
      eventType: 'team_match_reminder',
      title: `${teamName(match) || 'FootStream'} match reminder`,
      body: reminderBody(match),
      tag: `match-reminder:${match._id}`,
    }),
  });
};
