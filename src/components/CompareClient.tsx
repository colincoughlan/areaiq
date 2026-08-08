"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AREA_ORDER, DIRECTION_LABEL, getArea, listAreas } from "@/lib/areas";
import type { Area } from "@/lib/types";

function rows(a: Area): [string, string][] {
  return [
    ["Median price (sample)", a.housing.medianPrice.value],
    ["Owner occupancy", a.housing.ownerOccupied.value],
    ["Residential permits (24 mo)", a.housing.permits24mo.value],
    ["Schools", a.schools.map((s) => s.district).filter((v, i, arr) => arr.indexOf(v) === i).join(", ")],
    ["Commute", a.mobility.split("·").slice(-1)[0].trim()],
    ["Development activity", `${a.projects.length} tracked projects`],
    ["Direction", DIRECTION_LABEL[a.direction]],
    ["Environment & risk", a.riskHeadline],
    ["FutureScore", String(a.scores.futureScore)],
    ["Data confidence", a.scores.confidence],
  ];
}

export function CompareClient() {
  const params = useSearchParams();
  const initialA = params.get("a") && getArea(params.get("a")!) ? params.get("a")! : AREA_ORDER[0];
  const [idA, setIdA] = useState<string>(initialA);
  const [idB, setIdB] = useState<string>(
    AREA_ORDER.find((id) => id !== initialA) ?? AREA_ORDER[1]
  );

  const a = getArea(idA)!;
  const b = getArea(idB)!;
  const rowsA = rows(a);
  const rowsB = rows(b);

  const selectCls =
    "rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand";

  return (
    <div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <select aria-label="First area" value={idA} onChange={(e) => setIdA(e.target.value)} className={selectCls}>
          {listAreas().map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <span className="text-sm font-bold text-ink-3">vs</span>
        <select aria-label="Second area" value={idB} onChange={(e) => setIdB(e.target.value)} className={selectCls}>
          {listAreas().map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-canvas text-xs uppercase tracking-wide text-ink-3">
              <th className="px-4 py-3 font-semibold">Dimension</th>
              <th className="px-4 py-3 font-semibold">{a.name}</th>
              <th className="px-4 py-3 font-semibold">{b.name}</th>
            </tr>
          </thead>
          <tbody>
            {rowsA.map(([label, va], i) => {
              const vb = rowsB[i][1];
              const isFuture = label === "FutureScore";
              const aWins = isFuture && Number(va) > Number(vb);
              const bWins = isFuture && Number(vb) > Number(va);
              return (
                <tr key={label} className="border-t border-canvas">
                  <td className="px-4 py-2.5 text-ink-3">{label}</td>
                  <td className={`px-4 py-2.5 font-semibold ${aWins ? "text-good" : ""}`}>{va}</td>
                  <td className={`px-4 py-2.5 font-semibold ${bWins ? "text-good" : ""}`}>{vb}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
