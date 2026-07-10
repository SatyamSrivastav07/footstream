import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import MatchForm from '../features/matches/MatchForm.jsx';

export default function MatchEditorPage() {
  const { matchId } = useParams();
  const editing = Boolean(matchId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const load = useCallback(async () => {
    if (!editing) return;
    try { const response = await api.get(`/team/matches/${matchId}`); setMatch(response.data.data.match); }
    catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [editing, matchId]);
  useEffect(() => { load(); }, [load]);

  const save = async (payload) => {
    setSaving(true); setError(''); setFieldErrors({});
    try {
      const response = editing ? await api.patch(`/team/matches/${matchId}`, payload) : await api.post('/team/matches', payload);
      navigate(`/team/matches/${response.data.data.match._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.userMessage);
      setFieldErrors(Object.fromEntries((requestError.fieldErrors || []).map((item) => [item.field, item.message])));
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingScreen />;
  if (editing && !match) return <><Link to="/team/matches" className="secondary-button"><ArrowLeft size={16} /> Matches</Link><div className="mt-7 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error || 'Match could not be loaded.'}</div></>;

  return <><Link to="/team/matches" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to matches</Link><header className="mb-8 mt-6"><p className="eyebrow">{editing ? 'Scheduled match editor' : 'New fixture'}</p><h1 className="page-title">{editing ? `Edit vs ${match.opponent.name}` : 'Create match'}</h1><p className="page-copy">Build the official match-day squad from active, available players.</p></header><MatchForm initialMatch={match} teamName={user.team?.name || 'Your team'} saving={saving} serverError={error} serverFieldErrors={fieldErrors} onSubmit={save} /></>;
}

