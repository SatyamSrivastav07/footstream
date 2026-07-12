import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client.js";
import LiveMatchView from "../features/live/LiveMatchView.jsx";
import PublicBreadcrumbs from "../components/PublicBreadcrumbs.jsx";
import ShareButton from "../components/ShareButton.jsx";
import usePageMetadata from "../hooks/usePageMetadata.js";

export default function PublicLivePage() {
  const { matchId } = useParams();
  const [stream, setStream] = useState(undefined);
  const [match, setMatch] = useState(null);
  const matchName = match
    ? `${match.team.name} vs ${match.opponent.name}`
    : "Live match";
  usePageMetadata({
    title: `${matchName} | Live | FootStream`,
    description: match
      ? `Watch or follow ${matchName} live with the scoreboard, timer, lineups, and event timeline.`
      : "Follow a football match live on FootStream.",
    path: `/matches/${matchId}/live`,
    image: match?.team?.logo || "",
  });
  useEffect(() => {
    api
      .get(`/public/matches/${matchId}/stream`)
      .then((response) => setStream(response.data.data.stream))
      .catch(() => setStream({ isPlayable: false }));
  }, [matchId]);
  useEffect(() => {
    api
      .get(`/public/matches/${matchId}`)
      .then((response) => setMatch(response.data.data.match))
      .catch(() => setMatch(null));
  }, [matchId]);
  return (
    <>
      <PublicBreadcrumbs
        items={[{ label: "Matches", to: "/live" }, { label: matchName }]}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Live match center</p>
          <h1 className="page-title text-3xl sm:text-4xl">Match broadcast</h1>
        </div>
        <ShareButton
          title={matchName}
          text={`Follow ${matchName} live on FootStream.`}
          path={`/matches/${matchId}/live`}
        />
      </div>
      {stream === undefined ? (
        <div
          className="skeleton mb-6 aspect-video rounded-3xl"
          role="status"
          aria-live="polite"
          aria-label="Loading match stream"
        />
      ) : stream.isPlayable ? (
        <section className="mb-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-black">
          <div className="aspect-video">
            <iframe
              className="size-full"
              src={stream.embedUrl}
              title={stream.title || "FootStream YouTube live stream"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
          {stream.title && (
            <p className="border-t border-white/10 px-5 py-3 text-sm text-white/55">
              {stream.title}
            </p>
          )}
        </section>
      ) : (
        <section className="mb-6 rounded-3xl border border-dashed border-white/10 p-8 text-center">
          <Radio className="mx-auto text-white/25" size={28} />
          <h2 className="mt-3 font-display text-xl font-bold">
            Stream not available
          </h2>
          <p className="mt-2 text-sm text-white/40">
            The live scoreboard and event timeline remain available below.
          </p>
        </section>
      )}
      <LiveMatchView matchId={matchId} mode="public" />
    </>
  );
}
