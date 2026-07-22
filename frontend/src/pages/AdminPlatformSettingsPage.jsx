import { ExternalLink, MessageCircle, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function AdminPlatformSettingsPage() {
  const [form, setForm] = useState({ url: '', enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/admin/settings/team-admin-whatsapp')
      .then((response) => setForm(response.data.data.setting || { url: '', enabled: false }))
      .catch(() => setMessage('Unable to load platform settings.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await api.put('/admin/settings/team-admin-whatsapp', form);
      setForm(response.data.data.setting);
      setMessage('Official WhatsApp community setting saved.');
    } catch (error) {
      setMessage(error.userMessage || 'Unable to save WhatsApp setting.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton h-72" />;
  return (
    <section className="panel max-w-3xl">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Platform settings</p>
          <h1 className="panel-title">Official Team Admin WhatsApp Community</h1>
          <p className="mt-2 text-sm text-emerald-100/45">Only approved team admins can see this link. Public users and players cannot access it.</p>
        </div>
        <MessageCircle className="text-lime-200" />
      </div>
      {message && <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">{message}</p>}
      <form onSubmit={save} className="space-y-4">
        <label className="field-label">WhatsApp community link<input className="field-input mt-2" value={form.url || ''} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://chat.whatsapp.com/..." /></label>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 text-sm font-semibold"><input type="checkbox" checked={Boolean(form.enabled)} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> Enable for approved team admins</label>
        <div className="flex flex-wrap gap-3">
          <button className="primary-button" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save setting'}</button>
          {form.url && <a className="secondary-button" href={form.url} target="_blank" rel="noopener noreferrer">Open link <ExternalLink size={15} /></a>}
        </div>
      </form>
    </section>
  );
}
