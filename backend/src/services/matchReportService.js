import Match from '../models/Match.js';
import MatchEvent from '../models/MatchEvent.js';
import AppError from '../utils/AppError.js';
import { deriveResult } from './resultService.js';

const escapeHtml = (value = '') => String(value).replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[char]));
const idString = (value) => String(value?._id || value || '');
const list = (items, render) => items?.length ? `<ul>${items.map(render).join('')}</ul>` : '<p class="muted">None recorded.</p>';

export const buildMatchReportHtml = ({ match, events = [], publicUrl = '' }) => {
  const result = match.result || deriveResult(match, events);
  const title = `${match.team?.name || 'Team'} vs ${match.opponent?.name || 'Opponent'}`;
  const reportId = `FS-${idString(match._id).slice(-8).toUpperCase()}`;
  const onlineUrl = publicUrl ? `${publicUrl.replace(/\/$/, '')}/matches/${idString(match._id)}/result` : '';
  const eventRows = list(events, (event) => `<li><strong>${escapeHtml(event.type.replaceAll('_', ' '))}</strong> ${event.minute}' ${escapeHtml(event.playerSnapshot?.name || event.temporaryOpponentPlayerName || event.description || '')}</li>`);
  const players = (items) => list(items, (player) => `<li>#${player.jerseyNumber || '-'} ${escapeHtml(player.name)} <span>${escapeHtml(player.position)}</span></li>`);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} Report</title><style>body{font-family:Inter,Arial,sans-serif;margin:0;color:#0f172a;background:#f8fafc}.page{max-width:920px;margin:0 auto;padding:36px}.hero{background:#07110d;color:white;border-radius:28px;padding:30px}.brand{color:#bef264;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.score{font-size:56px;font-weight:900;margin:18px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{background:white;border:1px solid #e2e8f0;border-radius:20px;padding:18px;margin-top:18px}.muted{color:#64748b}li{margin:8px 0}button{display:none}@media print{.page{padding:0}.card,.hero{break-inside:avoid}}</style></head><body><main class="page"><section class="hero"><p class="brand">FootStream Match Report</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(match.matchType)} · ${escapeHtml(match.tournament || 'Independent match')} · ${new Date(match.scheduledAt).toLocaleString()}</p><div class="score">${result.finalTeamScore} - ${result.finalOpponentScore}</div><p>${escapeHtml(match.venue || '')}</p></section><section class="grid"><article class="card"><h2>Starting XI</h2>${players(match.startingXI || [])}</article><article class="card"><h2>Bench</h2>${players(match.substitutes || [])}</article></section><article class="card"><h2>Timeline</h2>${eventRows}</article><article class="card"><h2>Match Notes</h2><p>${escapeHtml(match.completionNotes || match.notes || 'No notes added.')}</p><p class="muted">Collaboration: ${escapeHtml(match.collaborationBadge || 'Hosted by team')}</p><p class="muted">Report ID: ${reportId}</p><p class="muted">Generated: ${new Date().toLocaleString()}</p>${onlineUrl ? `<p>Online result: ${escapeHtml(onlineUrl)}</p>` : ''}</article><script>window.print()</script></main></body></html>`;
};

export const getMatchReport = async ({ matchModel = Match, eventModel = MatchEvent, matchId, teamId, publicUrl }) => {
  const filter = { _id: matchId, isActive: true, status: 'completed' };
  if (teamId) filter.$or = [{ team: teamId }, { registeredOpponentTeam: teamId }];
  const match = await matchModel.findOne(filter).populate('team', 'name slug logo').populate('registeredOpponentTeam', 'name slug logo').lean();
  if (!match) throw new AppError('Completed match not found.', 404, 'COMPLETED_MATCH_NOT_FOUND');
  const events = await eventModel.find({ match: matchId, isUndone: false }).sort({ sequence: 1 }).lean();
  return { html: buildMatchReportHtml({ match, events, publicUrl }) };
};
