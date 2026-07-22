import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client.js";

export const brandingUrl = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.imageUrl || "";
};

const limits = {
  logo: { label: "Logo", bytes: 2 * 1024 * 1024, accept: "image/jpeg,image/png,image/webp", shape: "aspect-square" },
  cover: { label: "Cover", bytes: 5 * 1024 * 1024, accept: "image/jpeg,image/png,image/webp", shape: "aspect-[16/7]" },
};

const formatBytes = (bytes = 0) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function TeamBrandingUploader({ kind, initialImage, uploadUrl, deleteUrl, fieldName = "image", disabled = false, onChanged }) {
  const config = limits[kind];
  const inputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(brandingUrl(initialImage));
  const [pendingFile, setPendingFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const displayed = preview || imageUrl;
  const fileInfo = useMemo(() => pendingFile ? `${pendingFile.name} - ${formatBytes(pendingFile.size)}` : "", [pendingFile]);

  useEffect(() => {
    setImageUrl(brandingUrl(initialImage));
  }, [initialImage]);

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    setError("");
    setPendingFile(null);
    setPreview("");
    setProgress(0);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > config.bytes) {
      setError(`${config.label} must be ${formatBytes(config.bytes)} or smaller.`);
      return;
    }
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const upload = async () => {
    if (!pendingFile) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append(fieldName, pendingFile);
      const response = await api.put(uploadUrl, data, {
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      const nextImage = response.data.data.image || response.data.data.tournament?.[kind === "cover" ? "coverImage" : "logo"] || response.data.data.participant?.logo;
      setImageUrl(brandingUrl(nextImage));
      setPendingFile(null);
      setPreview("");
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
      await onChanged?.();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!imageUrl || !window.confirm(`Remove this ${config.label.toLowerCase()}?`)) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(deleteUrl);
      setImageUrl("");
      setPendingFile(null);
      setPreview("");
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
      await onChanged?.();
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-black/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{config.label}</p>
          <p className="mt-1 text-xs text-emerald-100/40">JPEG, PNG, or WebP up to {formatBytes(config.bytes)}.</p>
        </div>
        <ImagePlus size={18} className="text-lime-200" />
      </div>
      <div className={`mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035] ${config.shape}`}>
        {displayed ? <img src={displayed} alt={`${config.label} preview`} className="size-full object-contain" /> : <div className="grid size-full place-items-center text-xs font-semibold text-white/35">No {config.label.toLowerCase()}</div>}
      </div>
      {fileInfo && <p className="mt-3 truncate text-xs text-emerald-100/50">{fileInfo}</p>}
      {progress > 0 && <p className="mt-2 text-xs text-lime-200">{progress}% uploaded</p>}
      {error && <p className="mt-3 text-sm text-red-200" role="alert">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept={config.accept} className="sr-only" onChange={chooseFile} />
        <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={busy || disabled}>Choose</button>
        <button type="button" className="primary-button" onClick={upload} disabled={busy || disabled || !pendingFile}><Upload size={16} /> {busy ? "Saving..." : "Upload"}</button>
        {imageUrl && <button type="button" className="secondary-button" onClick={remove} disabled={busy || disabled}><Trash2 size={16} /> Remove</button>}
      </div>
      {disabled && <p className="mt-3 text-xs text-amber-100/75">Branding is locked until this tournament is back in draft or changes-requested status.</p>}
    </article>
  );
}
