import type { Decomposition } from "../hand/index.ts";
import { Tile } from "../tile/index.ts";
import { allTilesOf, concealedTripletCount, isStandard, kantsuCount } from "./helpers.ts";
import type { YakuHit } from "./types.ts";

/** 4ブロックすべてが刻子・槓子。 */
const detectToitoi = (d: Decomposition): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (!d.blocks.every((b) => b.kind === "koutsu" || b.kind === "kantsu")) {
    return null;
  }
  return { name: "toitoi", han: 2 };
};

/** 暗刻(open===false の刻子・槓子)が3つ。 */
const detectSanankou = (d: Decomposition): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (concealedTripletCount(d) !== 3) {
    return null;
  }
  return { name: "sanankou", han: 2 };
};

/** 槓子が3つ。 */
const detectSankantsu = (d: Decomposition): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (kantsuCount(d) !== 3) {
    return null;
  }
  return { name: "sankantsu", han: 2 };
};

/** 全牌が么九牌(七対子形でも成立する)。 */
const detectHonroutou = (d: Decomposition): YakuHit | null => {
  const tiles = allTilesOf(d);
  if (tiles === null) {
    return null;
  }
  if (!tiles.every(Tile.isYaochuu)) {
    return null;
  }
  return { name: "honroutou", han: 2 };
};

export const detectBlockYaku = (d: Decomposition): readonly YakuHit[] => {
  const hits = [detectToitoi(d), detectSanankou(d), detectSankantsu(d), detectHonroutou(d)];
  return hits.filter((h): h is YakuHit => h !== null);
};
