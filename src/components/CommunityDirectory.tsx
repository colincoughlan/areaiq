"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORY_LABELS, providersByCategory, type ProviderListing } from "@/lib/community";

function ContactRequestForm({ providerId, onDone }: { providerId: string; onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ requesterName: "", requesterContact: "", message: "" });
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [errors, setErrors] = useState<string[]>([]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
      >
        Request intro
      </button>
    );
  }

  async function submit() {
    setErrors([]);
    setState("sending");
    const res = await fetch("/api/community/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerId, ...form }),
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
    } else if (data.message) {
      onDone(data.message);
    } else {
      setErrors([data.error ?? "Something went wrong."]);
      setState("idle");
    }
  }

  return (
    <div className="mt-2 space-y-1.5 rounded-lg bg-canvas p-3">
      <input
        placeholder="Your name"
        value={form.requesterName}
        onChange={(e) => setForm((f) => ({ ...f, requesterName: e.target.value }))}
        className="w-full rounded-md border border-line px-2 py-1.5 text-xs outline-none focus:border-brand"
      />
      <input
        placeholder="Your email or phone"
        value={form.requesterContact}
        onChange={(e) => setForm((f) => ({ ...f, requesterContact: e.target.value }))}
        className="w-full rounded-md border border-line px-2 py-1.5 text-xs outline-none focus:border-brand"
      />
      <textarea
        placeholder="Say what you need and when"
        rows={2}
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        className="w-full rounded-md border border-line px-2 py-1.5 text-xs outline-none focus:border-brand"
      />
      {errors.length > 0 && (
        <ul className="text-[11px] text-risk">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      <button
        onClick={submit}
        disabled={state === "sending"}
        className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Send"}
      </button>
    </div>
  );
}

function ProviderCard({ p }: { p: ProviderListing }) {
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-ink">{p.displayName}</span>
        {p.rateNote && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-ink-2">{p.rateNote}</span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-ink-2">{p.bio}</p>
      {p.experienceNote && <p className="mt-1 text-xs text-ink-3">{p.experienceNote}</p>}
      <p className="mt-1.5 text-[11px] text-ink-3">
        Self-reported — not independently verified by AreaIQ. AreaIQ does not run background checks.
      </p>
      {doneMsg ? (
        <p className="mt-2 rounded-lg bg-brand-light p-2 text-xs text-brand">{doneMsg}</p>
      ) : (
        <ContactRequestForm providerId={p.id} onDone={setDoneMsg} />
      )}
    </div>
  );
}

export function CommunityDirectory({ areaId }: { areaId: string }) {
  const [providers, setProviders] = useState<ProviderListing[] | null>(null);
  const [mode, setMode] = useState<"live" | "demo" | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/community?areaId=${encodeURIComponent(areaId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setProviders(d.providers ?? []);
        setMode(d.mode ?? null);
      })
      .catch(() => !cancelled && setProviders([]));
    return () => {
      cancelled = true;
    };
  }, [areaId]);

  if (providers === null || providers.length === 0) return null;
  const byCategory = providersByCategory(providers);

  return (
    <section className="mt-4 rounded-xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">Community services nearby</h2>
        {mode === "demo" && (
          <span className="rounded-md bg-gold-light px-2 py-0.5 text-[11px] font-bold text-gold">
            Demo — fictional listings illustrating the feature
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-3">
        Posted directly by individuals in this area. AreaIQ does not verify identity, run
        background checks, or vet these listings beyond a content review — treat this like any
        other classified listing and use your own judgment.
      </p>

      <div className="mt-3 space-y-4">
        {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[])
          .filter((cat) => byCategory[cat]?.length)
          .map((cat) => (
            <div key={cat}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-2">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="mt-2 space-y-2">
                {byCategory[cat]!.map((p) => (
                  <ProviderCard key={`${cat}-${p.id}`} p={p} />
                ))}
              </div>
            </div>
          ))}
      </div>

      <p className="mt-4 text-xs text-ink-3">
        Offer babysitting, pet care, or handyman services here?{" "}
        <Link href="/community" className="font-semibold text-brand underline">
          List your service
        </Link>
      </p>
    </section>
  );
}
