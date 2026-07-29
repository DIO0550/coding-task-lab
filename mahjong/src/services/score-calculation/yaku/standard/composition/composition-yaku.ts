import { Block } from "../../../../../domains/block/index.ts";
import { Tile, type TileSuit } from "../../../../../domains/tile/index.ts";
import { WinningHand } from "../../../../../domains/winning-hand/index.ts";
import { Yaku, type YakuName } from "../../../../../domains/yaku/index.ts";

const numberSuitsOf = (tiles: readonly Tile[]): ReadonlySet<TileSuit> =>
  new Set(tiles.filter((tile) => !Tile.isHonor(tile)).map((tile) => tile.suit));

/** 数牌が一種類なら、字牌を含むかで混一色と清一色を分ける。 */
const flushName = (tiles: readonly Tile[]): YakuName | null => {
  if (numberSuitsOf(tiles).size > 1) {
    return null;
  }
  return tiles.some((tile) => Tile.isHonor(tile)) ? "honitsu" : "chinitsu";
};

/** 全ブロックが么九牌を含めばチャンタ。字牌が一枚も無ければ純チャン。 */
const chantaName = (winningHand: WinningHand): YakuName | null => {
  if (winningHand.form.kind !== "standard") {
    return null;
  }
  const blocks = WinningHand.blocks(winningHand);
  if (!blocks.every((block) => Block.hasOrphan(block))) {
    return null;
  }
  return WinningHand.allTiles(winningHand).some((tile) => Tile.isHonor(tile))
    ? "chanta"
    : "junchan";
};

/** 混老頭は面子手・七対子形のいずれでも成立する。 */
const isHonroutou = (
  winningHand: WinningHand,
  tiles: readonly Tile[],
): boolean =>
  winningHand.form.kind !== "thirteen_orphans" &&
  tiles.every((tile) => Tile.isOrphan(tile)) &&
  tiles.some((tile) => Tile.isHonor(tile));

const namesOf = (winningHand: WinningHand): readonly YakuName[] => {
  const tiles = WinningHand.allTiles(winningHand);
  const names: readonly (YakuName | null)[] = [
    tiles.every((tile) => Tile.isSimple(tile)) ? "tanyao" : null,
    winningHand.form.kind === "seven_pairs" ? "chiitoitsu" : null,
    chantaName(winningHand),
    isHonroutou(winningHand, tiles) ? "honroutou" : null,
    flushName(tiles),
  ];
  return names.filter((name): name is YakuName => name !== null);
};

export const CompositionYakuDetection = {
  /** 牌の構成から成立する役(断么九・七対子・チャンタ・純チャン・混老頭・混一色・清一色)。 */
  detect(winningHand: WinningHand): readonly Yaku[] {
    const menzen = WinningHand.isMenzen(winningHand);
    return namesOf(winningHand)
      .map((name) => Yaku.of(name, menzen))
      .filter((yaku): yaku is Yaku => yaku !== null);
  },
} as const;
