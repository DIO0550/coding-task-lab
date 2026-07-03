import { useState } from "react";

import { Tile } from "@/src/domains/tile/index.ts";
import type { GameAction, GameView, SeatIndex } from "@/src/domains/game/index.ts";
import type { Tile as TileType } from "@/src/domains/tile/index.ts";

import { formatTileLabel } from "../utils/tile-display.ts";
import { TileChip } from "./TileChip.tsx";

export type HandPanelProps = Readonly<{
  seat: SeatIndex;
  name: string;
  view: GameView;
  onAction: (action: GameAction) => void;
}>;

const includesTile = (tiles: readonly TileType[], tile: TileType): boolean =>
  tiles.some((t) => Tile.strictEquals(t, tile));

/** 人間の手牌表示と操作(打牌・チー・ポン・カン・リーチ・ツモ・ロン・パス)を担う。 */
export const HandPanel = ({ seat, name, view, onAction }: HandPanelProps) => {
  const [riichiArmed, setRiichiArmed] = useState(false);

  const discardAction = view.legalActions.find((a) => a.type === "discard");
  const riichiAction = view.legalActions.find((a): a is Extract<GameView["legalActions"][number], { type: "riichi" }> => a.type === "riichi");
  const tsumoAvailable = view.legalActions.some((a) => a.type === "tsumo");
  const ronAvailable = view.legalActions.some((a) => a.type === "ron");
  const ponAvailable = view.legalActions.some((a) => a.type === "pon");
  const chiAction = view.legalActions.find((a): a is Extract<GameView["legalActions"][number], { type: "chi" }> => a.type === "chi");
  const kanAction = view.legalActions.find((a): a is Extract<GameView["legalActions"][number], { type: "kan" }> => a.type === "kan");
  const passAvailable = view.legalActions.some((a) => a.type === "pass");

  // riichiAction が無くなっている(手番が過ぎた等)のに armed フラグだけが残るケースをここで無効化する。
  const effectiveArmed = riichiArmed && riichiAction !== undefined;

  const isMyTurn = view.legalActions.length > 0;

  const handleTileClick = (tile: TileType) => {
    if (effectiveArmed && riichiAction !== undefined) {
      if (includesTile(riichiAction.tiles, tile)) {
        onAction({ type: "discard", seat, tile, riichi: true });
        setRiichiArmed(false);
      }
      return;
    }
    if (discardAction !== undefined && discardAction.type === "discard" && includesTile(discardAction.tiles, tile)) {
      onAction({ type: "discard", seat, tile, riichi: false });
    }
  };

  const isTileClickable = (tile: TileType): boolean =>
    effectiveArmed && riichiAction !== undefined
      ? includesTile(riichiAction.tiles, tile)
      : discardAction !== undefined && discardAction.type === "discard" && includesTile(discardAction.tiles, tile);

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      data-testid={`hand-panel-${seat}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{name}の手牌</h3>
        {isMyTurn && (
          <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">あなたの番です</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5" data-testid={`hand-${seat}`}>
        {view.hand.map((tile, i) => (
          <TileChip
            key={i}
            tile={tile}
            onClick={isTileClickable(tile) ? () => handleTileClick(tile) : undefined}
          />
        ))}
        {view.drawnTile !== null && (
          <>
            <span className="mx-1 h-8 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden="true" />
            <TileChip
              tile={view.drawnTile}
              onClick={isTileClickable(view.drawnTile) ? () => handleTileClick(view.drawnTile as TileType) : undefined}
            />
          </>
        )}
      </div>

      {isMyTurn && (
        <div className="flex flex-wrap gap-2">
          {tsumoAvailable && (
            <button
              type="button"
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-500"
              onClick={() => onAction({ type: "tsumo", seat })}
            >
              ツモ
            </button>
          )}
          {ronAvailable && (
            <button
              type="button"
              className="rounded bg-rose-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-rose-500"
              onClick={() => onAction({ type: "ron", seat })}
            >
              ロン
            </button>
          )}
          {ponAvailable && (
            <button
              type="button"
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-indigo-500"
              onClick={() => onAction({ type: "pon", seat })}
            >
              ポン
            </button>
          )}
          {chiAction !== undefined &&
            chiAction.options.map((option, i) => (
              <button
                key={i}
                type="button"
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-indigo-500"
                onClick={() => onAction({ type: "chi", seat, tiles: option })}
              >
                チー({formatTileLabel(option[0])}{formatTileLabel(option[1])})
              </button>
            ))}
          {kanAction !== undefined &&
            kanAction.tiles.map((tile, i) => (
              <button
                key={i}
                type="button"
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-indigo-500"
                onClick={() => onAction({ type: "kan", seat, tile })}
              >
                カン({formatTileLabel(tile)})
              </button>
            ))}
          {riichiAction !== undefined && (
            <button
              type="button"
              aria-pressed={effectiveArmed}
              className={[
                "rounded px-3 py-1.5 text-sm font-bold text-white",
                effectiveArmed ? "bg-red-800" : "bg-red-600 hover:bg-red-500",
              ].join(" ")}
              onClick={() => setRiichiArmed((v) => !v)}
            >
              {effectiveArmed ? "リーチ: 捨てる牌を選択" : "リーチ"}
            </button>
          )}
          {passAvailable && (
            <button
              type="button"
              className="rounded bg-zinc-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-zinc-400"
              onClick={() => onAction({ type: "pass", seat })}
            >
              パス
            </button>
          )}
        </div>
      )}
    </div>
  );
};
