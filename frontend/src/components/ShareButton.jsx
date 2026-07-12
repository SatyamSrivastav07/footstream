import { Share2 } from "lucide-react";
import { useState } from "react";
import { sharePublicResource } from "../utils/share.js";

export default function ShareButton({
  title,
  text,
  path,
  className = "secondary-button",
}) {
  const [feedback, setFeedback] = useState("");
  const share = async () => {
    const result = await sharePublicResource({ title, text, path });
    setFeedback(
      result === "copied"
        ? "Link copied"
        : result === "manual"
          ? "Copy link manually"
          : result === "shared"
            ? "Shared"
            : "",
    );
    if (result !== "cancelled") window.setTimeout(() => setFeedback(""), 2500);
  };
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        className={className}
        onClick={share}
        aria-label={`Share ${title}`}
      >
        <Share2 size={16} /> Share
      </button>
      <span className="text-xs text-lime-200" aria-live="polite">
        {feedback}
      </span>
    </div>
  );
}
