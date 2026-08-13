"use client";

import { useState } from "react";
import { AREA_ORDER, searchAreas } from "@/lib/areas";
import { searchRegions } from "@/lib/regions";
import { CATEGORY_LABELS, SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/community";

const inputCls =
  "w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand";

function AreaPicker({ areaId, areaName, onChange }: { areaId: string; areaName: string; onChange: (id: string, name: string) => void }) {
  const [query, setQuery] = useState(areaName);
  const [open, setOpen] = useState(false);

  const pilotIds = new Set<string>(AREA_ORDER);
  const hits = query.trim().length >= 2
    ? [
        ...searchAreas(query).map((a) => ({ id: a.id, name: a.name })),
        ...searchRegions(query, 8)
          .filter((r) => !pilotIds.has(r.id))
          .map((r) => ({ id: r.id, name: r.name })),
      ].slice(0, 8)
    : [];

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search a SoCal city or community…"
      />
      <input type="hidden" value={areaId} readOnly />
      {open && hits.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-white text-sm shadow-lg">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(h.id, h.name);
                  setQuery(h.name);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-brand-light"
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProviderListingForm() {
  const [form, setForm] = useState({
    displayName: "",
    contactEmail: "",
    categories: [] as ServiceCategory[],
    bio: "",
    experienceNote: "",
    rateNote: "",
    areaId: "",
    areaName: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "done" | "beta">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  function toggleCategory(c: ServiceCategory) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
    }));
  }

  async function submit() {
    setErrors([]);
    setState("sending");
    const res = await fetch("/api/community", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        contactEmail: form.contactEmail,
        categories: form.categories,
        bio: form.bio,
        experienceNote: form.experienceNote || undefined,
        rateNote: form.rateNote || undefined,
        areaId: form.areaId,
      }),
    }).catch(() => null);

    if (!res) {
      setErrors(["Network error — try again."]);
      setState("idle");
      return;
    }
    const data = await res.json();
    if (res.status === 400) {
      setErrors(data.errors ?? [data.error ?? "Check your entries."]);
      setState("idle");
    } else if (res.status === 503 && data.beta) {
      setMessage(data.message);
      setState("beta");
    } else if (res.ok && data.accepted) {
      setMessage(data.message);
      setState("done");
    } else {
      setErrors([data.error ?? "Something went wrong."]);
      setState("idle");
    }
  }

  if (state === "done" || state === "beta") {
    return (
      <div className={`mt-4 rounded-lg p-4 text-sm ${state === "done" ? "bg-brand-light text-brand" : "bg-gold-light text-gold"}`}>
        {message}
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className="text-xs font-semibold">Your name (shown publicly)</label>
        <input
          className={inputCls}
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          placeholder="First name + last initial is plenty"
          maxLength={40}
        />
      </div>
      <div>
        <label className="text-xs font-semibold">Contact email (kept private)</label>
        <input
          className={inputCls}
          type="email"
          value={form.contactEmail}
          onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
          placeholder="you@example.com"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold">Services offered</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {SERVICE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                form.categories.includes(c)
                  ? "border-brand bg-brand-light text-brand"
                  : "border-line text-ink-2 hover:border-brand"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold">Bio</label>
        <textarea
          className={inputCls}
          rows={3}
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          maxLength={400}
          placeholder="Availability, what you offer, anything a neighbor would want to know."
        />
      </div>
      <div>
        <label className="text-xs font-semibold">Experience (optional, self-reported)</label>
        <input
          className={inputCls}
          value={form.experienceNote}
          onChange={(e) => setForm((f) => ({ ...f, experienceNote: e.target.value }))}
          maxLength={200}
          placeholder="e.g. 3 years, CPR certified"
        />
      </div>
      <div>
        <label className="text-xs font-semibold">Rate (optional)</label>
        <input
          className={inputCls}
          value={form.rateNote}
          onChange={(e) => setForm((f) => ({ ...f, rateNote: e.target.value }))}
          maxLength={60}
          placeholder="e.g. $20/hr"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold">Service area</label>
        <AreaPicker
          areaId={form.areaId}
          areaName={form.areaName}
          onChange={(id, name) => setForm((f) => ({ ...f, areaId: id, areaName: name }))}
        />
      </div>

      {errors.length > 0 && (
        <ul className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-xs text-risk">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      <button
        onClick={submit}
        disabled={state === "sending"}
        className="sm:col-span-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {state === "sending" ? "Submitting…" : "Submit for review"}
      </button>
    </div>
  );
}
