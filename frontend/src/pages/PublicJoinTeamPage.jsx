import { Copy, ImagePlus, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import PublicBreadcrumbs from "../components/PublicBreadcrumbs.jsx";
import { PublicError } from "../features/public/PublicStates.jsx";
import { ACADEMIC_YEARS, POSITIONS, PREFERRED_FEET } from "../features/joinRequests/joinRequestConstants.js";
import usePageMetadata from "../hooks/usePageMetadata.js";

const emptyForm = {
  applicantName: "",
  position: "",
  age: "",
  academicYear: "",
  preferredFoot: "",
  email: "",
  phone: "",
  shortBio: "",
  previousExperience: "",
  motivation: "",
  highlightsUrl: "",
};
const maxPhotoBytes = 3 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const formatBytes = (bytes = 0) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function PublicJoinTeamPage() {
  const { teamSlug } = useParams();
  const inputRef = useRef(null);
  const [team, setTeam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const fileInfo = useMemo(() => photo ? `${photo.name} - ${formatBytes(photo.size)}` : "", [photo]);
  usePageMetadata({ title: team ? `Join ${team.name} | FootStream` : "Join team | FootStream", description: "Submit a public team join request on FootStream.", path: `/teams/${teamSlug}/join`, image: team?.logo || "" });

  useEffect(() => {
    api.get(`/public/teams/${teamSlug}`).then((response) => {
      setTeam(response.data.data.team);
      setError("");
    }).catch((requestError) => setError(requestError.userMessage)).finally(() => setLoading(false));
  }, [teamSlug]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    setFieldErrors((current) => ({ ...current, image: "" }));
    if (preview) URL.revokeObjectURL(preview);
    setPreview(""); setPhoto(null);
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) { setFieldErrors((current) => ({ ...current, image: "Use a JPEG, PNG, or WebP image." })); return; }
    if (file.size > maxPhotoBytes) { setFieldErrors((current) => ({ ...current, image: `Photo must be ${formatBytes(maxPhotoBytes)} or smaller.` })); return; }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };
  const removePhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(""); setPhoto(null);
    if (inputRef.current) inputRef.current.value = "";
  };
  const validate = () => {
    const next = {};
    if (form.applicantName.trim().length < 2) next.applicantName = "Enter your full name.";
    if (!POSITIONS.includes(form.position)) next.position = "Select a position.";
    if (!form.email.includes("@")) next.email = "Enter a valid email.";
    if (!/^\+?[0-9][0-9\s().-]{6,23}$/.test(form.phone.trim())) next.phone = "Enter a valid phone number.";
    if (form.highlightsUrl && !/^https?:\/\//i.test(form.highlightsUrl)) next.highlightsUrl = "Use an HTTP or HTTPS URL.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setError(""); setFieldErrors({});
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (value !== "") data.append(key, value); });
      if (photo) data.append("image", photo);
      const response = await api.post(`/public/teams/${teamSlug}/join-requests`, data);
      setSuccess(response.data.data);
    } catch (requestError) {
      setError(requestError.userMessage);
      setFieldErrors(Object.fromEntries((requestError.fieldErrors || []).map((item) => [item.field, item.message])));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!team) return <PublicError message={error} />;
  if (!team.acceptingJoinRequests) return <PublicError message="This team is not accepting join requests right now." />;
  if (success) return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-lime-300/20 bg-lime-300/[0.07] p-8 text-center">
      <p className="eyebrow">Request submitted</p>
      <h1 className="mt-3 font-display text-4xl font-black">Thanks for applying to {success.team.name}</h1>
      <p className="mt-4 text-white/60">Save this request code to check your application status.</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-2xl text-lime-200">{success.requestCode}</div>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button className="secondary-button" type="button" onClick={() => navigator.clipboard?.writeText(success.requestCode)}><Copy size={16} /> Copy code</button>
        <Link className="primary-button" to={`/join-requests/${success.requestCode}/status`}>Check status</Link>
      </div>
    </section>
  );

  return (
    <>
      <PublicBreadcrumbs items={[{ label: "Teams", to: "/teams" }, { label: team.name, to: `/teams/${team.slug}` }, { label: "Join" }]} />
      <header>
        <p className="eyebrow">Join team</p>
        <h1 className="page-title">Join {team.name}</h1>
        <p className="page-copy">Submit your request without creating an account. Jersey number will be assigned by the team admin if your request is approved.</p>
      </header>
      {error && <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{error}</div>}
      <form className="panel mt-7 space-y-5" onSubmit={submit} noValidate>
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">Privacy: your email and phone are visible only to this team’s administrators and FootStream super admins.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" error={fieldErrors.applicantName}><input className="field-input mt-2" value={form.applicantName} onChange={(e) => update("applicantName", e.target.value)} /></Field>
          <Field label="Position" error={fieldErrors.position}><select className="field-input mt-2" value={form.position} onChange={(e) => update("position", e.target.value)}><option value="">Select position</option>{POSITIONS.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Age" error={fieldErrors.age}><input className="field-input mt-2" type="number" min="14" max="60" value={form.age} onChange={(e) => update("age", e.target.value)} /></Field>
          <Field label="Academic Year" error={fieldErrors.academicYear}><select className="field-input mt-2" value={form.academicYear} onChange={(e) => update("academicYear", e.target.value)}><option value="">Not specified</option>{ACADEMIC_YEARS.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Preferred Foot" error={fieldErrors.preferredFoot}><select className="field-input mt-2" value={form.preferredFoot} onChange={(e) => update("preferredFoot", e.target.value)}><option value="">Not specified</option>{PREFERRED_FEET.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Email" error={fieldErrors.email}><input className="field-input mt-2" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
          <Field label="Phone" error={fieldErrors.phone}><input className="field-input mt-2" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
          <Field label="Highlights/Video URL" error={fieldErrors.highlightsUrl}><input className="field-input mt-2" type="url" value={form.highlightsUrl} onChange={(e) => update("highlightsUrl", e.target.value)} /></Field>
        </div>
        <section className="rounded-2xl border border-white/[0.08] bg-black/10 p-4">
          <p className="font-semibold">Photo</p>
          <p className="mt-1 text-xs text-white/40">Optional JPEG, PNG, or WebP up to 3 MB.</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="grid size-24 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-white/35">{preview ? <img src={preview} alt="Applicant preview" className="size-full object-contain" /> : <ImagePlus />}</div>
            <div className="min-w-0">
              {fileInfo && <p className="truncate text-sm text-white/55">{fileInfo}</p>}
              {fieldErrors.image && <p className="mt-1 text-sm text-red-200">{fieldErrors.image}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <input ref={inputRef} type="file" accept={acceptedTypes.join(",")} className="sr-only" onChange={choosePhoto} />
                <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>Choose Image</button>
                {photo && <button type="button" className="secondary-button" onClick={removePhoto}><X size={16} /> Remove</button>}
              </div>
            </div>
          </div>
        </section>
        <Field label="Short Bio" error={fieldErrors.shortBio}><textarea className="field-input mt-2 min-h-24" value={form.shortBio} onChange={(e) => update("shortBio", e.target.value)} /></Field>
        <Field label="Previous Playing Experience" error={fieldErrors.previousExperience}><textarea className="field-input mt-2 min-h-28" value={form.previousExperience} onChange={(e) => update("previousExperience", e.target.value)} /></Field>
        <Field label="Why do you want to join?" error={fieldErrors.motivation}><textarea className="field-input mt-2 min-h-28" value={form.motivation} onChange={(e) => update("motivation", e.target.value)} /></Field>
        <button className="primary-button w-full sm:w-auto" disabled={submitting}><Send size={17} /> {submitting ? "Submitting..." : "Submit request"}</button>
      </form>
    </>
  );
}

function Field({ label, error, children }) {
  return <label className="field-label">{label}{children}{error && <span className="mt-1 block text-xs text-red-200">{error}</span>}</label>;
}
