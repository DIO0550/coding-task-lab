"use client";

import type { Ranking } from "../../../../domains/match/index.ts";
import type { Participant } from "../../../../domains/participant/index.ts";
import { pointsLabel, rankLabel } from "../../utils/labels/index.ts";

export type RankingPanelProps = Readonly<{
  /** 順位順に並んだ最終結果。 */
  ranking: readonly Ranking[];
  participants: readonly Participant[];
  onRestart: () => void;
}>;

const RANK_CLASS: Readonly<Record<number, string>> = {
  1: "bg-amber-400 text-stone-900",
  2: "bg-stone-300 text-stone-900",
  3: "bg-orange-300 text-stone-900",
};

const rankBadgeClass = (rank: number): string =>
  RANK_CLASS[rank] ?? "bg-stone-200 text-stone-700";

export function RankingPanel({
  ranking,
  participants,
  onRestart,
}: RankingPanelProps): React.JSX.Element {
  return (
    <section
      aria-label="最終順位"
      className="w-full max-w-md rounded-xl border border-stone-300 bg-white p-5 shadow-lg dark:border-stone-700 dark:bg-stone-900"
    >
      <h2 className="mb-3 text-xl font-bold text-stone-900 dark:text-stone-100">
        最終順位
      </h2>
      <ol role="list" aria-label="順位" className="flex flex-col">
        {ranking.map((entry) => (
          <li
            key={entry.seat}
            aria-label={`${rankLabel(entry.rank)} ${participants[entry.seat].name} ${pointsLabel(entry.points)}`}
            className="flex items-center gap-3 border-b border-stone-200 py-2 last:border-b-0 dark:border-stone-700"
          >
            <span
              className={`flex h-7 w-9 items-center justify-center rounded text-sm font-bold ${rankBadgeClass(entry.rank)}`}
            >
              {rankLabel(entry.rank)}
            </span>
            <span className="text-stone-900 dark:text-stone-100">
              {participants[entry.seat].name}
            </span>
            <span className="ml-auto font-mono font-bold text-stone-900 tabular-nums dark:text-stone-100">
              {pointsLabel(entry.points)}
            </span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onRestart}
        className="mt-4 w-full rounded-md bg-sky-600 px-4 py-2 font-bold text-white shadow transition-colors hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
      >
        もう一度対戦
      </button>
    </section>
  );
}
