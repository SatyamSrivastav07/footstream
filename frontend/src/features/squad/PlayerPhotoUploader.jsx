import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client.js";

const maxBytes = 3 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const formatBytes = (bytes = 0) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export const validatePlayerPhotoFile = (file) => {
  if (!file) return "";
  if (!acceptedTypes.includes(file.type)) return "Use a JPEG, PNG, or WebP image.";
  if (file.size > maxBytes) return `Player photo must be ${formatBytes(maxBytes)} or smaller.`;
  return "";
};

export default function PlayerPhotoUploader({ player, onChanged }) {
  const inputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const displayed = preview || player.photoUrl || "";
  const fileInfo = useMemo(() => pendingFile ? `${pendingFile.name} - ${formatBytes(pendingFile.size)}` : "", [pendingFile]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    setError("");
    setPendingFile(null);
    setProgress(0);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    if (!file) return;
    const validationError = validatePlayerPhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const upload = async () => {
    if (!pendingFile) return;
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const data = new FormData();
      data.append("image", pendingFile);
      await api.put(`/team/players/${player._id}/photo`, data, {
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
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
    if (!player.photoUrl || !window.confirm(`Remove ${player.name}'s photo?`)) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`/team/players/${player._id}/photo`);
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
    <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-100/40">Player photo</p>
          <p className="mt-1 text-xs text-white/35">JPEG, PNG, or WebP up to {formatBytes(maxBytes)}.</p>
        </div>
        <ImagePlus size={17} className="text-lime-200" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035]">
          {displayed ? <img src={displayed} alt={`${player.name} preview`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-[10px] text-white/35">Avatar</div>}
        </div>
        <div className="min-w-0 flex-1">
          {fileInfo && <p className="truncate text-xs text-emerald-100/50">{fileInfo}</p>}
          {progress > 0 && <p className="mt-1 text-xs text-lime-200">{progress}% uploaded</p>}
          {error && <p className="mt-1 text-xs text-red-200" role="alert">{error}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept={acceptedTypes.join(",")} className="sr-only" onChange={chooseFile} />
        <button type="button" className="secondary-button px-3 py-2 text-xs" onClick={() => inputRef.current?.click()} disabled={busy}>Choose image</button>
        <button type="button" className="primary-button px-3 py-2 text-xs" onClick={upload} disabled={busy || !pendingFile}><Upload size={14} /> {player.photoUrl ? "Replace" : "Upload"}</button>
        {player.photoUrl && <button type="button" className="secondary-button px-3 py-2 text-xs" onClick={remove} disabled={busy}><Trash2 size={14} /> Remove</button>}
      </div>
    </div>
  );
}
