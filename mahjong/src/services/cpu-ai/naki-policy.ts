import { Hand } from "../../domains/hand/index.ts";
import type { CpuLevel, GameAction, GameView } from "../../domains/game/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import type { Tile as TileType } from "../../domains/tile/index.ts";
import { distinctKinds, removeNMatching, removeOneMatching, seatWindOf } from "./tile-helpers.ts";

// GameView["legalActions"] の要素型を取り出すためのローカル型エイリアス。
type GameViewLegalAction = GameView["legalActions"][number];

const DRAGONS = new Set(["haku", "hatsu", "chun"]);

/** その牌が役牌(三元牌・自風・場風)か。 */
const isYakuhaiTile = (tile: TileType, view: GameView): boolean => {
  if (tile.kind !== "honor") {
    return false;
  }
  if (DRAGONS.has(tile.honor)) {
    return true;
  }
  const seatWind = seatWindOf(view.dealerSeat, view.seat);
  return tile.honor === seatWind || tile.honor === view.roundWind;
};

/** 鳴くことで役が確保できるか(役牌そのもの・既存の役牌副露・タンヤオ確定形のいずれか)。 */
const securesYaku = (
  view: GameView,
  callMeldTiles: readonly TileType[],
  remainingHandAfterRemoval: readonly TileType[],
): boolean => {
  if (callMeldTiles.some((t) => isYakuhaiTile(t, view))) {
    return true;
  }
  const ownMelds = view.players[view.seat]?.melds ?? [];
  const alreadyHasYakuhaiMeld = ownMelds.some(
    (m) => m.type === "pon" && m.tiles[0] !== undefined && isYakuhaiTile(m.tiles[0], view),
  );
  if (alreadyHasYakuhaiMeld) {
    return true;
  }
  const allTiles = [...remainingHandAfterRemoval, ...ownMelds.flatMap((m) => m.tiles), ...callMeldTiles];
  return view.rules.kuitan && allTiles.every((t) => !Tile.isYaochuu(t));
};

/** 鳴いてすぐ最善の打牌をした場合に、鳴かない場合よりシャンテン数が進むか。 */
const shantenAdvancesForCall = (view: GameView, usedFromHand: readonly TileType[]): boolean => {
  const meldCount = view.players[view.seat]?.melds.length ?? 0;
  const baseline = Hand.shanten(view.hand, meldCount);

  let afterCall = view.hand;
  for (const tile of usedFromHand) {
    afterCall = removeOneMatching(afterCall, tile);
  }

  let best = Infinity;
  for (const candidate of distinctKinds(afterCall)) {
    const shanten = Hand.shanten(removeOneMatching(afterCall, candidate), meldCount + 1);
    if (shanten < best) {
      best = shanten;
    }
  }
  return best < baseline;
};

/**
 * claims フェーズでの鳴き(ポン/チー)を決定する。呼べないと判断したら null(パス)。
 * - 入門: 役牌のポンのみ(シャンテン進行は問わない)。チーは行わない。
 * - 標準/上級: 役牌ポンに加え、鳴いても役が確保できる場合(タンヤオ確定形・役牌既保持など)の
 *   ポン/チーを、シャンテンが進む場合のみ行う。
 */
export const decideNaki = (view: GameView, level: CpuLevel): GameAction | null => {
  const legal = view.legalActions;
  const claimTile = view.claimTarget?.tile ?? null;

  const kanAvailable = legal.some((action) => action.type === "kan");
  if (kanAvailable && claimTile !== null) {
    if (isYakuhaiTile(claimTile, view)) {
      return { type: "kan", seat: view.seat, tile: claimTile };
    }
    if (level !== "beginner") {
      const remaining = removeNMatching(view.hand, claimTile, 3);
      if (
        remaining !== null &&
        securesYaku(view, [claimTile, claimTile, claimTile, claimTile], remaining) &&
        shantenAdvancesForCall(view, [claimTile, claimTile, claimTile])
      ) {
        return { type: "kan", seat: view.seat, tile: claimTile };
      }
    }
  }

  const ponAvailable = legal.some((a) => a.type === "pon");
  if (ponAvailable && claimTile !== null) {
    if (isYakuhaiTile(claimTile, view)) {
      return { type: "pon", seat: view.seat };
    }
    if (level !== "beginner") {
      const remaining = removeNMatching(view.hand, claimTile, 2);
      if (remaining !== null) {
        const meldTiles = [claimTile, claimTile, claimTile];
        if (securesYaku(view, meldTiles, remaining) && shantenAdvancesForCall(view, [claimTile, claimTile])) {
          return { type: "pon", seat: view.seat };
        }
      }
    }
  }

  if (level !== "beginner" && claimTile !== null) {
    const tile: TileType = claimTile;
    const chiAction = legal.find((a): a is Extract<GameViewLegalAction, { type: "chi" }> => a.type === "chi");
    if (chiAction !== undefined) {
      const qualifying = chiAction.options
        .filter(([a, b]) => {
          const afterA = removeOneMatching(view.hand, a);
          const afterBoth = removeOneMatching(afterA, b);
          if (afterBoth.length !== view.hand.length - 2) {
            return false;
          }
          const meldTiles = [a, b, tile];
          return securesYaku(view, meldTiles, afterBoth) && shantenAdvancesForCall(view, [a, b]);
        })
        .toSorted(([a1], [a2]) => Tile.compare(a1, a2));
      const chosen = qualifying[0];
      if (chosen !== undefined) {
        return { type: "chi", seat: view.seat, tiles: chosen };
      }
    }
  }

  return null;
};
