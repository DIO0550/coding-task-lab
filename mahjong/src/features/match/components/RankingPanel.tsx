import type { Seat } from "../../../domains/game/index.ts";
import { pointsLabel } from "../utils/labels.ts";

export type RankingEntry = Readonly<{
  seat: Seat;
  name: string;
  points: number;
  rank: number;
}>;

type RankingPanelProps = Readonly<{
  ranking: readonly RankingEntry[];
  onReset: () => void;
}>;

/** 終局時の最終順位表示 */
export const RankingPanel = ({ ranking, onReset }: RankingPanelProps) => (
  <section
    data-testid="ranking-panel"
    aria-label="最終結果"
    className="mx-auto flex w-full max-w-md flex-col gap-2 rounded-lg border-2 border-amber-400 bg-emerald-950 p-4 text-emerald-50 shadow-xl"
  >
    <h2 className="text-lg font-bold">最終結果</h2>
    <ol className="flex flex-col gap-1">
      {ranking.map((entry) => (
        <li
          key={entry.seat}
          data-testid="ranking-row"
          className="flex justify-between gap-4"
        >
          <span>
            {entry.rank}位 {entry.name}
          </span>
          <span className="font-mono">{pointsLabel(entry.points)}点</span>
        </li>
      ))}
    </ol>
    <button
      type="button"
      onClick={onReset}
      className="mt-2 rounded bg-amber-400 px-4 py-2 font-bold text-emerald-950 hover:bg-amber-300"
    >
      設定に戻る
    </button>
  </section>
);
