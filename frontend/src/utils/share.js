import { buildPublicUrl } from "./publicUrl.js";

export const sharePublicResource = async ({
  title,
  text,
  path,
  navigatorObject = navigator,
  windowObject = window,
}) => {
  const url = buildPublicUrl(path, {
    browserOrigin: windowObject.location.origin,
  });
  const data = { title, text, url };
  if (navigatorObject.share) {
    try {
      await navigatorObject.share(data);
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigatorObject.clipboard.writeText(url);
    return "copied";
  } catch {
    windowObject.prompt?.("Copy this FootStream link:", url);
    return "manual";
  }
};
