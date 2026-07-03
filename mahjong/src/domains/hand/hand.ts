import { Tile, TILE_KIND_COUNT } from "@/src/domains/tile";
import { Meld } from "@/src/domains/meld";
import { decomposeWinningHand, type Interpretation } from "./decompose";
import {
  chiitoitsuShanten,
  kokushiShanten,
  standardShanten,
} from "./shanten";

/** 手牌(純手牌 + 副露)。concealed の枚数は 13 - 3×副露数(ツモ後は +1) */
export type Hand = Readonly<{
  concealed: readonly Tile[];
  melds: readonly Meld[];
}>;

export const Hand = {
  create(concealed: readonly Tile[], melds: readonly Meld[]): Hand {
    return { concealed: Tile.sort(concealed), melds };
  },

  isMenzen(hand: Hand): boolean {
    return hand.melds.every((meld) => !Meld.isOpen(meld));
  },

  /** 和了牌を含む手牌の全解釈を列挙する。和了形でなければ空配列 */
  decompose(
    hand: Hand,
    winTile: Tile,
    winType: "tsumo" | "ron",
  ): readonly Interpretation[] {
    return decomposeWinningHand(hand.concealed, hand.melds, winTile, winType);
  },

  /** concealed が和了形(14 - 3×副露数 枚)かどうか */
  isWinningShape(hand: Hand): boolean {
    return Hand.shanten(hand) === -1;
  },

  /** シャンテン数(和了 -1、テンパイ 0)。通常形・七対子・国士無双の最小値 */
  shanten(hand: Hand): number {
    const counts = Tile.toCounts(hand.concealed);
    const meldCount = hand.melds.length;
    const candidates = [standardShanten(counts, meldCount)];
    if (meldCount === 0) {
      candidates.push(chiitoitsuShanten(counts), kokushiShanten(counts));
    }
    return Math.min(...candidates);
  },

  /** 13枚形の手牌の待ち牌(和了形を完成させる牌)を列挙する */
  waits(hand: Hand): readonly Tile[] {
    const ownCounts = Tile.toCounts([
      ...hand.concealed,
      ...hand.melds.flatMap((meld) => meld.tiles),
    ]);
    const result: Tile[] = [];
    for (let i = 0; i < TILE_KIND_COUNT; i += 1) {
      if (ownCounts[i] >= 4) {
        continue;
      }
      const tile = Tile.fromIndex(i);
      const next = Hand.create([...hand.concealed, tile], hand.melds);
      if (Hand.shanten(next) === -1) {
        result.push(tile);
      }
    }
    return result;
  },

  isTenpai(hand: Hand): boolean {
    return Hand.shanten(hand) === 0;
  },

  /** 13枚形に1枚加えるとシャンテン数が下がる牌(受け入れ)を列挙する */
  improvingTiles(hand: Hand): readonly Tile[] {
    const current = Hand.shanten(hand);
    const ownCounts = Tile.toCounts([
      ...hand.concealed,
      ...hand.melds.flatMap((meld) => meld.tiles),
    ]);
    const result: Tile[] = [];
    for (let i = 0; i < TILE_KIND_COUNT; i += 1) {
      if (ownCounts[i] >= 4) {
        continue;
      }
      const tile = Tile.fromIndex(i);
      const next = Hand.create([...hand.concealed, tile], hand.melds);
      if (Hand.shanten(next) < current) {
        result.push(tile);
      }
    }
    return result;
  },
} as const;
