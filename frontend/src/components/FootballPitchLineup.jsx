import { useMemo } from 'react';
import PlayerAvatar from '../features/squad/PlayerAvatar.jsx';

const initials = (name = 'Player') =>
  String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'FP';

const photoUrl = (player) => {
  if (!player) return '';
  if (player.photoUrl) return player.photoUrl;
  if (typeof player.photo === 'string') return player.photo;
  return player.photo?.imageUrl || player.photo?.url || '';
};

export const parseFormationLines = (formation) => {
  if (!/^\d+(?:-\d+){1,5}$/.test(String(formation || ''))) return [];
  return String(formation).split('-').map((part) => Number(part));
};

export const buildFormationSlots = ({
  formation,
  customFormation,
  orientation = 'attacking-up',
}) => {
  const effectiveFormation = formation === 'custom' ? customFormation : formation;
  const lines = parseFormationLines(effectiveFormation);
  if (!lines.length) return [];
  const attackingUp = orientation !== 'attacking-down';
  const slotY = (base) => attackingUp ? base : 1 - base;
  const slots = [{ slotId: 'GK', lineIndex: 0, positionIndex: 0, roleLabel: 'Goalkeeper', x: 0.5, y: slotY(0.9) }];
  lines.forEach((count, lineIndex) => {
    const baseY = 0.74 - (lineIndex * (0.56 / Math.max(lines.length - 1, 1)));
    for (let index = 0; index < count; index += 1) {
      slots.push({
        slotId: `L${lineIndex + 1}-P${index + 1}`,
        lineIndex: lineIndex + 1,
        positionIndex: index,
        roleLabel: `Line ${lineIndex + 1}`,
        x: (index + 1) / (count + 1),
        y: slotY(baseY),
      });
    }
  });
  return slots;
};

const playerId = (player) => String(player?.id || player?.player || player?.squadPlayer || '');

const placedPlayers = (starters = [], slots = []) => {
  const bySlot = new Map();
  const usedPlayers = new Set();
  starters.forEach((player) => {
    if (player.slotId && slots.some((slot) => slot.slotId === player.slotId)) {
      bySlot.set(player.slotId, player);
      usedPlayers.add(playerId(player));
    }
  });
  const remaining = starters.filter((player) => !usedPlayers.has(playerId(player)));
  slots.forEach((slot) => {
    if (bySlot.has(slot.slotId)) return;
    const nextIndex = slot.slotId === 'GK'
      ? remaining.findIndex((player) => String(player.position || '').toUpperCase() === 'GK')
      : remaining.findIndex((player) => String(player.position || '').toUpperCase() !== 'GK');
    const fallbackIndex = nextIndex === -1 ? remaining.findIndex(Boolean) : nextIndex;
    if (fallbackIndex !== -1) {
      bySlot.set(slot.slotId, { ...remaining[fallbackIndex], fallbackSlotId: slot.slotId });
      remaining.splice(fallbackIndex, 1);
    }
  });
  return bySlot;
};

