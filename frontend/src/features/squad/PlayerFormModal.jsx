import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import {
  ACADEMIC_YEARS,
  AVAILABILITY,
  emptyPlayer,
  POSITIONS,
  PREFERRED_FEET,
  availabilityLabel,
} from './constants.js';

const toForm = (player) => player ? {
  name: player.name || '',
  photoUrl: player.photoUrl || '',
  position: player.position || '',
  jerseyNumber: player.jerseyNumber ?? '',
  age: player.age ?? '',
  academicYear: player.academicYear || '',
  preferredFoot: player.preferredFoot || '',
  availabilityStatus: player.availabilityStatus || 'available',
  isCaptain: Boolean(player.isCaptain),
  isViceCaptain: Boolean(player.isViceCaptain),
} : { ...emptyPlayer };

const validateForm = (form) => {
  const errors = {};
  if (form.name.trim().length < 2 || form.name.trim().length > 100) errors.name = 'Enter a name between 2 and 100 characters.';
  if (!POSITIONS.includes(form.position)) errors.position = 'Select a position.';
  if (form.photoUrl) {
    try {
      const url = new URL(form.photoUrl);
      if (!['http:', 'https:'].includes(url.protocol)) errors.photoUrl = 'Use a valid HTTP or HTTPS image URL.';
    } catch { errors.photoUrl = 'Use a valid HTTP or HTTPS image URL.'; }
  }
  if (form.jerseyNumber !== '' && (!Number.isInteger(Number(form.jerseyNumber)) || Number(form.jerseyNumber) < 1 || Number(form.jerseyNumber) > 99)) errors.jerseyNumber = 'Jersey number must be from 1 to 99.';
  if (form.age !== '' && (!Number.isInteger(Number(form.age)) || Number(form.age) < 14 || Number(form.age) > 60)) errors.age = 'Age must be from 14 to 60.';
  if (form.isCaptain && form.isViceCaptain) errors.isViceCaptain = 'A player cannot hold both leadership roles.';
  return errors;
};

export default function PlayerFormModal({ open, player, onClose, onSave }) {
  const [form, setForm] = useState(toForm(player));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(toForm(player)); setErrors({}); setMessage(''); }
  }, [open, player]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const clientErrors = validateForm(form);
    if (Object.keys(clientErrors).length > 0) { setErrors(clientErrors); setMessage('Please correct the highlighted fields.'); return; }

    setSaving(true); setErrors({}); setMessage('');
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        photoUrl: form.photoUrl.trim(),
        jerseyNumber: form.jerseyNumber === '' ? null : Number(form.jerseyNumber),
        age: form.age === '' ? null : Number(form.age),
        academicYear: form.academicYear || null,
        preferredFoot: form.preferredFoot || null,
      });
    } catch (error) {
      setMessage(error.userMessage);
      setErrors(Object.fromEntries((error.fieldErrors || []).map((item) => [item.field, item.message])));
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title={player ? 'Edit player card' : 'Add squad player'} description="Keep permanent squad information accurate and match-ready.">
      <form onSubmit={submit} className="space-y-5" noValidate>
        {message && <div className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">{message}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} className="sm:col-span-2"><input className="field-input mt-2" value={form.name} maxLength="100" onChange={(e) => update('name', e.target.value)} /></Field>
          <Field label="Photo URL" error={errors.photoUrl} className="sm:col-span-2"><input className="field-input mt-2" type="url" placeholder="https://example.com/player.jpg" value={form.photoUrl} onChange={(e) => update('photoUrl', e.target.value)} /></Field>
          <Field label="Position" error={errors.position}><select className="field-input mt-2" value={form.position} onChange={(e) => update('position', e.target.value)}><option value="">Select position</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</select></Field>
          <Field label="Jersey number" error={errors.jerseyNumber}><input className="field-input mt-2" type="number" min="1" max="99" value={form.jerseyNumber} onChange={(e) => update('jerseyNumber', e.target.value)} /></Field>
          <Field label="Age" error={errors.age}><input className="field-input mt-2" type="number" min="14" max="60" value={form.age} onChange={(e) => update('age', e.target.value)} /></Field>
          <Field label="Academic year" error={errors.academicYear}><select className="field-input mt-2" value={form.academicYear} onChange={(e) => update('academicYear', e.target.value)}><option value="">Not specified</option>{ACADEMIC_YEARS.map((year) => <option key={year}>{year}</option>)}</select></Field>
          <Field label="Preferred foot" error={errors.preferredFoot}><select className="field-input mt-2" value={form.preferredFoot} onChange={(e) => update('preferredFoot', e.target.value)}><option value="">Not specified</option>{PREFERRED_FEET.map((foot) => <option key={foot}>{foot}</option>)}</select></Field>
          <Field label="Availability" error={errors.availabilityStatus}><select className="field-input mt-2" value={form.availabilityStatus} onChange={(e) => update('availabilityStatus', e.target.value)}>{AVAILABILITY.map((status) => <option key={status} value={status}>{availabilityLabel(status)}</option>)}</select></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckField label="Team captain" checked={form.isCaptain} onChange={(checked) => update('isCaptain', checked)} />
          <CheckField label="Vice-captain" checked={form.isViceCaptain} onChange={(checked) => update('isViceCaptain', checked)} error={errors.isViceCaptain} />
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : player ? 'Save changes' : 'Add player'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, error, children, className = '' }) {
  return <label className={`field-label ${className}`}>{label}{children}{error && <span className="mt-1 block text-xs font-medium text-red-200">{error}</span>}</label>;
}

function CheckField({ label, checked, onChange, error }) {
  return <label className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${checked ? 'border-lime-300/25 bg-lime-300/[0.07] text-lime-100' : 'border-white/10 bg-black/10 text-white/65'}`}><input type="checkbox" className="size-4 accent-lime-300" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}{error && <span className="mt-1 block text-xs text-red-200">{error}</span>}</span></label>;
}

