import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx';
import TeamAdminDashboard from './pages/TeamAdminDashboard.jsx';
import UnauthorizedPage from './pages/UnauthorizedPage.jsx';
import SquadManagementPage from './pages/SquadManagementPage.jsx';
import AdminSquadViewPage from './pages/AdminSquadViewPage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import RoleRoute from './routes/RoleRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import TeamMatchesPage from './pages/TeamMatchesPage.jsx';
import MatchEditorPage from './pages/MatchEditorPage.jsx';
import TeamMatchDetailsPage from './pages/TeamMatchDetailsPage.jsx';
import AdminMatchesPage from './pages/AdminMatchesPage.jsx';
import AdminMatchDetailsPage from './pages/AdminMatchDetailsPage.jsx';
import TeamLiveControlPage from './pages/TeamLiveControlPage.jsx';
import AdminLiveOversightPage from './pages/AdminLiveOversightPage.jsx';
import PublicLivePage from './pages/PublicLivePage.jsx';
import StatisticsPage from './pages/StatisticsPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import PlayerStatisticsPage from './pages/PlayerStatisticsPage.jsx';
import MatchResultPage from './pages/MatchResultPage.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import PublicHomePage from './pages/PublicHomePage.jsx';
import PublicDirectoryPage from './pages/PublicDirectoryPage.jsx';
import PublicMatchPage from './pages/PublicMatchPage.jsx';
import TeamDirectoryPage from './pages/TeamDirectoryPage.jsx';
import PublicTeamProfilePage from './pages/PublicTeamProfilePage.jsx';
import PublicTeamCollectionPage from './pages/PublicTeamCollectionPage.jsx';
import PublicPlayerProfilePage from './pages/PublicPlayerProfilePage.jsx';
import AdminTeamProfileEditorPage from './pages/AdminTeamProfileEditorPage.jsx';

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={user.role === 'superAdmin' ? '/admin' : '/team'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/live" element={<PublicDirectoryPage kind="live" />} />
        <Route path="/fixtures" element={<PublicDirectoryPage kind="fixtures" />} />
        <Route path="/results" element={<PublicDirectoryPage kind="results" />} />
        <Route path="/teams" element={<TeamDirectoryPage />} />
        <Route path="/teams/:teamSlug" element={<PublicTeamProfilePage />} />
        <Route path="/teams/:teamSlug/squad" element={<PublicTeamCollectionPage kind="squad" />} />
        <Route path="/teams/:teamSlug/fixtures" element={<PublicTeamCollectionPage kind="fixtures" />} />
        <Route path="/teams/:teamSlug/results" element={<PublicTeamCollectionPage kind="results" />} />
        <Route path="/teams/:teamSlug/gallery" element={<PublicTeamCollectionPage kind="gallery" />} />
        <Route path="/players/:playerId" element={<PublicPlayerProfilePage />} />
        <Route path="/matches/:matchId" element={<PublicMatchPage />} />
        <Route path="/matches/:matchId/live" element={<PublicLivePage />} />
        <Route path="/live/:matchId" element={<PublicLivePage />} />
        <Route path="/matches/:matchId/result" element={<MatchResultPage audience="public" />} />
        <Route path="/teams/:teamId/stats" element={<StatisticsPage audience="public" />} />
        <Route path="/teams/:teamId/history" element={<HistoryPage audience="public" />} />
        <Route path="/players/:playerId/stats" element={<PlayerStatisticsPage audience="public" />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardRedirect />} />
          <Route element={<RoleRoute roles={['superAdmin']} />}>
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route path="/admin/teams/:teamId/squad" element={<AdminSquadViewPage />} />
            <Route path="/admin/teams/:teamId/profile" element={<AdminTeamProfileEditorPage />} />
            <Route path="/admin/matches" element={<AdminMatchesPage />} />
            <Route path="/admin/matches/:matchId" element={<AdminMatchDetailsPage />} />
            <Route path="/admin/matches/:matchId/live" element={<AdminLiveOversightPage />} />
            <Route path="/admin/matches/:matchId/result" element={<MatchResultPage audience="admin" />} />
            <Route path="/admin/teams/:teamId/statistics" element={<StatisticsPage audience="admin" />} />
            <Route path="/admin/teams/:teamId/history" element={<HistoryPage audience="admin" />} />
            <Route path="/admin/players/:playerId/statistics" element={<PlayerStatisticsPage audience="admin" />} />
          </Route>
          <Route element={<RoleRoute roles={['teamAdmin']} />}>
            <Route path="/team" element={<TeamAdminDashboard />} />
            <Route path="/team/squad" element={<SquadManagementPage />} />
            <Route path="/team/matches" element={<TeamMatchesPage />} />
            <Route path="/team/matches/new" element={<MatchEditorPage />} />
            <Route path="/team/matches/:matchId" element={<TeamMatchDetailsPage />} />
            <Route path="/team/matches/:matchId/edit" element={<MatchEditorPage />} />
            <Route path="/team/matches/:matchId/live" element={<TeamLiveControlPage />} />
            <Route path="/team/matches/:matchId/result" element={<MatchResultPage audience="team" />} />
            <Route path="/team/statistics" element={<StatisticsPage audience="team" />} />
            <Route path="/team/history" element={<HistoryPage audience="team" />} />
            <Route path="/team/players/:playerId/statistics" element={<PlayerStatisticsPage audience="team" />} />
          </Route>
        </Route>
      </Route>
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
