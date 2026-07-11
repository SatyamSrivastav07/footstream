import { ArrowLeft, Pencil, Radio, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import MatchDetails from '../features/matches/MatchDetails.jsx';
import MatchStreamManager from '../features/matches/MatchStreamManager.jsx';

export default function TeamMatchDetailsPage() {
  const { matchId } = useParams(); const { user } = useAuth();
  const [match, setMatch] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { const response = await api.get(`/team/matches/${matchId}`); setMatch(response.data.data.match); } catch (requestError) { setError(requestError.userMessage); } finally { setLoading(false); } }, [matchId]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingScreen />;
  if (!match) return <div className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>;
  return <><div className="mb-7 flex flex-wrap items-center justify-between gap-3"><Link to="/team/matches" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to matches</Link><div className="flex gap-2">{match.status === 'scheduled' && <Link to={`/team/matches/${match._id}/edit`} className="secondary-button"><Pencil size={16} /> Edit match</Link>}{match.status === 'completed' && <Link to={`/team/matches/${match._id}/result`} className="primary-button"><Trophy size={16} /> Result</Link>}{['scheduled', 'live', 'half_time'].includes(match.status) && <Link to={`/team/matches/${match._id}/live`} className="primary-button"><Radio size={16} /> Live control</Link>}</div></div><MatchDetails match={match} fallbackTeamName={user.team?.name} /><MatchStreamManager matchId={match._id} matchStatus={match.status} /></>;
}
