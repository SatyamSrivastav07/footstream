import { ArrowRightLeft, CircleDot, Goal, RotateCcw, ShieldAlert, Trophy, X } from "lucide-react";

const icons = {
  goal: Goal,
  penalty_scored: Goal,
  own_goal: Goal,
  substitution: ArrowRightLeft,
  yellow_card: ShieldAlert,
  red_card: ShieldAlert,
  correction: RotateCcw,
  transition: Trophy,
};

export default function LiveEventOverlay({ notification, onDismiss }) {
  if (!notification) return null;
  const Icon = icons[notification.tone] || CircleDot;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4" aria-live="polite" aria-atomic="true">
      <section className={`live-event-overlay live-event-${notification.tone} pointer-events-auto w-full max-w-xl rounded-3xl border border-white/15 bg-[#07110d]/95 p-5 text-center shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7`} role="status">
        <button type="button" className="absolute right-3 top-3 rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white" onClick={onDismiss} aria-label="Dismiss live event notification">
          <X size={16} />
        </button>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 text-lime-200">
          <Icon size={28} aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-lime-200/70">{notification.label}</p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-wide text-white sm:text-5xl">{notification.title}</h2>
        <div className="mt-4 space-y-1">
          {notification.lines.map((line) => (
            <p className="text-sm font-semibold text-emerald-50/75 sm:text-base" key={line}>{line}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
