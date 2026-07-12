import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import LoadingScreen from "../components/LoadingScreen.jsx";

const empty = {
  name: "",
  shortName: "",
  city: "",
  coach: "",
  homeGround: "",
  founded: "",
  logo: "",
  coverPhoto: "",
  description: "",
  website: "",
  instagram: "",
  facebook: "",
  x: "",
  youtube: "",
  isPublished: false,
};
const networks = ["website", "instagram", "facebook", "x", "youtube"];

export default function AdminTeamProfileEditorPage() {
  const { teamId } = useParams();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api
      .get("/admin/teams")
      .then((response) => {
        const team = response.data.data.teams.find(
          (item) => item._id === teamId,
        );
        if (!team) throw new Error("Team not found.");
        setForm({
          ...empty,
          name: team.name || "",
          shortName: team.shortName || "",
          city: team.city || team.location || "",
          coach: team.coach || "",
          homeGround: team.homeGround || "",
          founded: team.founded || "",
          logo: team.logo || "",
          coverPhoto: team.coverPhoto || "",
          description: team.description || "",
          isPublished: Boolean(team.isPublished),
          ...team.socialLinks,
        });
      })
      .catch((requestError) =>
        setError(requestError.userMessage || requestError.message),
      );
  }, [teamId]);
  if (!form && !error) return <LoadingScreen />;
  if (!form) return <div className="text-red-200">{error}</div>;
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const socialLinks = Object.fromEntries(
        networks.filter((key) => form[key]).map((key) => [key, form[key]]),
      );
      await api.patch(`/admin/teams/${teamId}`, {
        name: form.name,
        shortName: form.shortName,
        city: form.city,
        coach: form.coach,
        homeGround: form.homeGround,
        founded: form.founded ? Number(form.founded) : null,
        logo: form.logo,
        coverPhoto: form.coverPhoto,
        description: form.description,
        socialLinks,
        isPublished: form.isPublished,
      });
      setNotice("Public team profile saved.");
    } catch (requestError) {
      setError(requestError.userMessage);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <header>
        <p className="eyebrow">Public identity</p>
        <h1 className="page-title">Edit {form.name}</h1>
        <p className="page-copy">
          These fields appear on the anonymous team directory and profile pages.
        </p>
      </header>
      {(error || notice) && (
        <div
          className={`mt-6 rounded-xl border p-4 ${error ? "border-red-300/20 bg-red-300/10 text-red-100" : "border-lime-300/20 bg-lime-300/10 text-lime-100"}`}
        >
          {error || notice}
        </div>
      )}
      <form className="panel mt-7 space-y-5" onSubmit={save}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Team name"
            value={form.name}
            onChange={(value) => set("name", value)}
            required
            maxLength="100"
          />
          <Field
            label="Short name"
            value={form.shortName}
            onChange={(value) => set("shortName", value)}
            maxLength="20"
          />
          <Field
            label="City"
            value={form.city}
            onChange={(value) => set("city", value)}
            maxLength="100"
          />
          <Field
            label="Coach"
            value={form.coach}
            onChange={(value) => set("coach", value)}
            maxLength="100"
          />
          <Field
            label="Home ground"
            value={form.homeGround}
            onChange={(value) => set("homeGround", value)}
            maxLength="160"
          />
          <Field
            label="Founded"
            value={form.founded}
            onChange={(value) => set("founded", value)}
            type="number"
            min="1800"
            max={new Date().getFullYear()}
          />
          <Field
            label="Logo URL"
            value={form.logo}
            onChange={(value) => set("logo", value)}
            type="url"
          />
          <Field
            label="Cover photo URL"
            value={form.coverPhoto}
            onChange={(value) => set("coverPhoto", value)}
            type="url"
          />
        </div>
        <label className="field-label">
          Description
          <textarea
            className="field-input mt-2 min-h-32"
            value={form.description}
            maxLength="1000"
            onChange={(event) => set("description", event.target.value)}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          {networks.map((network) => (
            <Field
              key={network}
              label={network}
              value={form[network]}
              onChange={(value) => set(network, value)}
              type="url"
            />
          ))}
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] p-4">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(event) => set("isPublished", event.target.checked)}
          />
          <span>Publish this team in the public portal</span>
        </label>
        <div className="flex flex-wrap justify-end gap-3">
          <Link className="secondary-button" to="/admin">
            Cancel
          </Link>
          <button className="primary-button" type="submit" disabled={saving}>
            <Save size={16} /> {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </>
  );
}
function Field({ label, value, onChange, ...props }) {
  return (
    <label className="field-label capitalize">
      {label}
      <input
        className="field-input mt-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}
