import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export default function PlayerAvatar({ src, name, className = "" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center bg-[radial-gradient(circle_at_top,rgba(190,242,100,.17),rgba(16,32,25,.7))] text-lime-200 ${className}`}
        role="img"
        aria-label={`${name} has no player photo`}
      >
        <UserRound size={46} strokeWidth={1.4} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} player portrait`}
      className={`bg-black/20 object-contain ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
