import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LiveMatchView from '../features/live/LiveMatchView.jsx';
import TeamLiveEngagement from '../features/live/TeamLiveEngagement.jsx';

export default function TeamLiveControlPage() {
  const { matchId } = useParams();
  const [viewerCount, setViewerCount] = useState(0);
  const [checklist, setChecklist] = useState(null);
  useEffect(() => {
    api.get(`/team/matches/${matchId}/checklist`).then((response) => setChecklist(response.data.data.checklist)).catch(() => setChecklist(null));
  }, [matchId]);
  return <><Link to="/team/matches" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to matches</Link>{checklist && <MatchChecklist checklist={checklist} />}<LiveMatchView matchId={matchId} mode="team" onViewerCount={setViewerCount} /><TeamLiveEngagement matchId={matchId} viewerCount={viewerCount} /></>;
}

function MatchChecklist({ checklist }) {
  return (
    <section className="panel mb-7">
      <div className="panel-heading"><div><p className="eyebrow">Match day checklist</p><h2 className="panel-title">{checklist.percentage}% ready before kickoff</h2></div><span className="count-pill">{checklist.completed}/{checklist.total}</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {checklist.items.map((item) => <div key={item.key} className={`rounded-2xl border p-3 text-sm ${item.complete ? 'border-lime-300/20 bg-lime-300/10 text-lime-100' : 'border-amber-300/20 bg-amber-300/10 text-amber-100'}`}><CheckCircle2 size={15} /> <span className="ml-1">{item.label}</span></div>)}
      </div>
    </section>
  );
}
