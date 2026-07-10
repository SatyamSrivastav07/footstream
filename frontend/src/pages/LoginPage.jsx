import { ArrowRight, Eye, EyeOff, Radio, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { isAuthenticated, loading, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to={user.role === 'superAdmin' ? '/admin' : '/team'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(form);
      const requested = location.state?.from?.pathname;
      navigate(requested || (loggedInUser.role === 'superAdmin' ? '/admin' : '/team'), { replace: true });
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07110d] text-white">
      <div className="pitch-grid absolute inset-0 opacity-35" />
      <div className="absolute -left-40 top-1/4 size-[32rem] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.08fr_.92fr]">
        <section className="hidden min-h-screen flex-col justify-between border-r border-white/[0.06] p-12 lg:flex xl:p-16">
          <Brand />
          <div className="max-w-2xl pb-12">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-lime-300/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime-200">
              <Radio size={14} /> Administration live
            </div>
            <h1 className="font-display text-6xl font-black leading-[0.94] tracking-[-0.05em] xl:text-7xl">Run your club.<br /><span className="text-lime-300">Own the moment.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-emerald-50/55">A focused command center for FootStream teams, administrators, and the matchday operations ahead.</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/25">Secure administrative access</p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-12 lg:hidden"><Brand /></div>
            <div className="mb-8">
              <div className="mb-5 grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-lime-300"><ShieldCheck size={23} /></div>
              <h2 className="font-display text-4xl font-bold tracking-tight">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-100/50">Sign in with the account issued by your FootStream super administrator.</p>
            </div>

            <form onSubmit={submit} className="space-y-5" noValidate>
              {error && <div className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100" role="alert">{error}</div>}
              <label className="field-label">Email address
                <input className="field-input mt-2" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@footstream.com" />
              </label>
              <label className="field-label">Password
                <div className="relative mt-2">
                  <input className="field-input pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-emerald-100/40 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </label>
              <button className="primary-button group mt-2 w-full" type="submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Enter command center'}
                {!submitting && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
              </button>
            </form>
            <p className="mt-8 text-center text-xs leading-5 text-emerald-100/35">Accounts are created by a super administrator.<br />Public viewers never need to sign in.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

