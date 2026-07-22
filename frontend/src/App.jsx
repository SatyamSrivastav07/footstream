import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import SuperAdminDashboard from "./pages/SuperAdminDashboard.jsx";
import TeamAdminDashboard from "./pages/TeamAdminDashboard.jsx";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
import SquadManagementPage from "./pages/SquadManagementPage.jsx";
import TacticalBoardPage from "./pages/TacticalBoardPage.jsx";
import AdminSquadViewPage from "./pages/AdminSquadViewPage.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import RoleRoute from "./routes/RoleRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import TeamMatchesPage from "./pages/TeamMatchesPage.jsx";
import MatchEditorPage from "./pages/MatchEditorPage.jsx";
import TeamMatchDetailsPage from "./pages/TeamMatchDetailsPage.jsx";
import AdminMatchesPage from "./pages/AdminMatchesPage.jsx";
import AdminMatchDetailsPage from "./pages/AdminMatchDetailsPage.jsx";
import TeamLiveControlPage from "./pages/TeamLiveControlPage.jsx";
import AdminLiveOversightPage from "./pages/AdminLiveOversightPage.jsx";
import StatisticsPage from "./pages/StatisticsPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import PlayerStatisticsPage from "./pages/PlayerStatisticsPage.jsx";
import MatchResultPage from "./pages/MatchResultPage.jsx";
import DirectResultPage from "./pages/DirectResultPage.jsx";
import PublicLayout from "./layouts/PublicLayout.jsx";
import PublicHomePage from "./pages/PublicHomePage.jsx";
import PublicDirectoryPage from "./pages/PublicDirectoryPage.jsx";
import AdminTeamProfileEditorPage from "./pages/AdminTeamProfileEditorPage.jsx";
import AdminTeamsPage from "./pages/AdminTeamsPage.jsx";
import AdminPendingTeamsPage from "./pages/AdminPendingTeamsPage.jsx";
import AdminTeamDetailPage from "./pages/AdminTeamDetailPage.jsx";
import TeamJoinRequestsPage from "./pages/TeamJoinRequestsPage.jsx";
import TeamJoinRequestDetailsPage from "./pages/TeamJoinRequestDetailsPage.jsx";
import TeamChatPage from "./pages/TeamChatPage.jsx";
import TeamCollaborationsPage from "./pages/TeamCollaborationsPage.jsx";
import TeamActivityPage from "./pages/TeamActivityPage.jsx";
import TeamAchievementsPage from "./pages/TeamAchievementsPage.jsx";
import TeamGalleryPostsPage from "./pages/TeamGalleryPostsPage.jsx";
import AdminPlatformSettingsPage from "./pages/AdminPlatformSettingsPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import AdminTeamRegistrationRequestsPage from "./pages/AdminTeamRegistrationRequestsPage.jsx";
import AdminTeamRegistrationRequestDetailsPage from "./pages/AdminTeamRegistrationRequestDetailsPage.jsx";
import { TOURNAMENTS_ENABLED } from "./config/features.js";
import TournamentComingSoonPage from "./pages/TournamentComingSoonPage.jsx";

