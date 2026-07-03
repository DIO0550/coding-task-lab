import type { MatchConfig, RankingEntry } from "@/src/domains/game/index.ts";

export type RankingScreenProps = Readonly<{
  ranking: readonly RankingEntry[];
  players: MatchConfig["players"];
  onRestart?: () => void;
}>;

/** 終局時の最終順位を表示する。 */
export const RankingScreen = ({ ranking, players, onRestart }: RankingScreenProps) => {
  const sorted = [...ranking].toSorted((a, b) => a.rank - b.rank);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="text-lg font-bold">最終順位</h2>
        <ol className="flex flex-col gap-2">
          {sorted.map((entry) => (
            <li key={entry.seat} className="flex items-center justify-between rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700">
              <span className="font-bold">{entry.rank}位</span>
              <span>{players[entry.seat].name}</span>
              <span className="font-mono">{entry.score.toLocaleString()}点</span>
            </li>
          ))}
        </ol>
        {onRestart !== undefined && (
          <button
            type="button"
            className="self-end rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500"
            onClick={onRestart}
          >
            設定に戻る
          </button>
        )}
      </div>
    </div>
  );
};
