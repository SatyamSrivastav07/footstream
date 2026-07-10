import Brand from './Brand.jsx';

export default function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07110d] px-6 text-white">
      <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
        <Brand />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="loading-bar h-full rounded-full bg-lime-300" />
        </div>
        <span className="sr-only">Loading FootStream</span>
      </div>
    </main>
  );
}

