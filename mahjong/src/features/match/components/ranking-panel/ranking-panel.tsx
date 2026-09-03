import type { RankingEntry } from "@/src/domains/game-state";
import type { PlayerConfig } from "@/src/domains/player-config";

import { Labels } from "../../utils/labels";

/**
 * 終局時の最終順位。返し点・オカを反映したポイントも併せて表示する。
 */
type Props = Readonly<{
  ranking: readonly RankingEntry[];
  players: readonly PlayerConfig[];
  onNewMatch: () => void;
}>;

export function RankingPanel({ ranking, players, onNewMatch }: Props) {
  return (
    <div role="dialog" aria-label="最終順位" className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 text-zinc-900 shadow-xl">
        <h2 className="text-xl font-bold">終局 最終順位</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-600">
              <th className="py-1">順位</th>
              <th className="py-1">プレイヤー</th>
              <th className="py-1 text-right">持ち点</th>
              <th className="py-1 text-right">ポイント</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry) => (
              <tr key={entry.seat} className="border-t border-zinc-200">
                <td className="py-1 font-bold">{entry.rank}位</td>
                <td className="py-1">{players[entry.seat].name}</td>
                <td className="py-1 text-right font-mono">{Labels.score(entry.score)}</td>
                <td className="py-1 text-right font-mono">{entry.points > 0 ? `+${entry.points}` : String(entry.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={onNewMatch} className="mt-4 w-full rounded bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800">
          新しい対戦
        </button>
      </div>
    </div>
  );
}
