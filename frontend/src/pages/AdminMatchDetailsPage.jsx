import { ArrowLeft, ClipboardCheck, Radio, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import MatchDetails from '../features/matches/MatchDetails.jsx';

export default function AdminMatchDetailsPage() {
  const { matchId } = useParams(); const [match, setMatch] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { const response = await api.get(`/admin/matches/${matchId}`); setMatch(response.data.data.match); } catch (requestError) { setError(requestError.userMessage); } finally { setLoading(false); } }, [matchId]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingScreen />;
  if (!match) return <div className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>;
  const isDirectMatch = match.matchMode === 'direct';
  return <><div className="mb-7 flex flex-wrap items-center justify-between gap-3"><Link to="/admin/matches" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to all matches</Link><div className="flex gap-2">{isDirectMatch && ['scheduled', 'completed'].includes(match.status) && <Link to={`/admin/matches/${match._id}/direct-result`} className="primary-button"><ClipboardCheck size={16} /> {match.status === 'completed' ? 'Edit direct result' : 'Input result'}</Link>}{match.status === 'completed' && <Link to={`/admin/matches/${match._id}/result`} className="primary-button"><Trophy size={16} /> Result</Link>}{!isDirectMatch && <Link to={`/admin/matches/${match._id}/live`} className="secondary-button"><Radio size={16} /> Live oversight</Link>}</div></div><MatchDetails match={match} /></>;
}
