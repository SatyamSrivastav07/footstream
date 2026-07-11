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

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={user.role === 'superAdmin' ? '/admin' : '/team'} replace />;
}

function PublicPage({ children }) {
  return <main className="min-h-screen bg-[#07110d] px-5 py-10 text-white sm:px-8"><div className="mx-auto max-w-[1440px]">{children}</div></main>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/live/:matchId" element={<PublicLivePage />} />
      <Route path="/teams/:teamId/stats" element={<PublicPage><StatisticsPage audience="public" /></PublicPage>} />
      <Route path="/teams/:teamId/history" element={<PublicPage><HistoryPage audience="public" /></PublicPage>} />
      <Route path="/players/:playerId/stats" element={<PublicPage><PlayerStatisticsPage audience="public" /></PublicPage>} />
      <Route path="/matches/:matchId/result" element={<PublicPage><MatchResultPage audience="public" /></PublicPage>} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardRedirect />} />
          <Route element={<RoleRoute roles={['superAdmin']} />}>
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route path="/admin/teams/:teamId/squad" element={<AdminSquadViewPage />} />
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
