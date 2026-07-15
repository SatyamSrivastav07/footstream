import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { TOURNAMENT_AWARD_OPTIONS, TOURNAMENT_COMPETITION_FORMAT, TOURNAMENT_MATCH_FORMAT_LABEL, TOURNAMENT_SCOPE, TOURNAMENT_TIEBREAK_OPTIONS, TOURNAMENT_VISIBILITY, formatTournamentLabel } from '../features/tournaments/constants.js';

const initial = {
  name: '', shortName: '', seriesName: '', seasonLabel: '', description: '', scope: TOURNAMENT_SCOPE.INTER_COLLEGE, competitionFormat: TOURNAMENT_COMPETITION_FORMAT.LEAGUE, visibility: TOURNAMENT_VISIBILITY.PRIVATE,
  country: '', state: '', city: '', primaryVenue: '', registrationOpen: '', registrationClose: '', startDate: '', endDate: '',
  playersOnField: 11, matchFormat: TOURNAMENT_MATCH_FORMAT_LABEL.ELEVEN_V_ELEVEN, minimumTeams: 2, maximumTeams: 16, winPoints: 3, drawPoints: 1, lossPoints: 0, walkoverEnabled: true,
  tiebreakOrder: ['points', 'goal_difference', 'goals_scored'], awardsEnabled: ['champion', 'runner_up'],
};
const steps = ['Basic Information', 'Venue', 'Dates', 'Competition', 'Review'];
const isoDate = (value) => value ? String(value).slice(0, 10) : '';

