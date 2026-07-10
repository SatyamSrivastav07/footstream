import { ArrowLeft, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const home = user?.role === 'superAdmin' ? '/admin' : user ? '/team' : '/login';
  return <main className="error-page"><div className="error-card"><ShieldX className="mx-auto text-amber-300" size={40} /><p className="eyebrow mt-6">Access denied</p><h1 className="font-display text-4xl font-bold">Wrong touchline</h1><p className="mx-auto mt-3 max-w-md text-emerald-100/50">Your account does not have permission to open this area.</p><Link className="primary-button mx-auto mt-8 w-fit" to={home}><ArrowLeft size={17} /> Return to dashboard</Link></div></main>;
}

