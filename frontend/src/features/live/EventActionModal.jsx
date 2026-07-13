import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';

const titles = {
  goal: 'Add goal',
  assist: 'Add assist',
  yellowCard: 'Yellow card',
  redCard: 'Red card',
  substitution: 'Substitution',
  penalty: 'Penalty',
  ownGoal: 'Own goal',
  undo: 'Undo last event',
};

export const assistOptionsForGoal = (onFieldPlayers, selectedGoal) => onFieldPlayers
  .filter((player) => String(player.player) !== String(selectedGoal?.player || ''));

export default function EventActionModal({ action, state, events, open, onClose, onSubmit, saving, error }) {
  const [form, setForm] = useState({});
  const onFieldPlayers = useMemo(() => state?.currentOnFieldPlayers || state?.currentLineup?.onField || [], [state]);
  const benchPlayers = useMemo(() => state?.currentBenchPlayers || state?.currentLineup?.bench || [], [state]);
  const temporaryNames = state?.opponent?.temporaryPlayers || [];
  const activeGoals = events.filter((event) => event.type === 'goal' && event.scoringSide === 'team' && !event.isUndone && !event.assistPlayer);
  const selectedGoal = activeGoals.find((event) => String(event._id) === String(form.goalEventId));
  const latestEvent = [...events].filter((event) => !event.isUndone).sort((a, b) => b.sequence - a.sequence)[0];

  useEffect(() => {
    if (!open) return;
    setForm({
      scoringSide: 'team',
      side: 'team',
      ownGoalBySide: 'team',
      playerId: '',
      assistPlayerId: '',
      goalEventId: '',
      playerOutId: '',
      playerInId: '',
      outcome: 'scored',
      temporaryOpponentPlayerName: '',
      minute: state?.liveMinute ?? 0,
      stoppageMinute: '',
      description: '',
      reason: '',
    });
  }, [open, action, state?.liveMinute]);

  useEffect(() => {
    if (!open) return;
    const onFieldIds = new Set(onFieldPlayers.map((player) => String(player.player)));
    const benchIds = new Set(benchPlayers.map((player) => String(player.player)));
    setForm((current) => {
      const next = { ...current };
      if (next.playerId && !onFieldIds.has(String(next.playerId))) next.playerId = '';
      if (next.assistPlayerId && !onFieldIds.has(String(next.assistPlayerId))) next.assistPlayerId = '';
      if (next.playerOutId && !onFieldIds.has(String(next.playerOutId))) next.playerOutId = '';
      if (next.playerInId && !benchIds.has(String(next.playerInId))) next.playerInId = '';
      return next;
    });
  }, [open, onFieldPlayers, benchPlayers]);

  if (!action) return null;

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const common = action !== 'assist' && action !== 'undo' && action !== 'substitution';
  const side = action === 'yellowCard' || action === 'redCard' ? form.side || 'team' : form.scoringSide || 'team';
  const submit = (event) => {
    event.preventDefault();
    onSubmit(action, form);
  };

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title={titles[action]} description="This action is written to the append-only live timeline.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100" role="alert">{error}</div>}

        {['goal', 'penalty'].includes(action) && (
          <SelectField label="Scoring side" value={form.scoringSide} onChange={(value) => update('scoringSide', value)}>
            <option value="team">Our team</option>
            <option value="opponent">Opponent</option>
          </SelectField>
        )}
        {['yellowCard', 'redCard'].includes(action) && (
          <SelectField label="Card side" value={form.side} onChange={(value) => update('side', value)}>
            <option value="team">Our team</option>
            <option value="opponent">Opponent</option>
          </SelectField>
        )}
        {action === 'ownGoal' && (
          <SelectField label="Own goal by" value={form.ownGoalBySide} onChange={(value) => update('ownGoalBySide', value)}>
            <option value="team">Our team player</option>
            <option value="opponent">Opponent player</option>
          </SelectField>
        )}

        {['goal', 'yellowCard', 'redCard', 'penalty'].includes(action) && (
          side === 'team'
            ? <PlayerSelect label={action === 'penalty' ? 'Penalty taker' : 'Current on-field player'} value={form.playerId} players={onFieldPlayers} onChange={(value) => update('playerId', value)} />
            : <OpponentInput value={form.temporaryOpponentPlayerName} names={temporaryNames} onChange={(value) => update('temporaryOpponentPlayerName', value)} />
        )}
        {action === 'goal' && form.scoringSide === 'team' && (
          <PlayerSelect
            label="Assist (optional)"
            value={form.assistPlayerId}
            players={onFieldPlayers.filter((player) => String(player.player) !== String(form.playerId))}
            allowEmpty
            onChange={(value) => update('assistPlayerId', value)}
          />
        )}
        {action === 'assist' && (
          <>
            <SelectField label="Goal event" value={form.goalEventId} onChange={(value) => update('goalEventId', value)}>
              <option value="">Select goal</option>
              {activeGoals.map((event) => <option key={event._id} value={event._id}>{event.minute}' - {event.playerSnapshot?.name}</option>)}
            </SelectField>
            <PlayerSelect
              label="Assist player"
              value={form.assistPlayerId}
              players={assistOptionsForGoal(onFieldPlayers, selectedGoal)}
              onChange={(value) => update('assistPlayerId', value)}
            />
          </>
        )}
        {action === 'substitution' && (
          <>
            <PlayerSelect label="Current On Field - Player out" value={form.playerOutId} players={onFieldPlayers} onChange={(value) => update('playerOutId', value)} />
            <PlayerSelect label="Current Bench - Player in" value={form.playerInId} players={benchPlayers} onChange={(value) => update('playerInId', value)} />
          </>
        )}
        {action === 'penalty' && (
          <SelectField label="Outcome" value={form.outcome} onChange={(value) => update('outcome', value)}>
            <option value="scored">Scored</option>
            <option value="missed">Missed</option>
            <option value="saved">Saved</option>
          </SelectField>
        )}
        {action === 'ownGoal' && (
          form.ownGoalBySide === 'team'
            ? <PlayerSelect label="Current on-field own-goal player" value={form.playerId} players={onFieldPlayers} onChange={(value) => update('playerId', value)} />
            : <OpponentInput value={form.temporaryOpponentPlayerName} names={temporaryNames} onChange={(value) => update('temporaryOpponentPlayerName', value)} />
        )}
        {action === 'undo' && (
          <>
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-100/60">Latest active event</p>
              <p className="mt-2 font-semibold text-white">{latestEvent ? `${latestEvent.minute}' - ${latestEvent.type.replaceAll('_', ' ')}` : 'No active event'}</p>
            </div>
            <label className="field-label">Reason (optional)<textarea className="field-input mt-2 min-h-20" maxLength="300" value={form.reason} onChange={(e) => update('reason', e.target.value)} /></label>
          </>
        )}
        {common || action === 'substitution' ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="field-label">Minute<input className="field-input mt-2" type="number" min="0" max="150" value={form.minute} onChange={(e) => update('minute', e.target.value)} /></label>
            <label className="field-label">Stoppage<input className="field-input mt-2" type="number" min="0" max="30" value={form.stoppageMinute} onChange={(e) => update('stoppageMinute', e.target.value)} /></label>
          </div>
        ) : null}
        {action !== 'assist' && action !== 'undo' && <label className="field-label">Description (optional)<textarea className="field-input mt-2 min-h-20" maxLength="500" value={form.description} onChange={(e) => update('description', e.target.value)} /></label>}
        <div className="flex justify-end gap-3 border-t border-white/[0.07] pt-4">
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving...' : action === 'undo' ? 'Confirm undo' : `Save ${titles[action].toLowerCase()}`}</button>
        </div>
      </form>
    </Modal>
  );
}

function SelectField({ label: text, value, onChange, children, required = true }) {
  return <label className="field-label">{text}<select className="field-input mt-2" required={required} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select></label>;
}

function PlayerSelect({ label: text, value, players, onChange, allowEmpty = false }) {
  return (
    <SelectField label={text} value={value} onChange={onChange} required={!allowEmpty}>
      <option value="">{allowEmpty ? 'No assist' : 'Select player'}</option>
      {players.map((player) => <option key={player.player} value={player.player}>#{player.jerseyNumber || '-'} - {player.name} ({player.position})</option>)}
    </SelectField>
  );
}

function OpponentInput({ value, names, onChange }) {
  return (
    <label className="field-label">
      Opponent player
      <input className="field-input mt-2" required list="opponent-live-names" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Enter temporary name" />
      <datalist id="opponent-live-names">{names.map((player, index) => <option key={`${player.name}-${index}`} value={player.name} />)}</datalist>
    </label>
  );
}
