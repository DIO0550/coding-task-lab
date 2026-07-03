import { Hand } from "../../domains/hand/index.ts";
import type { CpuLevel, GameAction, GameView } from "../../domains/game/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import type { Tile as TileType } from "../../domains/tile/index.ts";
import { countMatching, distinctKinds, kamichaOf, othersInClaimSearchOrder, removeNMatching, removeOneMatching, seatWindOf } from "./tile-helpers.ts";

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

/**
 * claims フェーズの対象牌(鳴きの対象になっている打牌)を GameView から推定する。
 * GameView / LegalAction は対象牌そのものを直接は公開していないため、以下の優先度で推定する:
 * 1. chi が合法手にあれば、チーは必ず上家からの打牌に対してのみ成立するため、
 *    上家の河の最後の1枚が対象牌で確定する。
 * 2. kan(大明槓)が合法手にあれば、claims フェーズの kan は対象牌1枚のみを積むため確定する。
 * 3. pon のみの場合は、自分以外の3席を下家→対面→上家の順に見て、
 *    自手牌にその席の河の最後の牌と同種が2枚以上あれば、それを対象牌とみなす(推定)。
 * 特定できない場合は null を返す(この場合は鳴かない)。
 */
export const guessClaimTile = (view: GameView): TileType | null => {
  const legal = view.legalActions;

  const chiAction = legal.find((a) => a.type === "chi");
  if (chiAction !== undefined) {
    const kamicha = kamichaOf(view.seat);
    const river = view.players[kamicha]?.river ?? [];
    const last = river[river.length - 1];
    if (last !== undefined) {
      return last.tile;
    }
  }

  const kanAction = legal.find((a): a is Extract<GameViewLegalAction, { type: "kan" }> => a.type === "kan");
  if (kanAction !== undefined && kanAction.tiles.length === 1) {
    return kanAction.tiles[0] ?? null;
  }

  const ponAction = legal.find((a) => a.type === "pon");
  if (ponAction !== undefined) {
    for (const seat of othersInClaimSearchOrder(view.seat)) {
      const river = view.players[seat]?.river ?? [];
      const last = river[river.length - 1];
      if (last !== undefined && countMatching(view.hand, last.tile) >= 2) {
        return last.tile;
      }
    }
  }

  return null;
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
  return allTiles.every((t) => !Tile.isYaochuu(t));
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
  const claimTile = guessClaimTile(view);

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
