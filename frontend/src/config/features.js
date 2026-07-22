export const TOURNAMENTS_ENABLED =
  String(import.meta.env.VITE_TOURNAMENTS_ENABLED ?? "true").toLowerCase() ===
  "true";

export const SUPPORT_EMAIL = String(
  import.meta.env.VITE_SUPPORT_EMAIL || import.meta.env.VITE_CONTACT_EMAIL || "",
).trim();

export const PORTFOLIO_URL = String(
  import.meta.env.VITE_PORTFOLIO_URL || "",
).trim();
