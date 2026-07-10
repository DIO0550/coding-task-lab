import { Hand } from "../../domains/hand/index.ts";
import type { GameView } from "../../domains/game/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import type { Tile as TileType } from "../../domains/tile/index.ts";
import { computeVisibleCounts, removeOneMatching } from "./tile-helpers.ts";

const GOOD_WAIT_THRESHOLD = 2;

/**
 * 標準/上級レベルのリーチ可否と打牌牌を決める。
 * リーチ候補(テンパイを維持できる打牌)ごとに、その待ちの残り枚数合計と打点向上(ドラ保有)を評価し、
 * 待ち枚数が最大になる牌を選ぶ。その牌の待ち枚数が2枚以上、またはドラ・赤ドラを保有していればリーチ、
 * そうでなければダマ(リーチしない)とする。
 */
export const decideRiichiOrDama = (
  view: GameView,
  candidates: readonly TileType[],
): Readonly<{ tile: TileType; riichi: boolean }> => {
  const pool = view.drawnTile !== null ? [...view.hand, view.drawnTile] : view.hand;
  const melds = view.players[view.seat]?.melds ?? [];
  const visible = computeVisibleCounts(view);
  const doraKinds = view.doraIndicators.map(Tile.nextInSeries);

  const evaluated = candidates.map((tile) => {
    const afterDiscard = removeOneMatching(pool, tile);
    const waits = Hand.waitingTiles(afterDiscard, melds);
    const waitCount = waits.reduce((sum, w) => sum + Math.max(0, 4 - (visible[Tile.toIndex34(w)] ?? 0)), 0);
    const hasValue =
      afterDiscard.some((t) => t.kind === "number" && t.red) ||
      afterDiscard.some((t) => doraKinds.some((d) => Tile.equals(d, t)));
    return { tile, waitCount, hasValue };
  });

  const maxWaitCount = Math.max(...evaluated.map((e) => e.waitCount));
  const best = evaluated
    .filter((e) => e.waitCount === maxWaitCount)
    .toSorted((a, b) => Tile.compare(a.tile, b.tile));
  const chosen = best[0];
  if (chosen === undefined) {
    throw new Error("リーチ候補が空の状態でCpuAiがリーチ判断をしようとした");
  }

  const riichi = chosen.waitCount >= GOOD_WAIT_THRESHOLD || chosen.hasValue;
  return { tile: chosen.tile, riichi };
};
