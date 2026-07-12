import { Clipboard, Radio, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client.js";
import LiveMatchView from "../features/live/LiveMatchView.jsx";

export default function PublicLivePage() {
  const { matchId } = useParams();
  const [stream, setStream] = useState(undefined);
  useEffect(() => {
    api
      .get(`/public/matches/${matchId}/stream`)
      .then((response) => setStream(response.data.data.stream))
      .catch(() => setStream({ isPlayable: false }));
  }, [matchId]);
  const share = async () => {
    const url = `${window.location.origin}/matches/${matchId}/live`;
    const data = {
      title: "FootStream live match",
      text: "Follow this match live on FootStream.",
      url,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        window.alert("Live match link copied.");
      }
    } catch (error) {
      if (error.name !== "AbortError")
        window.prompt("Copy this live match link:", url);
    }
  };
  const canShare = typeof navigator !== "undefined" && Boolean(navigator.share);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Live match center</p>
          <h1 className="page-title text-3xl sm:text-4xl">Match broadcast</h1>
        </div>
        <button type="button" className="secondary-button" onClick={share}>
          {canShare ? <Share2 size={16} /> : <Clipboard size={16} />} Share
          match
        </button>
      </div>
      {stream === undefined ? (
        <div
          className="skeleton mb-6 aspect-video rounded-3xl"
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
