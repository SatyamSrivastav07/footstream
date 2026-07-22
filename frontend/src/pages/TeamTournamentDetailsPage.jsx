import { FileText, Search, Sparkles, Trash2, Trophy, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import TeamBrandingUploader, { brandingUrl } from '../components/TeamBrandingUploader.jsx';
import { tournamentApi, unwrapData } from '../features/tournaments/api.js';
import { ReviewTimeline, StatusBadge, TournamentLogo, dateText } from '../features/tournaments/TournamentUi.jsx';
import {
  TOURNAMENT_PARTICIPANT_TYPE_LABEL,
  TOURNAMENT_SCOPE,
  formatTournamentLabel,
} from '../features/tournaments/constants.js';

const participantTabsForScope = (scope) => {
  if (scope === TOURNAMENT_SCOPE.INTRA_COLLEGE) return ['intra'];
  return ['registered', 'external'];
};

const participantHelpText = (scope) => (
  scope === TOURNAMENT_SCOPE.INTRA_COLLEGE
    ? 'Intra-college tournaments accept only intra-college teams.'
    : 'Inter-college tournaments accept registered FootStream teams or external teams.'
);

const userMessageFor = (requestError) => requestError?.userMessage || 'The request could not be completed.';
const canManageParticipants = (tournament) => {
  if (!tournament || tournament.isArchived) return false;
  if (['draft', 'changes_requested'].includes(tournament.approvalStatus)) return true;
  return tournament.scope === TOURNAMENT_SCOPE.INTER_COLLEGE &&
    tournament.approvalStatus === 'approved' &&
    ['draft', 'registration_open'].includes(tournament.lifecycleStatus);
};

export default function TeamTournamentDetailsPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [squadRows, setSquadRows] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [awards, setAwards] = useState({});
  const [tournamentStats, setTournamentStats] = useState(null);
  const [available, setAvailable] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('registered');
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState({ displayName: '', shortName: '', seed: '' });
  const [fixtureForm, setFixtureForm] = useState({ homeParticipant: '', awayParticipant: '', scheduledAt: '', venue: '', round: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, participantResponse, squadsResponse, historyResponse, fixturesResponse, standingsResponse, awardsResponse, statsResponse] = await Promise.all([
        tournamentApi.getHosted(tournamentId),
        tournamentApi.participants(tournamentId),
        tournamentApi.squads(tournamentId),
        tournamentApi.history(tournamentId),
        tournamentApi.fixtures(tournamentId),
        tournamentApi.standings(tournamentId),
        tournamentApi.awards(tournamentId),
        tournamentApi.tournamentStats(tournamentId),
      ]);
      setTournament(unwrapData(detail).tournament);
      setParticipants(unwrapData(participantResponse).participants || []);
      setSquadRows(unwrapData(squadsResponse).squads || []);
      setHistory(unwrapData(historyResponse).history || []);
      setFixtures(unwrapData(fixturesResponse).fixtures || []);
      setStandings(unwrapData(standingsResponse).standings || []);
      setAwards(unwrapData(awardsResponse).awards || {});
      setTournamentStats(unwrapData(statsResponse));
      setError('');
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const allowedTabs = participantTabsForScope(tournament?.scope);
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0]);
  }, [tab, tournament?.scope]);

  const searchTeams = async () => {
    try {
      const response = await tournamentApi.availableTeams(tournamentId, { search });
      setAvailable(unwrapData(response).teams || []);
    } catch (requestError) {
      setError(requestError.userMessage);
    }
  };

  const addRegistered = async (teamId) => {
    if (participantChangesLocked) return;
    try {
      setError('');
      await tournamentApi.addRegistered(tournamentId, { registeredTeam: teamId });
      await load();
    } catch (requestError) {
      setError(userMessageFor(requestError));
    }
  };

  const addManual = async () => {
    if (participantChangesLocked) return;
    try {
      setError('');
      const allowedTabs = participantTabsForScope(tournament?.scope);
      const activeTab = allowedTabs.includes(tab) ? tab : allowedTabs[0];
      await (activeTab === 'external' ? tournamentApi.addExternal : tournamentApi.addIntra)(tournamentId, { ...manual, seed: manual.seed || undefined });
      setManual({ displayName: '', shortName: '', seed: '' });
      await load();
    } catch (requestError) {
      setError(userMessageFor(requestError));
    }
  };

  const remove = async (participantId) => {
    if (participantChangesLocked) return;
    if (window.confirm('Remove this participant?')) {
      try {
        setError('');
        await tournamentApi.removeParticipant(tournamentId, participantId);
        await load();
      } catch (requestError) {
        setError(userMessageFor(requestError));
      }
    }
  };

  const generateFixtures = async () => {
    if (!window.confirm('Generate round-robin fixtures for all current participants?')) return;
    try {
      setActionMessage('');
      await tournamentApi.generateFixtures(tournamentId, { append: false });
      setActionMessage('Fixtures generated successfully.');
      await load();
    } catch (requestError) {
      setError(userMessageFor(requestError));
    }
  };

  const createFixture = async () => {
    try {
      setActionMessage('');
      await tournamentApi.createFixture(tournamentId, {
        ...fixtureForm,
        homeParticipant: fixtureForm.homeParticipant || undefined,
        awayParticipant: fixtureForm.awayParticipant || undefined,
        scheduledAt: fixtureForm.scheduledAt || undefined,
        venue: fixtureForm.venue || undefined,
        round: fixtureForm.round || undefined,
      });
      setFixtureForm({ homeParticipant: '', awayParticipant: '', scheduledAt: '', venue: '', round: '' });
      setActionMessage('Fixture draft created.');
      await load();
    } catch (requestError) {
      setError(userMessageFor(requestError));
    }
  };

  const createMatch = async (fixture) => {
    try {
      setActionMessage('');
      await tournamentApi.createFixtureMatch(tournamentId, fixture.id, {});
      setActionMessage('Tournament match created from fixture.');
      await load();
    } catch (requestError) {
      setError(userMessageFor(requestError));
    }
  };

  if (loading) return <div className="skeleton h-96" />;
  if (error) return <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">{error}</div>;
  if (!tournament) return <EmptyState title="Tournament not found" message="This tournament could not be loaded." />;

  const brandingLocked = !['draft', 'changes_requested'].includes(tournament.approvalStatus);
  const participantChangesLocked = !canManageParticipants(tournament);
  const squadFor = (participantId) => squadRows.find((row) => row.participant?.id === participantId)?.squad;
  const participantTabs = participantTabsForScope(tournament.scope);
  const activeTab = participantTabs.includes(tab) ? tab : participantTabs[0];

  return (
    <>
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <TournamentLogo tournament={tournament} className="size-16" />
          <div>
            <p className="eyebrow">Tournament detail</p>
            <h1 className="page-title">{tournament.name}</h1>
            <p className="page-copy">{tournament.seasonLabel} · {formatTournamentLabel(tournament.scope)} · {dateText(tournament.startDate)} - {dateText(tournament.endDate)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!brandingLocked && <Link to={`/team/tournaments/${tournament.id}/edit`} className="secondary-button">Edit</Link>}
          <Link to={`/team/tournaments/${tournament.id}/lineups`} className="primary-button">Matchday Lineups</Link>
          <Link to={`/team/tournaments/${tournament.id}/history`} className="secondary-button">History</Link>
          <a href={tournamentApi.reportUrl(tournament.id)} target="_blank" rel="noopener noreferrer" className="secondary-button"><FileText size={16} /> Report</a>
        </div>
      </header>

      {actionMessage && <div className="mt-6 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 text-lime-100">{actionMessage}</div>}

      <section className="mt-7 grid gap-5 lg:grid-cols-3">
        <Info title="Approval" value={formatTournamentLabel(tournament.approvalStatus)} />
        <Info title="Visibility" value={tournament.isPublished ? 'Published' : 'Unpublished'} />
        <Info title="Venue" value={`${tournament.primaryVenue || 'Venue not set'} · ${tournament.city || 'City not set'}`} />
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Fixtures & Results">
          <div className="mb-5 flex flex-wrap gap-2">
            <button type="button" className="primary-button" onClick={generateFixtures} disabled={participants.length < 2}><Sparkles size={16} /> Generate Fixtures</button>
            <Link to={`/team/tournaments/${tournament.id}/lineups`} className="secondary-button">Prepare Lineups</Link>
          </div>
          <div className="mb-5 grid gap-3 md:grid-cols-5">
            <select className="field-input" value={fixtureForm.homeParticipant} onChange={(event) => setFixtureForm({ ...fixtureForm, homeParticipant: event.target.value })}>
              <option value="">Home participant</option>
              {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}
            </select>
            <select className="field-input" value={fixtureForm.awayParticipant} onChange={(event) => setFixtureForm({ ...fixtureForm, awayParticipant: event.target.value })}>
              <option value="">Away participant</option>
              {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}
            </select>
            <input className="field-input" type="datetime-local" value={fixtureForm.scheduledAt} onChange={(event) => setFixtureForm({ ...fixtureForm, scheduledAt: event.target.value })} />
            <input className="field-input" placeholder="Venue" value={fixtureForm.venue} onChange={(event) => setFixtureForm({ ...fixtureForm, venue: event.target.value })} />
            <button type="button" className="secondary-button" disabled={!fixtureForm.homeParticipant || !fixtureForm.awayParticipant} onClick={createFixture}>Add Fixture</button>
          </div>
          {fixtures.length === 0 ? <p>No fixtures created yet.</p> : fixtures.map((fixture) => (
            <article key={`${fixture.type}-${fixture.id}`} className="rounded-2xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{fixture.homeParticipant?.displayName || 'Home'} vs {fixture.awayParticipant?.displayName || 'Away'}</p>
                  <p className="text-sm text-white/45">{dateText(fixture.scheduledAt)} · {fixture.venue || tournament.primaryVenue || 'Venue not set'} · {formatTournamentLabel(fixture.status)}</p>
                </div>
                {fixture.type === 'lineup' && !fixture.matchCreated ? (
                  <button type="button" className="secondary-button" onClick={() => createMatch(fixture)}>Create Match</button>
                ) : fixture.matchId ? (
                  <Link className="secondary-button" to={`/team/matches/${fixture.matchId}`}>Open Match</Link>
                ) : null}
              </div>
            </article>
          ))}
        </Panel>
        <Panel title="Standings">
          {standings.length === 0 ? <p>No completed tournament matches yet.</p> : <StandingTable rows={standings} />}
        </Panel>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel title="Awards">
          <div className="grid gap-3 sm:grid-cols-2">
            <Award label="Champion" value={awards.champion?.displayName} />
            <Award label="Runner-up" value={awards.runnerUp?.displayName} />
            <Award label="Golden Boot" value={awards.goldenBoot?.name} />
            <Award label="Top Assist" value={awards.topAssist?.name} />
            <Award label="MVP" value={awards.mostValuablePlayer?.name} />
            <Award label="Fair Play" value={awards.fairPlay?.displayName} />
          </div>
        </Panel>
        <Panel title="Tournament Statistics">
          <div className="grid gap-3 sm:grid-cols-3">
            <Info title="Matches" value={tournamentStats?.totals?.matches || 0} />
            <Info title="Goals" value={tournamentStats?.totals?.goals || 0} />
            <Info title="Players" value={tournamentStats?.totals?.players || 0} />
          </div>
          {(tournamentStats?.players || []).slice(0, 5).map((player) => (
            <p key={player.playerId} className="mt-3 text-sm text-white/65">{player.name}: {player.goals} goals, {player.assists} assists</p>
          ))}
        </Panel>
      </section>

      <section className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Participant management</p>
            <h2 className="font-display text-3xl font-black">Participants</h2>
          </div>
          <StatusBadge><UsersRound size={12} className="mr-1 inline" />{participants.length}</StatusBadge>
        </div>
        {participantChangesLocked && <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">Participant changes are read-only in this approval state.</div>}
        {!participantChangesLocked && tournament.approvalStatus === 'approved' && tournament.scope === TOURNAMENT_SCOPE.INTER_COLLEGE && <div className="mt-5 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 text-sm text-lime-100">Add participating teams during the registration window.</div>}
        <p className="mt-4 text-sm text-white/50">{participantHelpText(tournament.scope)}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {participantTabs.map((item) => (
            <button key={item} type="button" className={`rounded-full border px-4 py-2 text-sm font-bold ${activeTab === item ? 'border-lime-300/40 bg-lime-300/15 text-lime-100' : 'border-white/10 text-white/55'}`} onClick={() => setTab(item)}>
              {formatTournamentLabel(item)} Teams
            </button>
          ))}
        </div>

        {activeTab === 'registered' ? (
          <div className="mt-5">
            <div className="flex gap-3">
              <input className="field-input" placeholder="Search public registered teams" value={search} onChange={(event) => setSearch(event.target.value)} disabled={participantChangesLocked} />
              <button type="button" className="secondary-button" onClick={searchTeams} disabled={participantChangesLocked}><Search size={16} /> Search</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {available.length === 0 ? <p className="text-sm text-white/45">Search teams to add registered participants.</p> : available.map((team) => (
                <button key={team.id} type="button" className="rounded-2xl border border-white/10 p-4 text-left hover:border-lime-300/30 disabled:opacity-50" disabled={participantChangesLocked} onClick={() => addRegistered(team.id)}>
                  <strong>{team.name}</strong><span className="ml-2 text-white/40">{team.city}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_160px_100px_auto]">
            <input className="field-input" placeholder={activeTab === 'intra' ? 'Department, house, or class team name' : `${formatTournamentLabel(activeTab)} team name`} value={manual.displayName} disabled={participantChangesLocked} onChange={(event) => setManual({ ...manual, displayName: event.target.value })} />
            <input className="field-input" placeholder="Short name" value={manual.shortName} disabled={participantChangesLocked} onChange={(event) => setManual({ ...manual, shortName: event.target.value })} />
            <input className="field-input" placeholder="Seed" value={manual.seed} disabled={participantChangesLocked} onChange={(event) => setManual({ ...manual, seed: event.target.value })} />
            <button type="button" className="primary-button" disabled={participantChangesLocked || !manual.displayName.trim()} onClick={addManual}>Add</button>
          </div>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {participants.length === 0 ? (
            <EmptyState title="No participants" message="Add registered, external, or intra teams." />
          ) : participants.map((participant) => {
            const squad = squadFor(participant.id);
            return (
            <article key={participant.id} className="rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ParticipantLogo participant={participant} />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{participant.displayName}</p>
                    <p className="text-xs text-white/45">{TOURNAMENT_PARTICIPANT_TYPE_LABEL[participant.participantType]} · {participant.status}</p>
                  </div>
                </div>
                {!participantChangesLocked && <button type="button" className="icon-button" onClick={() => remove(participant.id)} aria-label={`Remove ${participant.displayName}`}><Trash2 size={16} /></button>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge tone={squad?.status === 'locked' ? 'lime' : 'neutral'}>{squad ? formatTournamentLabel(squad.status) : 'No Squad'}</StatusBadge>
                <span className="text-sm text-white/45">{squad?.playerCount || 0}/{tournament.maximumSquad} players</span>
                <Link className="secondary-button" to={`/team/tournaments/${tournamentId}/participants/${participant.id}/squad`}>Manage Squad</Link>
              </div>
              <div className="mt-4">
                <TeamBrandingUploader
                  kind="logo"
                  fieldName="logo"
                  initialImage={participant.logo}
                  uploadUrl={`/team/hosted-tournaments/${tournamentId}/participants/${participant.id}/logo`}
                  deleteUrl={`/team/hosted-tournaments/${tournamentId}/participants/${participant.id}/logo`}
                  disabled={brandingLocked}
                  onChanged={load}
                />
              </div>
            </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-3xl font-black">Recent Timeline</h2>
        <ReviewTimeline history={history.slice(0, 4)} />
      </section>
    </>
  );
}

function Info({ title, value }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"><p className="eyebrow">{title}</p><p className="mt-2 text-lg font-bold">{value}</p></div>;
}

function Panel({ title, children }) {
  return <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"><h2 className="mb-4 font-display text-3xl font-black">{title}</h2><div className="space-y-3 text-white/65">{children}</div></section>;
}

function Award({ label, value }) {
  return <div className="rounded-2xl border border-lime-300/10 bg-lime-300/5 p-4"><p className="eyebrow"><Trophy size={12} className="mr-1 inline" />{label}</p><p className="mt-2 font-bold text-white">{value || 'Pending'}</p></div>;
}

function StandingTable({ rows }) {
  return <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-white/45"><tr><th className="p-2 text-left">Team</th><th className="p-2">P</th><th className="p-2">W</th><th className="p-2">D</th><th className="p-2">L</th><th className="p-2">GD</th><th className="p-2">Pts</th></tr></thead><tbody>{rows.map((row) => <tr key={row.participant.id} className="border-t border-white/10"><td className="p-2 font-bold text-white">{row.participant.displayName}</td><td className="p-2 text-center">{row.played}</td><td className="p-2 text-center">{row.won}</td><td className="p-2 text-center">{row.drawn}</td><td className="p-2 text-center">{row.lost}</td><td className="p-2 text-center">{row.goalDifference}</td><td className="p-2 text-center font-black text-lime-200">{row.points}</td></tr>)}</tbody></table></div>;
}

function ParticipantLogo({ participant }) {
  const src = brandingUrl(participant.logo);
  return src ? <img src={src} alt="" className="size-12 rounded-xl border border-white/10 bg-black/20 object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-lime-300/15 bg-lime-300/10 text-xs font-black text-lime-100">{(participant.shortName || participant.displayName || 'T').slice(0, 2).toUpperCase()}</div>;
}
