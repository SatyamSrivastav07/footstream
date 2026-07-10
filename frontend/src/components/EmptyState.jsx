import { CircleDashed } from 'lucide-react';

export default function EmptyState({ title, message }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
      <div>
        <CircleDashed className="mx-auto text-lime-300/70" size={28} />
        <p className="mt-3 font-semibold text-white">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-emerald-100/50">{message}</p>
      </div>
    </div>
  );
}

