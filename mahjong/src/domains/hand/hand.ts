import { Meld } from "@/src/domains/meld";
import { Tile } from "@/src/domains/tile";

/**
 * 点数計算・和了判定に使う手牌。`tiles` は純手牌(和了牌を含む)、`melds` は副露。
 * 副露1つにつき手牌3枚分を占めるため、`tiles.length + 3 * melds.length === 14` が成立する。
 */
export type Hand = Readonly<{
  tiles: readonly Tile[];
  melds: readonly Meld[];
}>;

const MAX_COPIES = 4;

const hasTooManyCopies = (tiles: readonly Tile[]): boolean =>
  Tile.counts(tiles).some((count) => count > MAX_COPIES);

const hasDuplicateRed = (tiles: readonly Tile[]): boolean =>
  (["0m", "0p", "0s"] as const).some((red) => tiles.filter((tile) => tile === red).length > 1);

export const Hand = {
  /** 枚数・重複が正しい場合のみ手牌を生成する */
  create(tiles: readonly Tile[], melds: readonly Meld[]): Hand | undefined {
    if (tiles.length + melds.length * 3 !== 14) return undefined;
    const all = Hand.allTiles({ tiles, melds });
    if (hasTooManyCopies(all) || hasDuplicateRed(all)) return undefined;
    return { tiles: Tile.sort(tiles), melds };
  },

  /** 副露を含む全ての牌(槓子は4枚のまま) */
  allTiles(hand: Hand): readonly Tile[] {
    return [...hand.tiles, ...hand.melds.flatMap((meld) => meld.tiles)];
  },

  /** 暗槓以外の副露がなければ門前 */
  isMenzen(hand: Hand): boolean {
    return hand.melds.every((meld) => !Meld.isOpen(meld));
  },

  /** 赤5の枚数 */
  redCount(hand: Hand): number {
    return Hand.allTiles(hand).filter((tile) => Tile.isRed(tile)).length;
  },

  /** 副露を含めた同種牌の枚数(赤5同一視) */
  countOf(hand: Hand, tile: Tile): number {
    return Tile.countOf(Hand.allTiles(hand), tile);
  },

  contains(hand: Hand, tile: Tile): boolean {
    return hand.tiles.some((candidate) => Tile.equals(candidate, tile));
  },
} as const;