function PlayerMarker({ player, slot, editable, selected, captain, goalkeeper, viceCaptain, showPhotos, showJerseyNumbers, onClick, onDropPlayer, accentColor }) {
  const image = photoUrl(player);
  const label = player ? `${player.name}${slot.slotId === 'GK' ? ', goalkeeper slot' : ''}` : `Empty ${slot.roleLabel} slot ${slot.slotId}`;
  const handleDragStart = (event) => {
    if (!editable || !player) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', playerId(player));
  };
  const handleDrop = (event) => {
    if (!editable) return;
    event.preventDefault();
    const draggedPlayerId = event.dataTransfer.getData('text/plain');
    if (draggedPlayerId) onDropPlayer?.(slot, player, draggedPlayerId);
  };
  return (
    <button
      type="button"
      draggable={editable && Boolean(player)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 text-center text-[10px] font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-lime-200 motion-safe:hover:-translate-y-[55%] motion-safe:hover:scale-105 ${
        selected ? 'text-lime-100' : player ? 'text-white hover:text-lime-100' : 'grid size-14 place-items-center rounded-full border border-dashed border-white/25 bg-black/15 text-white/55 hover:border-lime-300/45'
      } ${editable ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%`, boxShadow: selected ? `0 0 0 1px ${accentColor}, 0 18px 36px rgba(0,0,0,.35)` : undefined }}
      onClick={editable ? onClick : undefined}
      onDragStart={handleDragStart}
      onDragOver={editable ? (event) => event.preventDefault() : undefined}
      onDrop={handleDrop}
      aria-label={label}
      disabled={!editable}
    >
      <span className={`relative mx-auto grid size-14 place-items-center overflow-hidden rounded-full border-2 text-xs shadow-xl ${selected ? 'border-lime-300 ring-4 ring-lime-300/20' : player ? 'border-white/25' : 'border-transparent bg-transparent'}`}>
        {player && showPhotos ? <PlayerAvatar src={image} name={player.name} className="size-full rounded-full" /> : player ? initials(player.name) : slot.slotId}
        {player && showJerseyNumbers && (player.jersey || player.jerseyNumber) && <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-lime-300 text-[9px] font-black text-slate-950">{player.jersey || player.jerseyNumber}</span>}
      </span>
      {player ? (
        <>
          <span className="mt-1 block max-w-24 truncate text-xs text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]">{showJerseyNumbers && player.jersey ? `#${player.jersey} ` : ''}{player.name}</span>
          <span className="mt-1 flex justify-center gap-1">
            {goalkeeper && <span className="rounded-full bg-sky-300 px-1 text-[9px] text-slate-950">GK</span>}
            {captain && <span className="rounded-full bg-lime-300 px-1 text-[9px] text-slate-950">C</span>}
            {viceCaptain && <span className="rounded-full bg-emerald-200 px-1 text-[9px] text-slate-950">VC</span>}
          </span>
        </>
      ) : <span className="mt-1 block">{slot.slotId}</span>}
    </button>
  );
}

export default function FootballPitchLineup({
  formation,
  customFormation,
  starters = [],
  goalkeeper,
  captain,
  selectedSlot = '',
  selectedPlayerId = '',
  editable = false,
  onSlotSelect,
  onSlotDrop,
  side = 'home',
  orientation = 'attacking-up',
  compact = false,
  showPhotos = true,
  showJerseyNumbers = true,
  accentColor = '#bef264',
}) {
  const slots = useMemo(() => buildFormationSlots({ formation, customFormation, orientation }), [formation, customFormation, orientation]);
  const playersBySlot = useMemo(() => placedPlayers(starters, slots), [starters, slots]);
  const captainId = playerId(captain);
  const goalkeeperId = playerId(goalkeeper);

  if (!slots.length) {
    return <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 text-sm text-white/55">Choose a formation to display the tactical pitch.</div>;
  }

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-[2rem] border border-lime-300/20 bg-[radial-gradient(circle_at_center,rgba(190,242,100,.12),transparent_45%),linear-gradient(135deg,rgba(21,128,61,.45),rgba(2,6,23,.9))] ${compact ? 'h-[430px]' : 'h-[560px]'} min-h-[420px] touch-manipulation`}
        aria-label={`${side} football pitch lineup`}
      >
        <div className="absolute inset-4 rounded-[1.5rem] border border-white/20" />
        <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
        <div className="absolute left-4 right-4 top-1/2 border-t border-white/15" />
        <div className="absolute left-1/2 top-4 h-16 w-32 -translate-x-1/2 rounded-b-3xl border border-t-0 border-white/15" />
        <div className="absolute bottom-4 left-1/2 h-16 w-32 -translate-x-1/2 rounded-t-3xl border border-b-0 border-white/15" />
        {slots.map((slot) => {
          const player = playersBySlot.get(slot.slotId);
          return (
            <PlayerMarker
              key={slot.slotId}
              player={player}
              slot={slot}
              editable={editable}
              selected={selectedSlot === slot.slotId || (player && selectedPlayerId === playerId(player))}
              captain={player && playerId(player) === captainId}
              viceCaptain={player?.isViceCaptain}
              goalkeeper={player && (playerId(player) === goalkeeperId || slot.slotId === 'GK')}
              showPhotos={showPhotos}
              showJerseyNumbers={showJerseyNumbers}
              onClick={() => onSlotSelect?.(slot, player)}
              onDropPlayer={(targetSlot, targetPlayer, draggedPlayerId) => onSlotDrop?.(targetSlot, targetPlayer, draggedPlayerId)}
              accentColor={accentColor}
            />
          );
        })}
      </div>
      <ul className="sr-only">
        {slots.map((slot) => {
          const player = playersBySlot.get(slot.slotId);
          return <li key={slot.slotId}>{slot.slotId}: {player?.name || 'Unassigned'}</li>;
        })}
      </ul>
    </div>
  );
}
