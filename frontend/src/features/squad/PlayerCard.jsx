import { BarChart3, Crown, Pencil, RotateCcw, Shield, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlayerAvatar from './PlayerAvatar.jsx';
import PlayerPhotoUploader from './PlayerPhotoUploader.jsx';
import { AVAILABILITY, availabilityLabel } from './constants.js';

const badgeClass = {
  available: 'border-lime-300/15 bg-lime-300/[0.08] text-lime-200',
  injured: 'border-orange-300/15 bg-orange-300/[0.08] text-orange-200',
  suspended: 'border-red-300/15 bg-red-300/[0.08] text-red-200',
  unavailable: 'border-white/10 bg-white/[0.05] text-white/50',
};

export default function PlayerCard({ player, readOnly = false, statsPath, onEdit, onStatusChange, onDeactivate, onReactivate, onPhotoChange }) {
  return (
    <article className={`group overflow-hidden rounded-3xl border bg-white/[0.025] transition ${player.isActive ? 'border-white/[0.08] hover:-translate-y-0.5 hover:border-lime-300/20' : 'border-white/[0.05] opacity-65'}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <PlayerAvatar src={player.photoUrl} name={player.name} className="size-full" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a1711] to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {player.isCaptain && <span className="status-badge border-amber-300/20 bg-amber-300/15 text-amber-100"><Crown size={12} /> Captain</span>}
          {player.isViceCaptain && <span className="status-badge border-sky-300/20 bg-sky-300/15 text-sky-100"><Shield size={12} /> Vice-captain</span>}
        </div>
        <div className="absolute bottom-3 left-4 flex items-end gap-3">
          <span className="font-display text-4xl font-black leading-none text-lime-300">{player.jerseyNumber || '—'}</span>
          <span className="rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-xs font-black text-white backdrop-blur">{player.position}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate font-display text-xl font-bold text-white">{player.name}</h2><p className="mt-1 text-xs text-emerald-100/45">{player.isActive ? 'Active squad member' : 'Inactive player'}</p></div>
          <span className={`status-badge ${badgeClass[player.availabilityStatus]}`}>{availabilityLabel(player.availabilityStatus)}</span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-4 text-center">
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/30">Age</dt><dd className="mt-1 text-sm font-semibold text-white/80">{player.age || '—'}</dd></div>
          <div className="border-x border-white/[0.06]"><dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/30">Year</dt><dd className="mt-1 truncate px-1 text-sm font-semibold text-white/80">{player.academicYear || '—'}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/30">Foot</dt><dd className="mt-1 text-sm font-semibold text-white/80">{player.preferredFoot || '—'}</dd></div>
        </dl>
        <Link to={statsPath || `/team/players/${player._id}/statistics`} className="secondary-button mt-4 w-full"><BarChart3 size={16} /> Career statistics</Link>

        {!readOnly && (
          <div className="mt-4 space-y-3">
            <PlayerPhotoUploader player={player} onChanged={onPhotoChange} />
            <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-100/35">Availability
              <select className="field-input mt-2 py-2.5" value={player.availabilityStatus} disabled={!player.isActive} onChange={(event) => onStatusChange(player, event.target.value)}>
                {AVAILABILITY.map((status) => <option key={status} value={status}>{availabilityLabel(status)}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" className="secondary-button flex-1 px-3" onClick={() => onEdit(player)}><Pencil size={15} /> Edit</button>
              {player.isActive ? (
                <button type="button" className="icon-button size-11 border-red-300/10 text-red-200/65 hover:bg-red-300/10 hover:text-red-100" onClick={() => onDeactivate(player)} aria-label={`Deactivate ${player.name}`} title="Deactivate player"><UserX size={17} /></button>
              ) : (
                <button type="button" className="icon-button size-11 text-lime-200/70" onClick={() => onReactivate(player)} aria-label={`Reactivate ${player.name}`} title="Reactivate player"><RotateCcw size={17} /></button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
