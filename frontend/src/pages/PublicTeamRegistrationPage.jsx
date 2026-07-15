import { ImagePlus, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import usePageMetadata from '../hooks/usePageMetadata.js';

const initial = {
  teamName: '', shortName: '', city: '', state: '', country: '', foundedYear: '',
  primaryColor: '', secondaryColor: '', description: '', instagramUrl: '', websiteUrl: '',
  representativeName: '', roleInTeam: '', email: '', phone: '', message: '',
};

export default function PublicTeamRegistrationPage() {
  usePageMetadata({ title: 'Register Your Team | FootStream', description: 'Request access for your football team or club to join FootStream.', path: '/register-team' });
  const [form, setForm] = useState(initial);
  const [logo, setLogo] = useState(null);
  const [cover, setCover] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const choose = (setter, previewSetter) => (event) => {
    const file = event.target.files?.[0] || null;
    setter(file);
    previewSetter(file ? URL.createObjectURL(file) : '');
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setFieldErrors({});
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (value !== '') data.append(key, value); });
      if (logo) data.append('logo', logo);
      if (cover) data.append('cover', cover);
      const response = await api.post('/public/team-registration-requests', data);
      setSuccess(response.data.data.request);
    } catch (requestError) {
      setError(requestError.userMessage);
      setFieldErrors(Object.fromEntries((requestError.fieldErrors || []).map((item) => [item.field, item.message])));
    } finally { setSaving(false); }
  };
  if (success) return <section className="mx-auto max-w-3xl rounded-3xl border border-lime-300/20 bg-lime-300/[0.06] p-8 text-center"><p className="eyebrow">Request submitted</p><h1 className="page-title">Your request has been submitted.</h1><p className="page-copy">Keep this private request code to check review status.</p><p className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-display text-2xl font-black text-lime-200">{success.requestCode}</p><Link className="primary-button mt-6" to={`/team-registration-status/${success.requestCode}`}>Check request status</Link></section>;
  return <form onSubmit={submit} className="mx-auto max-w-5xl space-y-6">
    <header><p className="eyebrow">Club access request</p><h1 className="page-title">Register Your Team</h1><p className="page-copy">Use this form if you represent a team or club. If you are a player applying to an existing team, use that team's Join Team button instead.</p></header>
    {error && <div className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100" role="alert">{error}</div>}
    <Panel title="Team information"><Grid>
      <Field label="Team name" error={fieldErrors.teamName}><input className="field-input" value={form.teamName} onChange={update('teamName')} required /></Field>
      <Field label="Short name" error={fieldErrors.shortName}><input className="field-input" value={form.shortName} onChange={update('shortName')} /></Field>
      <Field label="City" error={fieldErrors.city}><input className="field-input" value={form.city} onChange={update('city')} required /></Field>
      <Field label="State" error={fieldErrors.state}><input className="field-input" value={form.state} onChange={update('state')} /></Field>
      <Field label="Country" error={fieldErrors.country}><input className="field-input" value={form.country} onChange={update('country')} required /></Field>
      <Field label="Founded year" error={fieldErrors.foundedYear}><input className="field-input" type="number" value={form.foundedYear} onChange={update('foundedYear')} /></Field>
      <Field label="Primary color" error={fieldErrors.primaryColor}><input className="field-input" value={form.primaryColor} onChange={update('primaryColor')} /></Field>
      <Field label="Secondary color" error={fieldErrors.secondaryColor}><input className="field-input" value={form.secondaryColor} onChange={update('secondaryColor')} /></Field>
      <Field label="Instagram URL" error={fieldErrors.instagramUrl}><input className="field-input" value={form.instagramUrl} onChange={update('instagramUrl')} placeholder="https://instagram.com/team" /></Field>
      <Field label="Website URL" error={fieldErrors.websiteUrl}><input className="field-input" value={form.websiteUrl} onChange={update('websiteUrl')} placeholder="https://example.com" /></Field>
    </Grid><Field label="Description" error={fieldErrors.description}><textarea className="field-input min-h-28" value={form.description} onChange={update('description')} /></Field></Panel>
    <Panel title="Representative information"><Grid>
      <Field label="Representative name" error={fieldErrors.representativeName}><input className="field-input" value={form.representativeName} onChange={update('representativeName')} required /></Field>
      <Field label="Role in team" error={fieldErrors.roleInTeam}><input className="field-input" value={form.roleInTeam} onChange={update('roleInTeam')} required /></Field>
      <Field label="Email" error={fieldErrors.email}><input className="field-input" type="email" value={form.email} onChange={update('email')} required /></Field>
      <Field label="Phone" error={fieldErrors.phone}><input className="field-input" value={form.phone} onChange={update('phone')} required /></Field>
    </Grid></Panel>
    <Panel title="Branding"><div className="grid gap-4 md:grid-cols-2"><UploadBox label="Logo" preview={logoPreview} onChange={choose(setLogo, setLogoPreview)} /><UploadBox label="Cover image" preview={coverPreview} onChange={choose(setCover, setCoverPreview)} /></div></Panel>
    <Panel title="Message & privacy"><Field label="Message" error={fieldErrors.message}><textarea className="field-input min-h-28" value={form.message} onChange={update('message')} /></Field><p className="mt-3 text-sm text-white/45">Your contact details are visible only to FootStream super admins and are never shown publicly.</p></Panel>
    <button className="primary-button" disabled={saving} type="submit"><Send size={16} /> {saving ? 'Submitting...' : 'Submit team request'}</button>
  </form>;
}

function Panel({ title, children }) { return <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"><h2 className="font-display text-2xl font-bold">{title}</h2><div className="mt-5 space-y-4">{children}</div></section>; }
function Grid({ children }) { return <div className="grid gap-4 md:grid-cols-2">{children}</div>; }
function Field({ label, error, children }) { return <label className="field-label">{label}{children}{error && <span className="mt-1 text-xs text-red-200">{error}</span>}</label>; }
function UploadBox({ label, preview, onChange }) { return <label className="rounded-2xl border border-dashed border-white/15 p-4"><span className="flex items-center gap-2 text-sm font-bold text-white/70"><ImagePlus size={16} /> {label}</span>{preview && <img src={preview} alt="" className="mt-3 h-32 w-full rounded-xl object-cover" />}<input className="mt-3 text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} /></label>; }
