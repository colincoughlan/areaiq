import type { ComponentScores } from "@/lib/types";

export function ScoreTiles({
  scores,
  className = "",
}: {
  scores: ComponentScores;
  className?: string;
}) {
  const tiles: [string, number][] = [
    ["Daily Life", scores.dailyLife],
    ["Housing", scores.housing],
    ["FutureScore", scores.futureScore],
  ];
  return (
    <div className={`grid grid-cols-3 gap-2.5 ${className}`}>
      {tiles.map(([label, n]) => (
        <div
          key={label}
          className="rounded-lg border border-line bg-canvas px-2 py-3 text-center"
        >
          <div className="text-2xl font-extrabold text-brand">{n}</div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-3">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
