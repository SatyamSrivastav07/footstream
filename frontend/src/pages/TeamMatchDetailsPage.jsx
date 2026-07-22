import { ArrowLeft, Bell, CheckCircle2, ClipboardCheck, Download, Pencil, Radio, Send, ShieldQuestion, Trophy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { apiBaseUrl } from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import MatchDetails from '../features/matches/MatchDetails.jsx';
import MatchStreamManager from '../features/matches/MatchStreamManager.jsx';

export default function TeamMatchDetailsPage() {
  const { matchId } = useParams(); const { user } = useAuth();
  const [match, setMatch] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [reminderNotice, setReminderNotice] = useState('');
  const [reminderBusy, setReminderBusy] = useState(false);
  const [collaborationBusy, setCollaborationBusy] = useState(false);
  const load = useCallback(async () => { try { const response = await api.get(`/team/matches/${matchId}`); setMatch(response.data.data.match); } catch (requestError) { setError(requestError.userMessage); } finally { setLoading(false); } }, [matchId]);
  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingScreen />;
  if (!match) return <div className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-red-100">{error}</div>;
  const canEdit = match.permissions?.canEditDetails !== false || match.permissions?.canEditLineup !== false;
  const canControlLive = match.permissions?.canControlLive !== false;
  const canManageStream = match.permissions?.canManageStream !== false;
  const isDirectMatch = match.matchMode === 'direct';
  const resultPath = match.permissions?.canManage === false ? `/matches/${match._id}/result` : `/team/matches/${match._id}/result`;
  const reportUrl = `${apiBaseUrl}/team/matches/${match._id}/report`;
  const sendReminder = async () => {
    setReminderBusy(true); setReminderNotice('');
    try {
      const response = await api.post(`/team/matches/${match._id}/reminder`);
      setReminderNotice(`Reminder processed: ${response.data.data.sent || 0} sent, ${response.data.data.skipped || 0} skipped.`);
    } catch (requestError) {
      setReminderNotice(requestError.userMessage);
    } finally {
      setReminderBusy(false);
    }
  };
  const inviteCollaboration = async () => {
    setCollaborationBusy(true);
    setReminderNotice('');
    try {
      await api.post(`/team/matches/${match._id}/collaboration/invite`);
      setReminderNotice('Opponent verification request sent.');
      await load();
      window.dispatchEvent(new Event('footstream:notifications-changed'));
    } catch (requestError) {
      setReminderNotice(requestError.userMessage);
    } finally {
      setCollaborationBusy(false);
    }
  };
  return <><div className="mb-7 flex flex-wrap items-center justify-between gap-3"><Link to="/team/matches" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100/50 hover:text-lime-200"><ArrowLeft size={16} /> Back to matches</Link><div className="flex gap-2">{match.status === 'scheduled' && canControlLive && !isDirectMatch && <button type="button" className="secondary-button" disabled={reminderBusy} onClick={sendReminder}><Bell size={16} /> Send reminder</button>}{match.status === 'scheduled' && canEdit && <Link to={`/team/matches/${match._id}/edit`} className="secondary-button"><Pencil size={16} /> Edit match</Link>}{isDirectMatch && ['scheduled', 'completed'].includes(match.status) && match.permissions?.canManage !== false && <Link to={`/team/matches/${match._id}/direct-result`} className="primary-button"><ClipboardCheck size={16} /> {match.status === 'completed' ? 'Edit direct result' : 'Input result'}</Link>}{match.status === 'completed' && <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="secondary-button"><Download size={16} /> Report</a>}{match.status === 'completed' && <Link to={resultPath} className="primary-button"><Trophy size={16} /> Result</Link>}{!isDirectMatch && ['scheduled', 'live', 'half_time'].includes(match.status) && <Link to={`/team/matches/${match._id}/live`} className={canControlLive ? 'primary-button' : 'secondary-button'}><Radio size={16} /> {canControlLive ? 'Live control' : 'Live view'}</Link>}</div></div>{reminderNotice && <div className="mb-5 rounded-xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm text-lime-100">{reminderNotice}</div>}<CollaborationStatusCard match={match} busy={collaborationBusy} onInvite={inviteCollaboration} /><MatchDetails match={match} fallbackTeamName={user.team?.name} />{canManageStream && !isDirectMatch && <MatchStreamManager matchId={match._id} matchStatus={match.status} />}</>;
}

function CollaborationStatusCard({ match, busy, onInvite }) {
  if (!match.registeredOpponentTeam || match.status !== 'completed') return null;
  const collaboration = match.collaboration;
  const hostView = match.perspective !== 'registeredOpponent';
  return (
    <section className="mb-6 rounded-3xl border border-lime-300/15 bg-lime-300/[0.055] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime-300/10 text-lime-200"><ShieldQuestion size={20} /></span>
          <div>
            <p className="eyebrow">Match verification</p>
            <h2 className="font-display text-xl font-bold text-white">{collaboration?.badge || 'Opponent verification available'}</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-100/50">
              Host statistics are already published. Opponent-side statistics count after the registered opponent accepts.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {collaboration ? (
            <Link to={`/team/collaborations/${collaboration.id}`} className="primary-button">
              <CheckCircle2 size={16} /> Open verification
            </Link>
          ) : hostView ? (
            <button type="button" className="primary-button" disabled={busy} onClick={onInvite}>
              <Send size={16} /> Invite opponent
            </button>
          ) : (
            <Link to="/team/collaborations" className="primary-button">
              <CheckCircle2 size={16} /> Review requests
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
