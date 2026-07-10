import { ArrowLeft, Goal } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return <main className="error-page"><div className="error-card"><Goal className="mx-auto text-lime-300" size={42} /><p className="eyebrow mt-6">Error 404</p><h1 className="font-display text-5xl font-black">Out of play</h1><p className="mx-auto mt-3 max-w-md text-emerald-100/50">The page you were looking for is beyond the touchline.</p><Link className="primary-button mx-auto mt-8 w-fit" to="/"><ArrowLeft size={17} /> Back to FootStream</Link></div></main>;
}

