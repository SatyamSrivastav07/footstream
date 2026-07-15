import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { ReviewTimeline } from '../features/tournaments/TournamentUi.jsx';

export default function TournamentHistoryPage({ admin = false }) {
  const { tournamentId } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const response = admin ? await tournamentApi.adminHistory(tournamentId) : await tournamentApi.history(tournamentId); setHistory(unwrapData(response).history || []); setError(''); }
    catch (requestError) { setError(requestError.userMessage); }
    finally { setLoading(false); }
  }, [admin, tournamentId]);
  useEffect(() => { load(); }, [load]);
  return <><header className="flex items-end justify-between"><div><p className="eyebrow">Audit trail</p><h1 className="page-title">Review History</h1><p className="page-copy">Created, submitted, approved, rejected, suspended, published, unpublished, and archived events.</p></div><Link to={admin ? `/admin/tournaments/${tournamentId}` : `/team/tournaments/${tournamentId}`} className="secondary-button">Back</Link></header><section className="mt-7">{loading ? <div className="skeleton h-80" /> : error ? <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div> : history.length === 0 ? <EmptyState title="No timeline yet" message="Tournament audit entries will appear here." /> : <ReviewTimeline history={history} />}</section></>;
}
