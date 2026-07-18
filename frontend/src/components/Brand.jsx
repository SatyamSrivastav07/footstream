export default function Brand({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src="/footstream-logo.jpeg"
        alt="FootStream logo"
        className="size-11 shrink-0 rounded-2xl border border-lime-300/20 bg-black object-contain shadow-[0_0_28px_rgba(132,204,22,.2)]"
        loading="eager"
      />
      {!compact && (
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold tracking-tight text-white">
            FootStream
          </p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-200/55">
            Play · Stream · Connect
          </p>
        </div>
      )}
    </div>
  );
}
