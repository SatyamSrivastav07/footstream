import { ExternalLink, Instagram } from "lucide-react";

export const instagramFollowAction = (team = {}) => {
  const href = team.socialLinks?.instagram || "";
  if (!href) return null;
  try {
    const url = new URL(href);
    const hostname = url.hostname.toLowerCase();
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !["instagram.com", "www.instagram.com"].includes(hostname)
    )
      return null;
    const teamName = String(team.name || "").trim();
    const label = teamName
      ? `Follow ${teamName} on Instagram`
      : "Follow on Instagram";
    return { href: url.href, label };
  } catch {
    return null;
  }
};

export default function InstagramFollowButton({ team }) {
  const action = instagramFollowAction(team);
  if (!action) return null;
  return (
    <a
      className="primary-button w-full justify-center sm:w-auto"
      href={action.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${action.label} in a new tab`}
    >
      <Instagram size={17} aria-hidden="true" />
      <span>{action.label}</span>
      <ExternalLink size={15} aria-hidden="true" />
    </a>
  );
}
