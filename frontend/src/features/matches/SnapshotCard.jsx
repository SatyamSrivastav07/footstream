import { Crown, Shield } from 'lucide-react';
import PlayerAvatar from '../squad/PlayerAvatar.jsx';

export default function SnapshotCard({ snapshot, index }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/10 p-3">
      <PlayerAvatar src={snapshot.photoUrl} name={snapshot.name} className="size-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="font-display text-lg font-black text-lime-300">{snapshot.jerseyNumber || index + 1}</span><h3 className="truncate font-semibold text-white">{snapshot.name}</h3></div>
        <p className="mt-1 text-xs font-bold text-emerald-100/40">{snapshot.position}</p>
      </div>
      <div className="flex flex-col gap-1">
        {snapshot.isCaptain && <span className="status-badge border-amber-300/20 bg-amber-300/10 text-amber-100"><Crown size={11} /> C</span>}
        {snapshot.isViceCaptain && <span className="status-badge border-sky-300/20 bg-sky-300/10 text-sky-100"><Shield size={11} /> VC</span>}
      </div>
    </article>
  );
}

