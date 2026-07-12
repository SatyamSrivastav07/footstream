const trimSlash = (value = "") => value.replace(/\/+$/, "");

export const publicAppOrigin = ({
  configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL,
  browserOrigin = typeof window !== "undefined" ? window.location.origin : "",
} = {}) => {
  for (const value of [configuredUrl, browserOrigin]) {
    if (!value) continue;
    try {
      const url = new URL(trimSlash(value));
      if (["http:", "https:"].includes(url.protocol))
        return url.origin + url.pathname.replace(/\/$/, "");
    } catch {
      /* try the local browser origin */
    }
  }
  return "";
};

export const buildPublicUrl = (path = "/", options) => {
  const origin = publicAppOrigin(options);
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${safePath}` : safePath;
};

export const cleanMetadataText = (value = "", maxLength = 180) =>
  String(value)
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

export const metadataValues = ({
  title,
  description,
  path = "/",
  image = "",
}) => {
  const safeTitle = cleanMetadataText(title, 90) || "FootStream";
  const safeDescription =
    cleanMetadataText(description, 180) ||
    "Football live scores, fixtures, results, teams, and players on FootStream.";
  const canonical = buildPublicUrl(path);
  let safeImage = "";
  if (image) {
    try {
      const parsed = new URL(image);
      safeImage = ["http:", "https:"].includes(parsed.protocol)
        ? parsed.href
        : "";
    } catch {
      safeImage = buildPublicUrl(image);
    }
  }
  return {
    title: safeTitle,
    description: safeDescription,
    canonical,
    image: safeImage,
  };
};

export const buildSearchParams = ({ q = "", type = "all", page = 1 } = {}) => {
  const params = new URLSearchParams();
  const query = q.trim();
  if (query) params.set("q", query);
  if (type && type !== "all") params.set("type", type);
  if (Number(page) > 1) params.set("page", String(page));
  return params;
};
