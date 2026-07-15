import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import SuperAdminDashboard from "./pages/SuperAdminDashboard.jsx";
import TeamAdminDashboard from "./pages/TeamAdminDashboard.jsx";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
import SquadManagementPage from "./pages/SquadManagementPage.jsx";
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
import PublicLayout from "./layouts/PublicLayout.jsx";
import PublicHomePage from "./pages/PublicHomePage.jsx";
import PublicDirectoryPage from "./pages/PublicDirectoryPage.jsx";
import AdminTeamProfileEditorPage from "./pages/AdminTeamProfileEditorPage.jsx";
import TeamJoinRequestsPage from "./pages/TeamJoinRequestsPage.jsx";
import TeamJoinRequestDetailsPage from "./pages/TeamJoinRequestDetailsPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import AdminTeamRegistrationRequestsPage from "./pages/AdminTeamRegistrationRequestsPage.jsx";
import AdminTeamRegistrationRequestDetailsPage from "./pages/AdminTeamRegistrationRequestDetailsPage.jsx";

const PublicLivePage = lazy(() => import("./pages/PublicLivePage.jsx"));
const PublicMatchPage = lazy(() => import("./pages/PublicMatchPage.jsx"));
const TeamDirectoryPage = lazy(() => import("./pages/TeamDirectoryPage.jsx"));
const PublicTeamProfilePage = lazy(
  () => import("./pages/PublicTeamProfilePage.jsx"),
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
              element={<SuperAdminDashboard section="teams" />}
            />
            <Route
              path="/admin/team-admins"
              element={<SuperAdminDashboard section="team-admins" />}
            />
            <Route path="/admin/team-requests" element={<AdminTeamRegistrationRequestsPage />} />
            <Route path="/admin/team-requests/:requestId" element={<AdminTeamRegistrationRequestDetailsPage />} />
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
            <Route path="/team/join-requests" element={<TeamJoinRequestsPage />} />
            <Route path="/team/join-requests/:requestId" element={<TeamJoinRequestDetailsPage />} />
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
