import type { GameViewPlayer, PlayerConfig, SeatIndex } from "@/src/domains/game/index.ts";

import { windLabelForSeat } from "../utils/seat-labels.ts";
import { TileChip } from "./TileChip.tsx";

export type PlayerPanelProps = Readonly<{
  seat: SeatIndex;
  playerConfig: PlayerConfig;
  viewPlayer: GameViewPlayer;
  dealerSeat: SeatIndex;
  isCurrentTurn: boolean;
}>;

/** 1プレイヤー分の公開情報(風・名前・持ち点・親子・河・鳴き・リーチ)を表示する。 */
export const PlayerPanel = ({ seat, playerConfig, viewPlayer, dealerSeat, isCurrentTurn }: PlayerPanelProps) => {
  const isDealer = seat === dealerSeat;
  const windLabel = windLabelForSeat(seat, dealerSeat);

  return (
    <div
      className={[
        "flex flex-col gap-2 rounded-lg border p-3 text-sm",
        isCurrentTurn
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
          : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
      ].join(" ")}
      data-testid={`player-panel-${seat}`}
      data-current-turn={isCurrentTurn}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-semibold">
          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">{windLabel}</span>
          {playerConfig.name}
          {isDealer ? (
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">親</span>
          ) : (
            <span className="rounded bg-zinc-400 px-1.5 py-0.5 text-xs font-bold text-white">子</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {isCurrentTurn && (
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-bold text-white">現在の手番</span>
          )}
          {viewPlayer.riichi !== "none" && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
            {viewPlayer.riichi === "double" ? "ダブルリーチ" : "リーチ"}
          </span>
          )}
        </span>
      </div>

      <div className="font-mono text-base">{viewPlayer.score.toLocaleString()}点</div>

      {playerConfig.kind === "cpu" && <div className="text-xs text-zinc-500">手牌 {viewPlayer.handCount}枚</div>}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-zinc-500">鳴き面子</span>
        {viewPlayer.melds.length === 0 ? (
          <span className="text-xs text-zinc-400">なし</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {viewPlayer.melds.map((meld, meldIndex) => (
              <div key={meldIndex} className="flex gap-0.5 rounded border border-zinc-300 p-0.5 dark:border-zinc-600">
                {meld.tiles.map((tile, tileIndex) => (
                  <TileChip key={tileIndex} tile={tile} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-zinc-500">捨て牌河</span>
        <div className="flex min-h-5 flex-wrap gap-1" data-testid={`river-${seat}`}>
          {viewPlayer.river.length === 0 ? (
            <span className="text-xs text-zinc-400">なし</span>
          ) : (
            viewPlayer.river.map((riverTile, index) => (
              <TileChip key={index} tile={riverTile.tile} selected={riverTile.riichiDeclare} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
