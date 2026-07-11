import { Radio } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import LiveMatchView from '../features/live/LiveMatchView.jsx';

export default function PublicLivePage() {
  const { matchId } = useParams();
  return <main className="min-h-screen bg-[#07110d] text-white"><header className="border-b border-white/[0.07] bg-[#09150f]/90 px-5 py-4 backdrop-blur"><div className="mx-auto flex max-w-[1440px] items-center justify-between"><Brand /><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-200"><Radio size={15} /> Live match center</div></div></header><div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10"><LiveMatchView matchId={matchId} mode="public" /></div></main>;
}

