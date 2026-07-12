export function PublicError({ message }) {
  return (
    <div
      className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100"
      role="alert"
    >
      {message}
    </div>
  );
}
export function PublicEmpty({ title, message }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-white/40">{message}</p>
    </div>
  );
}
export function PublicGridLoader() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <div className="skeleton h-80" />
      <div className="skeleton h-80" />
      <div className="skeleton h-80" />
    </div>
  );
}
