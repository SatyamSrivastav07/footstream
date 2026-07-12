import { useEffect } from "react";
import { metadataValues } from "../utils/publicUrl.js";

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) =>
    element.setAttribute(key, value),
  );
};

export default function usePageMetadata(options) {
  const { title, description, path, image = "" } = options;
  useEffect(() => {
    const values = metadataValues({ title, description, path, image });
    document.title = values.title;
    upsertMeta('meta[name="description"]', {
      name: "description",
      content: values.description,
    });
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: values.title,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: values.description,
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: values.canonical,
    });
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: "website",
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: values.image ? "summary_large_image" : "summary",
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: values.title,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: values.description,
    });
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = values.canonical;
    const imageTags = [
      ['meta[property="og:image"]', { property: "og:image" }],
      ['meta[name="twitter:image"]', { name: "twitter:image" }],
    ];
    imageTags.forEach(([selector, attributes]) => {
      const current = document.head.querySelector(selector);
      if (values.image)
        upsertMeta(selector, { ...attributes, content: values.image });
      else current?.remove();
    });
  }, [description, image, path, title]);
}
