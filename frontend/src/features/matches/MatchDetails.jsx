import { CalendarDays, MapPin, NotebookText, UsersRound } from 'lucide-react';
import SnapshotCard from './SnapshotCard.jsx';
import { formatLocalDateTime, label } from './constants.js';

export default function MatchDetails({ match, fallbackTeamName }) {
  const teamName = match.team?.name || fallbackTeamName || 'FootStream team';
  const left = match.teamSide === 'home' ? teamName : match.opponent.name;
  const right = match.teamSide === 'home' ? match.opponent.name : teamName;

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(190,242,100,.1),rgba(255,255,255,.02)_52%)] p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className={`status-badge ${match.status === 'cancelled' ? 'status-off' : match.status === 'completed' ? 'border-sky-300/15 bg-sky-300/[0.08] text-sky-200' : 'status-active'}`}>{label(match.status)}</span><span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/40">{label(match.matchType)} · {label(match.teamSide)}</span></div>
        <div className="my-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center"><h1 className="font-display text-3xl font-black text-white sm:text-5xl">{left}</h1><span className="font-display text-xl font-black text-lime-300/50">VS</span><h1 className="font-display text-3xl font-black text-white sm:text-5xl">{right}</h1></div>
        <div className="grid gap-3 border-t border-white/[0.08] pt-6 text-sm text-emerald-100/55 sm:grid-cols-2 lg:grid-cols-4">
          <Info icon={CalendarDays} label="Kickoff" value={formatLocalDateTime(match.scheduledAt)} />
          <Info icon={MapPin} label="Venue" value={match.venue} />
          <Info icon={UsersRound} label="Formation" value={match.formation === 'custom' ? match.customFormation : match.formation || 'Not set'} />
          <Info icon={NotebookText} label="Tournament" value={match.tournament || 'Not specified'} />
        </div>
      </section>

      {match.notes && <section className="panel mt-6"><p className="eyebrow">Match notes</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-emerald-50/60">{match.notes}</p></section>}

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div className="panel"><div className="panel-heading"><div><p className="eyebrow">Match-day snapshot</p><h2 className="panel-title">Starting XI</h2></div><span className="count-pill">11 players</span></div><div className="grid gap-3 md:grid-cols-2">{match.startingXI.map((entry, index) => <SnapshotCard key={entry.player} snapshot={entry} index={index} />)}</div></div>
        <div className="space-y-6">
          <div className="panel"><div className="panel-heading"><div><p className="eyebrow">Match-day snapshot</p><h2 className="panel-title">Substitutes</h2></div><span className="count-pill">{match.substitutes.length}</span></div>{match.substitutes.length ? <div className="space-y-3">{match.substitutes.map((entry, index) => <SnapshotCard key={entry.player} snapshot={entry} index={index} />)}</div> : <p className="text-sm text-emerald-100/40">No substitutes selected.</p>}</div>
          {match.opponent.temporaryPlayers?.length > 0 && <div className="panel"><p className="eyebrow">Opponent notes</p><h2 className="panel-title">Temporary player list</h2><ul className="mt-4 space-y-2">{match.opponent.temporaryPlayers.map((player, index) => <li key={`${player.name}-${index}`} className="flex justify-between rounded-xl bg-white/[0.035] px-3 py-2 text-sm"><span>{player.name}</span><span className="text-emerald-100/40">{player.position || '—'} {player.jerseyNumber ? `#${player.jerseyNumber}` : ''}</span></li>)}</ul></div>}
        </div>
      </section>
    </>
  );
}

function Info({ icon: Icon, label: text, value }) {
  return <div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime-300/10 text-lime-200"><Icon size={16} /></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/30">{text}</p><p className="mt-1 font-semibold text-white/80">{value}</p></div></div>;
}