const PublicLivePage = lazy(() => import("./pages/PublicLivePage.jsx"));
const PublicMatchPage = lazy(() => import("./pages/PublicMatchPage.jsx"));
const TeamDirectoryPage = lazy(() => import("./pages/TeamDirectoryPage.jsx"));
const PublicTeamProfilePage = lazy(
  () => import("./pages/PublicTeamProfilePage.jsx"),
);
const PublicTeamAchievementPage = lazy(
  () => import("./pages/PublicTeamAchievementPage.jsx"),
);
const PublicTeamCollectionPage = lazy(
  () => import("./pages/PublicTeamCollectionPage.jsx"),
);
const PublicPlayerProfilePage = lazy(
  () => import("./pages/PublicPlayerProfilePage.jsx"),
);
const PublicSearchPage = lazy(() => import("./pages/PublicSearchPage.jsx"));
const PublicJoinTeamPage = lazy(() => import("./pages/PublicJoinTeamPage.jsx"));
const PublicJoinRequestStatusPage = lazy(
  () => import("./pages/PublicJoinRequestStatusPage.jsx"),
);
const PublicTeamRegistrationPage = lazy(() => import("./pages/PublicTeamRegistrationPage.jsx"));
const PublicTeamRegistrationStatusPage = lazy(() => import("./pages/PublicTeamRegistrationStatusPage.jsx"));
const PublicTournamentsPage = lazy(() => import("./pages/PublicTournamentsPage.jsx"));
const PublicTournamentDetailPage = lazy(() => import("./pages/PublicTournamentDetailPage.jsx"));
const TeamTournamentsPage = lazy(() => import("./pages/TeamTournamentsPage.jsx"));
const TournamentEditorPage = lazy(() => import("./pages/TournamentEditorPage.jsx"));
const TeamTournamentDetailsPage = lazy(() => import("./pages/TeamTournamentDetailsPage.jsx"));
const TournamentHistoryPage = lazy(() => import("./pages/TournamentHistoryPage.jsx"));
const AdminTournamentsPage = lazy(() => import("./pages/AdminTournamentsPage.jsx"));
const AdminTournamentReviewPage = lazy(() => import("./pages/AdminTournamentReviewPage.jsx"));
const TeamTournamentSquadPage = lazy(() => import("./pages/TeamTournamentSquadPage.jsx"));
const AdminTournamentSquadPage = lazy(() => import("./pages/AdminTournamentSquadPage.jsx"));
const PublicTournamentSquadPage = lazy(() => import("./pages/PublicTournamentSquadPage.jsx"));
const TeamTournamentLineupsPage = lazy(() => import("./pages/TeamTournamentLineupsPage.jsx"));
const TeamTournamentLineupEditorPage = lazy(() => import("./pages/TeamTournamentLineupEditorPage.jsx"));
const AdminTournamentLineupPage = lazy(() => import("./pages/AdminTournamentLineupPage.jsx"));

const LazyPublic = ({ children }) => (
  <Suspense
    fallback={
      <div
        className="grid min-h-80 place-items-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="loading-bar h-full rounded-full bg-lime-300" />
          </div>
          <span className="sr-only">Loading public page</span>
        </div>
      </div>
    }
  >
    {children}
  </Suspense>
);

const LazyDashboard = ({ children }) => (
  <Suspense
    fallback={
      <div
        className="grid min-h-80 place-items-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto h-1 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="loading-bar h-full rounded-full bg-lime-300" />
          </div>
          <span className="sr-only">Loading dashboard page</span>
        </div>
      </div>
    }
  >
    {children}
  </Suspense>
);

