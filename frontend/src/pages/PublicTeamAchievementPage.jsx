import { Award, CalendarDays, ExternalLink, Images, Trophy, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import PublicBreadcrumbs from '../components/PublicBreadcrumbs.jsx';
import TeamIdentity from '../components/TeamIdentity.jsx';
import PlayerAvatar from '../features/squad/PlayerAvatar.jsx';
import { PublicEmpty, PublicError } from '../features/public/PublicStates.jsx';
import ShareButton from '../components/ShareButton.jsx';
import usePageMetadata from '../hooks/usePageMetadata.js';

const imageFrom = (item) => item?.trophyImages?.[0]?.imageUrl || item?.trophyImage || '';

export default function PublicTeamAchievementPage() {
  const { teamSlug, achievementId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/teams/${teamSlug}/achievements/${achievementId}`)
      .then((response) => setData(response.data.data))
      .catch((requestError) => setError(requestError.userMessage || 'Unable to load achievement.'));
  }, [teamSlug, achievementId]);

  const achievement = data?.achievement;
  const team = achievement?.teamName ? { name: achievement.teamName, slug: achievement.teamSlug, logo: achievement.teamLogo } : data?.team;
  usePageMetadata({
    title: achievement ? `${achievement.tournamentName} | ${team?.name || 'Team'} | FootStream` : 'Achievement | FootStream',
    description: achievement?.description || 'Public FootStream team achievement and winning squad.',
    path: `/teams/${teamSlug}/achievements/${achievementId}`,
    image: imageFrom(achievement) || team?.logo || '',
  });

  if (!data && !error) return <LoadingScreen />;
  if (!data) return <PublicError message={error} />;

  const registeredPlayers = achievement.winningSquad?.registeredPlayers || [];
  const manualPlayers = achievement.winningSquad?.manualPlayers || [];
  const allImages = achievement.trophyImages || [];
  const celebrationPhotos = achievement.celebrationPhotos || [];

  return (
    <>
      <PublicBreadcrumbs
        items={[
          { label: 'Teams', to: '/teams' },
          { label: team?.name || 'Team', to: `/teams/${teamSlug}` },
          { label: achievement.tournamentName },
        ]}
      />
      <header className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,.14),transparent_52%),rgba(255,255,255,.025)] p-6 sm:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">{achievement.category === 'intra_college' ? 'Intra College honour' : 'Inter College honour'}</p>
            <h1 className="mt-3 font-display text-4xl font-black sm:text-6xl">{achievement.tournamentName}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-emerald-100/60">
              <TeamIdentity team={team} logoClassName="size-9 rounded-xl" />
              <span className="flex items-center gap-2"><Trophy size={16} /> {achievement.position}</span>
              <span className="flex items-center gap-2"><CalendarDays size={16} /> {achievement.year}</span>
            </div>
          </div>
          <ShareButton
            title={achievement.tournamentName}
            text={`${team?.name || 'FootStream team'} achievement: ${achievement.position}.`}
            path={`/teams/${teamSlug}/achievements/${achievement.id}`}
          />
        </div>
      </header>

      <section className="mt-7 grid gap-7 xl:grid-cols-[1fr_360px]">
        <main className="space-y-7">
          <article className="panel">
            <p className="eyebrow">Achievement story</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/60">
              {achievement.description || 'No public description has been added for this achievement yet.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {achievement.matchReportLink && <a className="secondary-button" href={achievement.matchReportLink} target="_blank" rel="noopener noreferrer">Match report <ExternalLink size={14} /></a>}
              {achievement.certificateUrl && <a className="secondary-button" href={achievement.certificateUrl} target="_blank" rel="noopener noreferrer">Certificate <ExternalLink size={14} /></a>}
              <Link className="primary-button" to={`/teams/${teamSlug}`}>View Team Achievement</Link>
            </div>
          </article>

          <Gallery title="Trophy images" icon={Trophy} images={allImages} fallback="No trophy images published yet." />
          <Gallery title="Celebration photos" icon={Images} images={celebrationPhotos} fallback="No celebration photos published yet." />
        </main>

        <aside className="panel h-fit">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-lime-300/10 text-lime-200"><UsersRound size={19} /></span>
            <div>
              <p className="eyebrow">Winning squad</p>
              <h2 className="panel-title">Players</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {registeredPlayers.map((player) => (
              <Link key={player.playerId} to={`/players/${player.playerId}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/10 p-3 hover:border-lime-300/30">
                <PlayerAvatar src={player.photoUrl} name={player.name} className="size-12 rounded-xl" />
                <span className="min-w-0">
                  <span className="block truncate font-bold text-white">{player.name}</span>
                  <span className="text-xs text-white/45">#{player.jerseyNumber || '—'} · {player.position || 'Squad player'}</span>
                </span>
              </Link>
            ))}
            {manualPlayers.map((player, index) => (
              <div key={`${player.name}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/10 p-3">
                <span className="grid size-12 place-items-center rounded-xl bg-lime-300/10 text-lime-200"><Award size={17} /></span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-white">{player.name}</span>
                  <span className="text-xs text-white/45">Historical player · {player.position || 'Position not listed'}</span>
                </span>
              </div>
            ))}
            {!registeredPlayers.length && !manualPlayers.length && (
              <PublicEmpty title="No squad listed" message="Winning squad details have not been published yet." />
            )}
          </div>
        </aside>
      </section>
    </>
  );
}

function Gallery({ title, icon: Icon, images, fallback }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-lime-300/10 text-lime-200"><Icon size={18} /></span>
          <h2 className="panel-title">{title}</h2>
        </div>
      </div>
      {images.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <figure className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20" key={`${image.imageUrl}-${index}`}>
              <img className="aspect-video w-full object-contain p-1" src={image.imageUrl} alt={image.caption || `${title} ${index + 1}`} loading="lazy" />
              {image.caption && <figcaption className="p-3 text-sm text-white/50">{image.caption}</figcaption>}
            </figure>
          ))}
        </div>
      ) : (
        <PublicEmpty title={title} message={fallback} />
      )}
    </section>
  );
}
