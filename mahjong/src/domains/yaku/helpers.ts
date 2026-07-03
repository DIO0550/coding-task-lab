import type {
  Block,
  ChiitoiDecomposition,
  Decomposition,
  KokushiDecomposition,
  StandardDecomposition,
} from "../hand/index.ts";
import type { HonorKind, NumberRank, Suit } from "../tile/index.ts";
import { Tile } from "../tile/index.ts";
import type { WinContext } from "../win-context/index.ts";

const DRAGON_HONORS: readonly HonorKind[] = ["haku", "hatsu", "chun"];
const WIND_HONORS: readonly HonorKind[] = ["ton", "nan", "sha", "pei"];

export const isStandard = (d: Decomposition): d is StandardDecomposition => d.kind === "standard";
export const isChiitoi = (d: Decomposition): d is ChiitoiDecomposition => d.kind === "chiitoitsu";
export const isKokushi = (d: Decomposition): d is KokushiDecomposition => d.kind === "kokushi";

/** 刻子・槓子(手の内/副露いずれも)を判定する。 */
export const isTripletKind = (b: Block): boolean => b.kind === "koutsu" || b.kind === "kantsu";

export const isDragonTile = (t: Tile): boolean => t.kind === "honor" && DRAGON_HONORS.includes(t.honor);
export const isWindTile = (t: Tile): boolean => t.kind === "honor" && WIND_HONORS.includes(t.honor);

/** 三元牌・自風・場風のいずれかに該当する役牌かどうか。 */
export const isYakuhaiTile = (t: Tile, ctx: WinContext): boolean => {
  if (t.kind !== "honor") {
    return false;
  }
  if (isDragonTile(t)) {
    return true;
  }
  return t.honor === ctx.seatWind || t.honor === ctx.roundWind;
};

/** 標準形の雀頭+4ブロックすべての牌を1列に並べる(副露牌も含む)。 */
export const standardAllTiles = (d: StandardDecomposition): readonly Tile[] => [
  ...d.pair,
  ...d.blocks.flatMap((b) => b.tiles),
];

/** 七対子の7対すべての牌を1列に並べる。 */
export const chiitoiAllTiles = (d: ChiitoiDecomposition): readonly Tile[] => d.pairs.flatMap((pair) => pair);

/** 国士無双は牌の一覧を持たないため null を返す(呼び出し側で non-null チェックすること)。 */
export const allTilesOf = (d: Decomposition): readonly Tile[] | null => {
  if (isStandard(d)) {
    return standardAllTiles(d);
  }
  if (isChiitoi(d)) {
    return chiitoiAllTiles(d);
  }
  return null;
};

/** 標準形の「雀頭+各ブロック」を牌の集合の配列として返す(chanta系の判定に使う)。 */
export const groupsOf = (d: StandardDecomposition): readonly (readonly Tile[])[] => [
  ...d.blocks.map((b) => b.tiles),
  d.pair,
];

const firstTileOf = (b: Block): Tile | null => {
  const t = b.tiles[0];
  return t === undefined ? null : t;
};

/** 順子ブロックの開始牌(色・最小の数)を返す。順子でなければ null。 */
export const shuntsuStart = (b: Block): Readonly<{ suit: Suit; rank: NumberRank }> | null => {
  if (b.kind !== "shuntsu") {
    return null;
  }
  const sorted = [...b.tiles].toSorted(Tile.compare);
  const first = sorted[0];
  if (first === undefined || first.kind !== "number") {
    return null;
  }
  return { suit: first.suit, rank: first.rank };
};

/** 暗刻・暗槓(open===false の刻子・槓子)の数。ロン双碰の完成刻子は open:true のため含まれない。 */
export const concealedTripletCount = (d: StandardDecomposition): number =>
  d.blocks.filter((b) => isTripletKind(b) && !b.open).length;

/** 槓子(明槓・暗槓を問わず)の数。 */
export const kantsuCount = (d: StandardDecomposition): number =>
  d.blocks.filter((b) => b.kind === "kantsu").length;

/** 三元牌の刻子・槓子の数。 */
export const dragonTripletCount = (d: StandardDecomposition): number =>
  d.blocks.filter((b) => {
    if (!isTripletKind(b)) {
      return false;
    }
    const t = firstTileOf(b);
    return t !== null && isDragonTile(t);
  }).length;

/** 風牌の刻子・槓子の数。 */
export const windTripletCount = (d: StandardDecomposition): number =>
  d.blocks.filter((b) => {
    if (!isTripletKind(b)) {
      return false;
    }
    const t = firstTileOf(b);
    return t !== null && isWindTile(t);
  }).length;