function DashboardRedirect() {
  const { user } = useAuth();
  return (
    <Navigate to={user.role === "superAdmin" ? "/admin" : "/team"} replace />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/live" element={<PublicDirectoryPage kind="live" />} />
        <Route
          path="/fixtures"
          element={<PublicDirectoryPage kind="fixtures" />}
        />
        <Route
          path="/results"
          element={<PublicDirectoryPage kind="results" />}
        />
        <Route
          path="/search"
          element={
            <LazyPublic>
              <PublicSearchPage />
            </LazyPublic>
          }
        />
        <Route
          path="/teams"
          element={
            <LazyPublic>
              <TeamDirectoryPage />
            </LazyPublic>
          }
        />
        <Route
          path="/tournaments-coming-soon"
          element={<TournamentComingSoonPage />}
        />
        {TOURNAMENTS_ENABLED ? (
          <>
            <Route
              path="/tournaments"
              element={
                <LazyPublic>
                  <PublicTournamentsPage />
                </LazyPublic>
              }
            />
            <Route
              path="/tournaments/:slug"
              element={
                <LazyPublic>
                  <PublicTournamentDetailPage />
                </LazyPublic>
              }
            />
            <Route
              path="/tournaments/:slug/participants/:participantSlug/squad"
              element={
                <LazyPublic>
                  <PublicTournamentSquadPage />
                </LazyPublic>
              }
            />
          </>
        ) : (
          <Route
            path="/tournaments/*"
            element={<Navigate to="/tournaments-coming-soon" replace />}
          />
        )}
        <Route
          path="/register-team"
          element={
            <LazyPublic>
              <PublicTeamRegistrationPage />
            </LazyPublic>
          }
        />
        <Route
          path="/team-registration-status/:requestCode?"
          element={
            <LazyPublic>
              <PublicTeamRegistrationStatusPage />
            </LazyPublic>
          }
        />
        <Route
          path="/teams/:teamSlug/achievements/:achievementId"
          element={
            <LazyPublic>
              <PublicTeamAchievementPage />
            </LazyPublic>
          }
        />
        <Route
          path="/teams/:teamSlug"
          element={
            <LazyPublic>
              <PublicTeamProfilePage />
            </LazyPublic>
          }
        />
        <Route
          path="/teams/:teamSlug/join"
          element={
            <LazyPublic>
              <PublicJoinTeamPage />
            </LazyPublic>
          }
        />
        <Route
          path="/join-requests/:requestCode/status"
          element={
            <LazyPublic>
              <PublicJoinRequestStatusPage />
            </LazyPublic>
          }
        />
        <Route
          path="/join-requests/status"
          element={
            <LazyPublic>
              <PublicJoinRequestStatusPage />
            </LazyPublic>
          }
        />
        <Route
          path="/teams/:teamSlug/squad"
          element={
            <LazyPublic>
              <PublicTeamCollectionPage kind="squad" />
            </LazyPublic>
          }
        />
        <Route
          path="/teams/:teamSlug/fixtures"
          element={
            <LazyPublic>
              <PublicTeamCollectionPage kind="fixtures" />
            </LazyPublic>
          }
        />
        <Route
          path="/teams/:teamSlug/results"
          element={
            <LazyPublic>
              <PublicTeamCollectionPage kind="results" />
            </LazyPublic>
          }
        />
        <Route
          path="/teams/:teamSlug/gallery"
          element={
            <LazyPublic>
              <PublicTeamCollectionPage kind="gallery" />
            </LazyPublic>
          }
        />
        <Route
          path="/players/:playerId"
          element={
            <LazyPublic>
              <PublicPlayerProfilePage />
            </LazyPublic>
          }
        />
        <Route
          path="/matches/:matchId"
          element={
            <LazyPublic>
              <PublicMatchPage />
            </LazyPublic>
          }
        />
        <Route
          path="/matches/:matchId/live"
          element={
            <LazyPublic>
              <PublicLivePage />
            </LazyPublic>
          }
        />
        <Route
          path="/live/:matchId"
          element={
            <LazyPublic>
              <PublicLivePage />
            </LazyPublic>
          }
        />
        <Route
          path="/matches/:matchId/result"
          element={<MatchResultPage audience="public" />}
        />
        <Route
          path="/teams/:teamId/stats"
          element={<StatisticsPage audience="public" />}
        />
        <Route
          path="/teams/:teamId/history"
          element={<HistoryPage audience="public" />}
        />
        <Route
          path="/players/:playerId/stats"
          element={<PlayerStatisticsPage audience="public" />}
        />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route element={<RoleRoute roles={["superAdmin"]} />}>
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route
              path="/admin/teams"
              element={<AdminTeamsPage />}
            />
            <Route path="/admin/teams/pending" element={<AdminPendingTeamsPage />} />
            <Route path="/admin/teams/:teamId" element={<AdminTeamDetailPage />} />
            <Route
              path="/admin/team-admins"
              element={<SuperAdminDashboard section="team-admins" />}
            />
            <Route path="/admin/platform-settings" element={<AdminPlatformSettingsPage />} />
            <Route path="/admin/team-requests" element={<AdminTeamRegistrationRequestsPage />} />
            <Route path="/admin/team-requests/:requestId" element={<AdminTeamRegistrationRequestDetailsPage />} />
            {TOURNAMENTS_ENABLED ? (
              <>
                <Route path="/admin/tournaments" element={<LazyDashboard><AdminTournamentsPage /></LazyDashboard>} />
                <Route path="/admin/tournaments/:tournamentId" element={<LazyDashboard><AdminTournamentReviewPage /></LazyDashboard>} />
                <Route path="/admin/tournaments/:tournamentId/history" element={<LazyDashboard><TournamentHistoryPage admin /></LazyDashboard>} />
                <Route path="/admin/tournaments/:tournamentId/lineups/:lineupId" element={<LazyDashboard><AdminTournamentLineupPage /></LazyDashboard>} />
                <Route path="/admin/tournaments/:tournamentId/participants/:participantId/squad" element={<LazyDashboard><AdminTournamentSquadPage /></LazyDashboard>} />
              </>
            ) : (
              <Route path="/admin/tournaments/*" element={<Navigate to="/tournaments-coming-soon" replace />} />
            )}
            <Route
              path="/admin/teams/:teamId/squad"
              element={<AdminSquadViewPage />}
            />
            <Route
              path="/admin/teams/:teamId/profile"
              element={<AdminTeamProfileEditorPage />}
            />
            <Route path="/admin/matches" element={<AdminMatchesPage />} />
            <Route
              path="/admin/matches/:matchId"
              element={<AdminMatchDetailsPage />}
            />
            <Route
              path="/admin/matches/:matchId/live"
              element={<AdminLiveOversightPage />}
            />
            <Route
              path="/admin/matches/:matchId/result"
              element={<MatchResultPage audience="admin" />}
            />
            <Route
              path="/admin/matches/:matchId/direct-result"
              element={<DirectResultPage audience="admin" />}
            />
            <Route
              path="/admin/teams/:teamId/statistics"
              element={<StatisticsPage audience="admin" />}
            />
            <Route
              path="/admin/teams/:teamId/history"
              element={<HistoryPage audience="admin" />}
            />
            <Route
              path="/admin/players/:playerId/statistics"
              element={<PlayerStatisticsPage audience="admin" />}
            />
          </Route>
          <Route element={<RoleRoute roles={["teamAdmin"]} />}>
            <Route path="/team" element={<TeamAdminDashboard />} />
            <Route path="/team/current" element={<TeamAdminDashboard />} />
            <Route path="/team/squad" element={<SquadManagementPage />} />
            <Route path="/team/squad/tactical-board" element={<TacticalBoardPage />} />
            <Route path="/team/join-requests" element={<TeamJoinRequestsPage />} />
            <Route path="/team/join-requests/:requestId" element={<TeamJoinRequestDetailsPage />} />
            <Route path="/team/chat" element={<TeamChatPage />} />
            <Route path="/team/collaborations" element={<TeamCollaborationsPage />} />
            <Route path="/team/collaborations/:collaborationId" element={<TeamCollaborationsPage />} />
            <Route path="/team/activity" element={<TeamActivityPage />} />
            <Route path="/team/gallery-posts" element={<TeamGalleryPostsPage />} />
            <Route path="/team/achievements" element={<TeamAchievementsPage />} />
            {TOURNAMENTS_ENABLED ? (
              <>
                <Route path="/team/tournaments" element={<LazyDashboard><TeamTournamentsPage /></LazyDashboard>} />
                <Route path="/team/tournaments/filter/:filter" element={<LazyDashboard><TeamTournamentsPage /></LazyDashboard>} />
                <Route path="/team/tournaments/new" element={<LazyDashboard><TournamentEditorPage /></LazyDashboard>} />
                <Route path="/team/tournaments/:tournamentId" element={<LazyDashboard><TeamTournamentDetailsPage /></LazyDashboard>} />
                <Route path="/team/tournaments/:tournamentId/edit" element={<LazyDashboard><TournamentEditorPage /></LazyDashboard>} />
                <Route path="/team/tournaments/:tournamentId/history" element={<LazyDashboard><TournamentHistoryPage /></LazyDashboard>} />
                <Route path="/team/tournaments/:tournamentId/lineups" element={<LazyDashboard><TeamTournamentLineupsPage /></LazyDashboard>} />
                <Route path="/team/tournaments/:tournamentId/lineups/new" element={<LazyDashboard><TeamTournamentLineupsPage /></LazyDashboard>} />
                <Route path="/team/tournaments/:tournamentId/lineups/:lineupId" element={<LazyDashboard><TeamTournamentLineupEditorPage /></LazyDashboard>} />
                <Route path="/team/tournaments/:tournamentId/participants/:participantId/squad" element={<LazyDashboard><TeamTournamentSquadPage /></LazyDashboard>} />
              </>
            ) : (
              <Route path="/team/tournaments/*" element={<Navigate to="/tournaments-coming-soon" replace />} />
            )}
            <Route path="/team/matches" element={<TeamMatchesPage />} />
            <Route path="/team/matches/new" element={<MatchEditorPage />} />
            <Route
              path="/team/matches/:matchId"
              element={<TeamMatchDetailsPage />}
            />
            <Route
              path="/team/matches/:matchId/edit"
              element={<MatchEditorPage />}
            />
            <Route
              path="/team/matches/:matchId/live"
              element={<TeamLiveControlPage />}
            />
            <Route
              path="/team/matches/:matchId/result"
              element={<MatchResultPage audience="team" />}
            />
            <Route
              path="/team/matches/:matchId/direct-result"
              element={<DirectResultPage audience="team" />}
            />
            <Route
              path="/team/statistics"
              element={<StatisticsPage audience="team" />}
            />
            <Route
              path="/team/history"
              element={<HistoryPage audience="team" />}
            />
            <Route
              path="/team/players/:playerId/statistics"
              element={<PlayerStatisticsPage audience="team" />}
            />
          </Route>
        </Route>
      </Route>
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
