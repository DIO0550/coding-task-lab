import { Tile } from "../tile/index.ts";
import type { Meld } from "../meld/index.ts";
import type { WinningForm } from "./form.ts";
import { decomposeForms } from "./decompose.ts";
import { minimumShanten } from "./shanten.ts";

const COMPLETE_HAND_SIZE = 14;

const TILES_PER_MELD = 3;

const MAX_MELDS = 4;

const MAX_TILES_PER_KIND = 4;

const countMatching = (tiles: readonly Tile[], target: Tile): number =>
  tiles.filter((tile) => Tile.equals(tile, target)).length;

export const Hand = {
  /**
   * 入力 hand から winTile を補完して完成面前手(14枚相当)を昇順で返す。
   * 期待枚数(14 - 3×副露数)ちょうどならそのまま、1枚少なければ winTile を
   * 加える。それ以外の枚数は null(枚数不整合)。
   */
  completeConcealed(
    handTiles: readonly Tile[],
    meldCount: number,
    winTile: Tile,
  ): readonly Tile[] | null {
    if (!Number.isInteger(meldCount) || meldCount < 0 || meldCount > MAX_MELDS) {
      return null;
    }
    const expected = COMPLETE_HAND_SIZE - TILES_PER_MELD * meldCount;
    if (handTiles.length === expected) {
      return handTiles.toSorted(Tile.compare);
    }
    if (handTiles.length === expected - 1) {
      return [...handTiles, winTile].toSorted(Tile.compare);
    }
    return null;
  },

  /** 完成面前手+副露が和了形(通常形・七対子・国士無双)か */
  isWinningShape(concealed: readonly Tile[], melds: readonly Meld[]): boolean {
    return decomposeForms(concealed, melds).length > 0;
  },

  /**
   * 高点法用に全ての有効な和了分解を列挙する(通常形の複数解釈・七対子・
   * 国士無双すべて)。和了形でなければ空配列
   */
  decompose(
    concealed: readonly Tile[],
    melds: readonly Meld[],
  ): readonly WinningForm[] {
    return decomposeForms(concealed, melds);
  },

  /** 通常形・七対子・国士無双の最小シャンテン数。和了=-1、テンパイ=0 */
  shanten(concealed: readonly Tile[], meldCount: number): number {
    return minimumShanten(concealed, meldCount);
  },

  /** 面前部分(13枚相当)がテンパイか */
  isTenpai(concealed: readonly Tile[], melds: readonly Meld[]): boolean {
    return minimumShanten(concealed, melds.length) === 0;
  },

  /**
   * テンパイ手の和了牌を34種から判定して正準順で返す。テンパイでなければ空。
   * 手牌+副露で4枚使い切っている牌は待ちに含めない
   */
  waits(concealed: readonly Tile[], melds: readonly Meld[]): readonly Tile[] {
    const meldTiles = melds.flatMap((meld) => meld.tiles);
    return Tile.all().filter((candidate) => {
      const used =
        countMatching(concealed, candidate) +
        countMatching(meldTiles, candidate);
      if (used >= MAX_TILES_PER_KIND) {
        return false;
      }
      return decomposeForms([...concealed, candidate], melds).length > 0;
    });
  },

  /**
   * ツモでシャンテンが進む受け入れ牌を正準順で返す。
   * 面前部分で4枚使い切っている牌は含めない
   */
  acceptances(
    concealed: readonly Tile[],
    meldCount: number,
  ): readonly Tile[] {
    const current = minimumShanten(concealed, meldCount);
    return Tile.all().filter((candidate) => {
      if (countMatching(concealed, candidate) >= MAX_TILES_PER_KIND) {
        return false;
      }
      return minimumShanten([...concealed, candidate], meldCount) < current;
    });
  },
} as const;
