import { Radio } from 'lucide-react';

export default function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-lime-300 text-emerald-950 shadow-[0_0_24px_rgba(190,242,100,.18)]">
        <Radio size={20} strokeWidth={2.4} aria-hidden="true" />
      </div>
      {!compact && (
        <div>
          <p className="font-display text-xl font-bold tracking-tight text-white">FootStream</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-200/55">Command center</p>
        </div>
      )}
    </div>
  );
}

