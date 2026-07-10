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

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={user.role === 'superAdmin' ? '/admin' : '/team'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardRedirect />} />
          <Route element={<RoleRoute roles={['superAdmin']} />}>
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route path="/admin/teams/:teamId/squad" element={<AdminSquadViewPage />} />
          </Route>
          <Route element={<RoleRoute roles={['teamAdmin']} />}>
            <Route path="/team" element={<TeamAdminDashboard />} />
            <Route path="/team/squad" element={<SquadManagementPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
