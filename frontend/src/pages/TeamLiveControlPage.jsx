import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LiveMatchView from '../features/live/LiveMatchView.jsx';
import TeamLiveEngagement from '../features/live/TeamLiveEngagement.jsx';

export default function TeamLiveControlPage() {
  const { matchId } = useParams();
  const [viewerCount, setViewerCount] = useState(0);
  return <><Link to="/team/matches" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to matches</Link><LiveMatchView matchId={matchId} mode="team" onViewerCount={setViewerCount} /><TeamLiveEngagement matchId={matchId} viewerCount={viewerCount} /></>;
}
