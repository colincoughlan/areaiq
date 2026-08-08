"use client";

import { useMemo, useState } from "react";
import { listAreas } from "@/lib/areas";
import { OFFER_CATEGORIES } from "@/lib/offers";

const inputCls =
  "w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand";

export function BusinessOfferForm() {
  const areas = useMemo(() => listAreas(), []);
  const [form, setForm] = useState({
    businessName: "",
    contactEmail: "",
    title: "",
    details: "",
    category: "food",
    discountLabel: "",
    address: "",
    areaId: areas[0]?.id ?? "",
    radiusMiles: 2,
    hours: 24,
  });
  const [state, setState] = useState<"idle" | "sending" | "done" | "beta">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setErrors([]);
    setState("sending");
    // v1: business location approximated by its area's center; address shown to users.
    const area = areas.find((a) => a.id === form.areaId) ?? areas[0];
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessName: form.businessName,
        contactEmail: form.contactEmail,
        title: form.title,
        details: form.details || undefined,
        category: form.category,
        discountLabel: form.discountLabel,
        address: form.address,
        lat: area.lat,
        lng: area.lng,
        radiusMiles: Number(form.radiusMiles),
        expiresAt: new Date(Date.now() + Number(form.hours) * 3_600_000).toISOString(),
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
        <label className="text-xs font-semibold">Business name</label>
        <input className={inputCls} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Ave 57 Coffee Co." />
      </div>
      <div>
        <label className="text-xs font-semibold">Contact email</label>
        <input className={inputCls} type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="you@business.com" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold">Offer title</label>
        <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Quiet Tuesday: 30% off food tonight 6–9pm" maxLength={90} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold">Details (optional)</label>
        <textarea className={inputCls} rows={2} value={form.details} onChange={(e) => set("details", e.target.value)} maxLength={280} placeholder="Any conditions — dine-in only, one per customer…" />
      </div>
      <div>
        <label className="text-xs font-semibold">Category</label>
        <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
          {OFFER_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold">Discount label</label>
        <input className={inputCls} value={form.discountLabel} onChange={(e) => set("discountLabel", e.target.value)} placeholder="30% off" maxLength={40} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold">Business address (shown on the offer)</label>
        <input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="5960 Monterey Rd, Los Angeles" />
      </div>
      <div>
        <label className="text-xs font-semibold">Neighborhood</label>
        <select className={inputCls} value={form.areaId} onChange={(e) => set("areaId", e.target.value)}>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-ink-3">Pilot neighborhoods during beta; exact geocoding comes with merchant onboarding.</p>
      </div>
      <div>
        <label className="text-xs font-semibold">Reach (miles) & duration (hours)</label>
        <div className="flex gap-2">
          <input className={inputCls} type="number" min={0.5} max={5} step={0.5} value={form.radiusMiles} onChange={(e) => set("radiusMiles", Number(e.target.value))} />
          <input className={inputCls} type="number" min={1} max={168} value={form.hours} onChange={(e) => set("hours", Number(e.target.value))} />
        </div>
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
