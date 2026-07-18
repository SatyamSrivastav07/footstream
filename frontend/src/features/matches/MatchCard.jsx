import { CalendarDays, ClipboardCheck, Eye, MapPin, Pencil, Radio, Trash2, Trophy, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import TeamIdentity from '../../components/TeamIdentity.jsx';
import { formatLocalDateTime, label } from './constants.js';

const statusClass = {
  scheduled: 'status-active',
  live: 'border-red-300/20 bg-red-300/10 text-red-100',
  half_time: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  cancelled: 'status-off',
  completed: 'border-sky-300/15 bg-sky-300/[0.08] text-sky-200',
};

export default function MatchCard({ match, basePath, readOnly = false, onCancel, onDelete }) {
  const teamName = match.team?.name || 'Your team';
  const permissions = match.permissions || {};
  const canEdit = !readOnly && match.status === 'scheduled' && (permissions.canEditDetails !== false || permissions.canEditLineup !== false);
  const canControlLive = !readOnly && permissions.canControlLive !== false;
  const canCancel = !readOnly && permissions.canCancel !== false;
  const canDelete = !readOnly && permissions.canDelete !== false;
  const isDirectMatch = match.matchMode === 'direct';
  const resultPath = permissions.canManage === false ? `/matches/${match._id}/result` : `${basePath}/${match._id}/result`;
  const leftIsTeam = match.teamSide === 'home';
  const rightIsTeam = match.teamSide !== 'home';
  const left = leftIsTeam ? teamName : match.opponent.name;
  const right = rightIsTeam ? teamName : match.opponent.name;

  return (
    <article className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-white/[0.14]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className={`status-badge ${statusClass[match.status]}`}>{label(match.status)}</span>
            <span className={`status-badge ${isDirectMatch ? 'border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100' : 'border-sky-300/20 bg-sky-300/10 text-sky-100'}`}>
              {isDirectMatch ? 'Direct Result' : 'Stream Match'}
            </span>
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/35">{label(match.matchType)} · {label(match.teamSide)}</p>
        </div>
        <span className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-display text-sm font-bold text-lime-200">{match.formation === 'custom' ? match.customFormation : match.formation || 'No formation'}</span>
      </div>
      <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <h2 className="flex justify-center font-display text-xl font-bold text-white">{leftIsTeam ? <TeamIdentity team={match.team} name={left} className="justify-center" logoClassName="size-7 rounded-lg" /> : left}</h2>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-lime-300/50">vs</span>
        <h2 className="flex justify-center font-display text-xl font-bold text-white">{rightIsTeam ? <TeamIdentity team={match.team} name={right} className="justify-center" logoClassName="size-7 rounded-lg" /> : right}</h2>
      </div>
      <div className="space-y-2 border-y border-white/[0.06] py-4 text-sm text-emerald-100/50">
        <p className="flex items-center gap-2"><CalendarDays size={15} className="text-lime-300/60" /> {formatLocalDateTime(match.scheduledAt)}</p>
        <p className="flex items-center gap-2"><MapPin size={15} className="text-lime-300/60" /> {match.venue}</p>
        {match.tournament && <p className="truncate text-xs font-semibold uppercase tracking-wider text-emerald-100/30">{match.tournament}</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`${basePath}/${match._id}`} className="secondary-button flex-1 px-3"><Eye size={15} /> View</Link>
        {!readOnly && isDirectMatch && ['scheduled', 'completed'].includes(match.status) && permissions.canManage !== false && (
          <Link to={`${basePath}/${match._id}/direct-result`} className="primary-button px-3"><ClipboardCheck size={15} /> {match.status === 'completed' ? 'Edit result' : 'Input result'}</Link>
        )}
        {match.status === 'completed' && <Link to={resultPath} className="primary-button px-3"><Trophy size={15} /> Result</Link>}
        {!readOnly && !isDirectMatch && ['scheduled', 'live', 'half_time'].includes(match.status) && (
          <Link to={`${basePath}/${match._id}/live`} className={canControlLive ? 'primary-button px-3' : 'secondary-button px-3'}><Radio size={15} /> {canControlLive ? 'Live control' : 'Live view'}</Link>
        )}
        {!readOnly && match.status === 'scheduled' && (
          <>
            {canEdit && <Link to={`${basePath}/${match._id}/edit`} className="secondary-button px-3"><Pencil size={15} /> Edit</Link>}
            {canCancel && <button type="button" className="icon-button size-11 text-amber-200/70" onClick={() => onCancel(match)} title="Cancel match" aria-label={`Cancel match against ${match.opponent.name}`}><XCircle size={17} /></button>}
            {canDelete && <button type="button" className="icon-button size-11 text-red-200/70" onClick={() => onDelete(match)} title="Delete match" aria-label={`Delete match against ${match.opponent.name}`}><Trash2 size={17} /></button>}
          </>
        )}
      </div>
    </article>
  );
}
