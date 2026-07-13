import { useEffect, useState } from "react";

export const teamLogoUrl = (team = {}) => {
  const logo = team.logo || team.logoUrl;
  if (typeof logo === "string") return logo;
  return logo?.imageUrl || "";
};

export default function TeamIdentity({
  team,
  name,
  className = "",
  logoClassName = "size-6 rounded-md",
  textClassName = "",
  align = "center",
}) {
  const [failed, setFailed] = useState(false);
  const logo = teamLogoUrl(team);
  const displayName = name || team?.name || "Team";

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  const alignClass = align === "start" ? "items-start" : align === "end" ? "items-end" : "items-center";

  return (
    <span className={`inline-flex min-w-0 ${alignClass} gap-2 ${className}`}>
      {logo && !failed && (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className={`shrink-0 object-cover ${logoClassName}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <span className={`min-w-0 truncate ${textClassName}`}>{displayName}</span>
    </span>
  );
}
