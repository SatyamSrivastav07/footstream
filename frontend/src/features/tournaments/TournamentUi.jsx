import { CalendarDays, Eye, History, Pencil, Send, Trash2, UploadCloud, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState.jsx';
import {
  TOURNAMENT_APPROVAL_STATUS,
  TOURNAMENT_APPROVAL_STATUS_LABEL,
  TOURNAMENT_COMPETITION_FORMAT_LABEL,
  TOURNAMENT_LIFECYCLE_STATUS_LABEL,
  TOURNAMENT_SCOPE_LABEL,
  formatTournamentLabel,
} from './constants.js';

export const imageUrl = (image) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.imageUrl || image.url || '';
};

export const dateText = (value) => (value ? new Date(value).toLocaleDateString() : 'Not set');

export const StatusBadge = ({ children, tone = 'neutral' }) => {
  const tones = {
    neutral: 'border-white/10 bg-white/[0.06] text-white/65',
    lime: 'border-lime-300/20 bg-lime-300/10 text-lime-100',
    amber: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
    red: 'border-red-300/20 bg-red-300/10 text-red-100',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${tones[tone]}`}>{children}</span>;
};

export const approvalTone = (status) => {
  if (status === TOURNAMENT_APPROVAL_STATUS.APPROVED) return 'lime';
  if ([TOURNAMENT_APPROVAL_STATUS.REJECTED, TOURNAMENT_APPROVAL_STATUS.SUSPENDED].includes(status)) return 'red';
  if (status === TOURNAMENT_APPROVAL_STATUS.APPROVAL_PENDING) return 'amber';
  return 'neutral';
};

export function TournamentLogo({ tournament, className = 'size-14' }) {
  const src = imageUrl(tournament?.logo);
  return src ? <img src={src} alt="" className={`${className} rounded-2xl border border-white/10 bg-black/20 object-contain`} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <div className={`${className} grid rounded-2xl border border-lime-300/15 bg-lime-300/10 text-sm font-black text-lime-100`}>{(tournament?.shortName || tournament?.name || 'T').slice(0, 2).toUpperCase()}</div>;
}

export function TournamentCard({ tournament, basePath, onPublish, onUnpublish, onSubmit, onDelete }) {
  const id = tournament.id || tournament._id;
  const canEdit = ['draft', 'changes_requested'].includes(tournament.approvalStatus);
  const canPublish = tournament.approvalStatus === 'approved' && tournament.visibility === 'public' && !tournament.isPublished;
  const canUnpublish = tournament.isPublished;
  return <article className="group rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-2xl shadow-black/20">
    <div className="flex items-start gap-4"><TournamentLogo tournament={tournament} /><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[0.25em] text-lime-300/70">{TOURNAMENT_SCOPE_LABEL[tournament.scope] || formatTournamentLabel(tournament.scope)}</p><h3 className="mt-1 truncate font-display text-2xl font-black">{tournament.name}</h3><p className="text-sm text-white/45">{tournament.seasonLabel || tournament.seriesName || 'Season not set'}</p></div></div>
    <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/60"><span>{TOURNAMENT_COMPETITION_FORMAT_LABEL[tournament.competitionFormat] || formatTournamentLabel(tournament.competitionFormat)}</span><span>{TOURNAMENT_LIFECYCLE_STATUS_LABEL[tournament.lifecycleStatus] || formatTournamentLabel(tournament.lifecycleStatus)}</span><span><CalendarDays className="mr-1 inline" size={14} />{dateText(tournament.startDate)}</span><span>{dateText(tournament.endDate)}</span></div>
    <div className="mt-5 flex flex-wrap gap-2"><StatusBadge tone={approvalTone(tournament.approvalStatus)}>{TOURNAMENT_APPROVAL_STATUS_LABEL[tournament.approvalStatus] || tournament.approvalStatus}</StatusBadge><StatusBadge tone={tournament.isPublished ? 'lime' : 'neutral'}>{tournament.isPublished ? 'Published' : 'Unpublished'}</StatusBadge><StatusBadge><UsersRound size={12} className="mr-1 inline" />{tournament.participantsCount || tournament.participants?.length || 0} teams</StatusBadge></div>
    <div className="mt-5 flex flex-wrap gap-2"><Link className="secondary-button" to={`${basePath}/${id}`}><Eye size={15} /> View</Link>{canEdit && <Link className="secondary-button" to={`${basePath}/${id}/edit`}><Pencil size={15} /> Edit</Link>}<Link className="secondary-button" to={`${basePath}/${id}/history`}><History size={15} /> History</Link>{onSubmit && canEdit && <button className="secondary-button" onClick={() => onSubmit(id)}><Send size={15} /> Submit</button>}{onPublish && canPublish && <button className="primary-button" onClick={() => onPublish(id)}><UploadCloud size={15} /> Publish</button>}{onUnpublish && canUnpublish && <button className="secondary-button" onClick={() => onUnpublish(id)}>Unpublish</button>}{onDelete && tournament.approvalStatus === 'draft' && <button className="secondary-button border-red-300/20 text-red-100" onClick={() => onDelete(id)}><Trash2 size={15} /> Delete Draft</button>}</div>
  </article>;
}

export function TournamentListState({ loading, error, emptyTitle = 'No tournaments yet', emptyMessage = 'Tournament records will appear here.' }) {
  if (loading) return <div className="grid gap-5 lg:grid-cols-2"><div className="skeleton h-72" /><div className="skeleton h-72" /></div>;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100" role="alert">{error}</div>;
  return <EmptyState title={emptyTitle} message={emptyMessage} />;
}

export function ReviewTimeline({ history = [] }) {
  if (!history.length) return <EmptyState title="No review history" message="Audit events will appear after the tournament is created or reviewed." />;
  return <ol className="space-y-4" aria-label="Tournament review timeline">{history.map((item, index) => <li key={`${item.createdAt}-${index}`} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"><p className="text-xs font-black uppercase tracking-[0.22em] text-lime-300/70">{formatTournamentLabel(item.action)}</p><p className="mt-2 text-white">{item.safeMessage || item.message || 'Tournament event recorded.'}</p><p className="mt-2 text-xs text-white/40">{item.actorRole} · {dateText(item.createdAt)}</p></li>)}</ol>;
}
