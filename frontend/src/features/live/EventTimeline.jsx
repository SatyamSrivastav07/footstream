import { ArrowRightLeft, CircleDot, Goal, ShieldAlert, Undo2 } from 'lucide-react';
import { label } from '../matches/constants.js';

const iconFor = (type) => {
  if (['goal', 'penalty_scored', 'own_goal'].includes(type)) return Goal;
  if (type === 'substitution') return ArrowRightLeft;
  if (['yellow_card', 'red_card'].includes(type)) return ShieldAlert;
  if (type === 'assist') return CircleDot;
  return CircleDot;
};

const eventName = (event) => event.playerSnapshot?.name || event.temporaryOpponentPlayerName || event.ownGoalBy?.playerSnapshot?.name || event.ownGoalBy?.temporaryOpponentPlayerName || event.playerInSnapshot?.name || 'Match event';

export default function EventTimeline({ events }) {
  if (!events.length) return <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-emerald-100/40">The live timeline is ready for its first event.</p>;
  return <ol className="space-y-3">{[...events].sort((a, b) => b.sequence - a.sequence).map((event, index) => {
    const Icon = iconFor(event.type);
    return <li key={event._id} className={`relative flex gap-3 rounded-2xl border p-4 ${event.isUndone ? 'border-white/[0.05] bg-white/[0.02] opacity-45' : index === 0 ? 'border-lime-300/20 bg-lime-300/[0.055]' : 'border-white/[0.07] bg-black/10'}`}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-lime-200">{event.isUndone ? <Undo2 size={17} /> : <Icon size={18} />}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-display text-lg font-black text-white">{event.minute}{event.stoppageMinute ? `+${event.stoppageMinute}` : ''}'</span><span className="status-badge status-neutral">{label(event.type)}</span>{event.isUndone && <span className="text-xs font-bold text-red-200">Undone</span>}</div><p className="mt-2 font-semibold text-white/80">{eventName(event)}</p>{event.assistPlayerSnapshot && <p className="mt-1 text-xs text-emerald-100/45">Assist: {event.assistPlayerSnapshot.name}</p>}{event.type === 'substitution' && <p className="mt-1 text-xs text-emerald-100/45">In: {event.playerInSnapshot?.name} · Out: {event.playerOutSnapshot?.name}</p>}{event.description && <p className="mt-2 text-sm text-emerald-100/45">{event.description}</p>}</div>
    </li>;
  })}</ol>;
}

