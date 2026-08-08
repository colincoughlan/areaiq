import { Suspense } from "react";
import { CompareClient } from "@/components/CompareClient";

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Compare areas</h1>
      <p className="mt-1 text-sm text-ink-2">
        Side-by-side view of two pilot neighborhoods. Comparison uses component indicators, never
        demographic composition. All figures are sample data.
      </p>
      <Suspense>
        <CompareClient />
      </Suspense>
    </main>
  );
}
