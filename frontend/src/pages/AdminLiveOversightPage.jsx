import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import LiveMatchView from '../features/live/LiveMatchView.jsx';

export default function AdminLiveOversightPage() {
  const { matchId } = useParams();
  return <><Link to={`/admin/matches/${matchId}`} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to match details</Link><LiveMatchView matchId={matchId} mode="admin" /></>;
}