export default function TournamentEditorPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(tournamentId);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const load = useCallback(async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const response = await tournamentApi.getHosted(tournamentId);
      const tournament = unwrapData(response).tournament;
      setForm({ ...initial, ...tournament, registrationOpen: isoDate(tournament.registrationOpen), registrationClose: isoDate(tournament.registrationClose), startDate: isoDate(tournament.startDate), endDate: isoDate(tournament.endDate) });
      setLocked(!['draft', 'changes_requested'].includes(tournament.approvalStatus));
    } catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [editing, tournamentId]);
  useEffect(() => { load(); }, [load]);
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, playersOnField: Number(form.playersOnField), minimumTeams: Number(form.minimumTeams), maximumTeams: Number(form.maximumTeams), winPoints: Number(form.winPoints), drawPoints: Number(form.drawPoints), lossPoints: Number(form.lossPoints) };
      const response = editing ? await tournamentApi.updateHosted(tournamentId, payload) : await tournamentApi.createHosted(payload);
      navigate(`/team/tournaments/${unwrapData(response).tournament.id}`);
    } catch (requestError) { setError(requestError.userMessage); }
  };
  if (loading) return <div className="skeleton h-96" />;
  return <form onSubmit={submit}><header className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Tournament wizard</p><h1 className="page-title">{editing ? 'Edit Tournament' : 'Create Tournament'}</h1><p className="page-copy">Step {step + 1} of {steps.length}: {steps[step]}</p></div><Link to="/team/tournaments" className="secondary-button"><ArrowLeft size={16} /> Back</Link></header>
    {locked && <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100">This tournament is locked by its approval status. Backend will reject edits until changes are requested.</div>}
    {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>}
    <div className="mt-7 flex flex-wrap gap-2">{steps.map((label, index) => <button type="button" key={label} onClick={() => setStep(index)} className={`rounded-full border px-4 py-2 text-sm font-bold ${step === index ? 'border-lime-300/40 bg-lime-300/15 text-lime-100' : 'border-white/10 text-white/50'}`}>{label}</button>)}</div>
    <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
      {step === 0 && <div className="grid gap-4 md:grid-cols-2"><Field label="Tournament Name"><input className="field-input" required value={form.name} onChange={(e) => update('name', e.target.value)} /></Field><Field label="Short Name"><input className="field-input" value={form.shortName} onChange={(e) => update('shortName', e.target.value)} /></Field><Field label="Series Name"><input className="field-input" value={form.seriesName} onChange={(e) => update('seriesName', e.target.value)} /></Field><Field label="Season"><input className="field-input" value={form.seasonLabel} onChange={(e) => update('seasonLabel', e.target.value)} /></Field><Field label="Tournament Scope"><select className="field-input" value={form.scope} onChange={(e) => update('scope', e.target.value)}>{Object.values(TOURNAMENT_SCOPE).map((item) => <option key={item} value={item}>{formatTournamentLabel(item)}</option>)}</select></Field><Field label="Competition Format"><select className="field-input" value={form.competitionFormat} onChange={(e) => update('competitionFormat', e.target.value)}>{Object.values(TOURNAMENT_COMPETITION_FORMAT).map((item) => <option key={item} value={item}>{formatTournamentLabel(item)}</option>)}</select></Field><Field label="Visibility"><select className="field-input" value={form.visibility} onChange={(e) => update('visibility', e.target.value)}><option value="private">Private</option><option value="public">Public</option></select></Field><Field label="Description"><textarea className="field-input min-h-28" value={form.description} onChange={(e) => update('description', e.target.value)} /></Field></div>}
      {step === 1 && <div className="grid gap-4 md:grid-cols-2"><Field label="Country"><input className="field-input" value={form.country} onChange={(e) => update('country', e.target.value)} /></Field><Field label="State"><input className="field-input" value={form.state} onChange={(e) => update('state', e.target.value)} /></Field><Field label="City"><input className="field-input" value={form.city} onChange={(e) => update('city', e.target.value)} /></Field><Field label="Venue"><input className="field-input" value={form.primaryVenue} onChange={(e) => update('primaryVenue', e.target.value)} /></Field><Field label="Additional Venues"><textarea className="field-input min-h-28" placeholder="Coming soon as structured venue entries" disabled /></Field></div>}
      {step === 2 && <div className="grid gap-4 md:grid-cols-2"><Field label="Registration Opens"><input type="date" className="field-input" value={form.registrationOpen} onChange={(e) => update('registrationOpen', e.target.value)} /></Field><Field label="Registration Closes"><input type="date" className="field-input" value={form.registrationClose} onChange={(e) => update('registrationClose', e.target.value)} /></Field><Field label="Start Date"><input type="date" className="field-input" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} /></Field><Field label="End Date"><input type="date" className="field-input" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} /></Field></div>}
      {step === 3 && <div className="grid gap-4 md:grid-cols-3"><Field label="Players on field"><input type="number" className="field-input" min="3" max="11" value={form.playersOnField} onChange={(e) => update('playersOnField', e.target.value)} /></Field><Field label="Match Format"><select className="field-input" value={form.matchFormat} onChange={(e) => update('matchFormat', e.target.value)}>{Object.values(TOURNAMENT_MATCH_FORMAT_LABEL).map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><Field label="Min Teams"><input type="number" className="field-input" value={form.minimumTeams} onChange={(e) => update('minimumTeams', e.target.value)} /></Field><Field label="Max Teams"><input type="number" className="field-input" value={form.maximumTeams} onChange={(e) => update('maximumTeams', e.target.value)} /></Field><Field label="Win Points"><input type="number" className="field-input" value={form.winPoints} onChange={(e) => update('winPoints', e.target.value)} /></Field><Field label="Draw Points"><input type="number" className="field-input" value={form.drawPoints} onChange={(e) => update('drawPoints', e.target.value)} /></Field><Field label="Loss Points"><input type="number" className="field-input" value={form.lossPoints} onChange={(e) => update('lossPoints', e.target.value)} /></Field><Field label="Walkover"><select className="field-input" value={String(form.walkoverEnabled)} onChange={(e) => update('walkoverEnabled', e.target.value === 'true')}><option value="true">Enabled</option><option value="false">Disabled</option></select></Field><Field label="Tiebreak Priority"><select multiple className="field-input min-h-28" value={form.tiebreakOrder} onChange={(e) => update('tiebreakOrder', [...e.target.selectedOptions].map((option) => option.value))}>{TOURNAMENT_TIEBREAK_OPTIONS.map((item) => <option key={item} value={item}>{formatTournamentLabel(item)}</option>)}</select></Field><Field label="Awards Enabled"><select multiple className="field-input min-h-28" value={form.awardsEnabled} onChange={(e) => update('awardsEnabled', [...e.target.selectedOptions].map((option) => option.value))}>{TOURNAMENT_AWARD_OPTIONS.map((item) => <option key={item} value={item}>{formatTournamentLabel(item)}</option>)}</select></Field></div>}
      {step === 4 && <div className="space-y-3 text-white/70"><h2 className="font-display text-3xl font-black text-white">{form.name || 'Untitled Tournament'}</h2><p>{form.seriesName} · {form.seasonLabel} · {formatTournamentLabel(form.scope)}</p><p>{form.city}, {form.country} · {form.primaryVenue}</p><p>{form.matchFormat} · {form.minimumTeams}-{form.maximumTeams} teams · {form.winPoints}/{form.drawPoints}/{form.lossPoints} points</p></div>}
    </section>
    <div className="mt-6 flex justify-between"><button type="button" className="secondary-button" disabled={step === 0} onClick={() => setStep((value) => Math.max(value - 1, 0))}><ArrowLeft size={16} /> Previous</button>{step < steps.length - 1 ? <button type="button" className="primary-button" onClick={() => setStep((value) => value + 1)}>Next <ArrowRight size={16} /></button> : <button className="primary-button"><Save size={16} /> Submit Draft</button>}</div>
  </form>;
}

function Field({ label, children }) {
  return <label className="block text-sm font-semibold text-white/70"><span className="mb-2 block">{label}</span>{children}</label>;
}
