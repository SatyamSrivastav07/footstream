import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RoleRoute({ roles }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}

