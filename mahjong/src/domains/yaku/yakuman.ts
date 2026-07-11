import { Tile } from "../tile/index.ts";
import type { WinContext, YakuResult } from "../win-context/index.ts";
import {
  allTiles,
  concealedTripletCount,
  isTripletLike,
  standardFormOf,
} from "./form-view.ts";

type Detector = (ctx: WinContext) => readonly YakuResult[];

/** 単役満の翻 */
const YAKUMAN_HAN = 13;

/** ダブル役満の翻 */
const DOUBLE_YAKUMAN_HAN = 26;

/** 緑一色を構成できる牌(2s3s4s6s8s發)。發が無くても成立する */
const GREEN_TILE_KEYS: ReadonlySet<string> = new Set([
  "s2",
  "s3",
  "s4",
  "s6",
  "s8",
  "z6",
]);

/** 九蓮宝燈の基本形 1112345678999 の rank1..9 の必要枚数 */
const CHUUREN_BASE_COUNTS: readonly number[] = [3, 1, 1, 1, 1, 1, 1, 1, 3];

const COMPLETE_HAND_SIZE = 14;

const yakuman = (name: string): YakuResult => ({ name, han: YAKUMAN_HAN });

const doubleYakuman = (name: string): YakuResult => ({
  name,
  han: DOUBLE_YAKUMAN_HAN,
});

/**
 * 国士無双。winTile が雀頭を作った(=和了前の13枚が幺九13種を1枚ずつ
 * 持っていた)なら13面待ちの国士十三面
 */
const detectKokushi: Detector = (ctx) => {
  if (ctx.form.kind !== "kokushi") {
    return [];
  }
  return Tile.equals(ctx.form.pairTile, ctx.winTile)
    ? [doubleYakuman("kokushi_13")]
    : [yakuman("kokushi")];
};

/**
 * 四暗刻。ロンで完成した刻子は明刻扱いのため不成立(単騎ロンは全刻子が
 * 完成済みなので成立)。単騎待ちは四暗刻単騎(ダブル)
 */
const detectSuuankou: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null || concealedTripletCount(form, ctx) !== 4) {
    return [];
  }
  return ctx.agari.target === "pair"
    ? [doubleYakuman("suuankou_tanki")]
    : [yakuman("suuankou")];
};

/** 大三元(白發中すべて刻子/槓子) */
const detectDaisangen: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const dragonTriplets = form.groups.filter(
    (group) => isTripletLike(group) && Tile.isDragon(group.tiles[0]),
  ).length;
  return dragonTriplets === 3 ? [yakuman("daisangen")] : [];
};

/** 小四喜(風牌3種刻子+1種雀頭)/大四喜(風牌4種刻子、ダブル) */
const detectSuushi: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const windTriplets = form.groups.filter(
    (group) => isTripletLike(group) && Tile.isWind(group.tiles[0]),
  ).length;
  if (windTriplets === 4) {
    return [doubleYakuman("daisuushi")];
  }
  return windTriplets === 3 && Tile.isWind(form.pair.tiles[0])
    ? [yakuman("shousuushi")]
    : [];
};

/** 字一色(全牌が字牌) */
const detectTsuuiisou: Detector = (ctx) =>
  allTiles(ctx).every((tile) => Tile.isHonor(tile))
    ? [yakuman("tsuuiisou")]
    : [];

/** 清老頭(全牌が数牌の1/9) */
const detectChinroutou: Detector = (ctx) =>
  allTiles(ctx).every((tile) => Tile.isTerminal(tile))
    ? [yakuman("chinroutou")]
    : [];

/** 緑一色(2s3s4s6s8s發のみ。發なしでも成立) */
const detectRyuuiisou: Detector = (ctx) =>
  allTiles(ctx).every((tile) => GREEN_TILE_KEYS.has(Tile.key(tile)))
    ? [yakuman("ryuuiisou")]
    : [];

/**
 * 九蓮宝燈(副露なしの清一色 1112345678999+任意の1枚)。
 * 超過1枚の rank が winTile なら和了前が純正形(9面待ち)なので純正九蓮(ダブル)
 */
const detectChuuren: Detector = (ctx) => {
  if (ctx.melds.length > 0 || ctx.concealed.length !== COMPLETE_HAND_SIZE) {
    return [];
  }
  const suit = ctx.concealed[0].suit;
  if (suit === "z" || ctx.concealed.some((tile) => tile.suit !== suit)) {
    return [];
  }
  const counts = CHUUREN_BASE_COUNTS.map(
    (_, index) =>
      ctx.concealed.filter((tile) => tile.rank === index + 1).length,
  );
  if (counts.some((count, index) => count < CHUUREN_BASE_COUNTS[index])) {
    return [];
  }
  // 基本形13枚を満たしたうえで合計14枚なので、超過はちょうど1枚
  const excessRank =
    counts.findIndex((count, index) => count > CHUUREN_BASE_COUNTS[index]) + 1;
  return excessRank === ctx.winTile.rank
    ? [doubleYakuman("chuuren_9")]
    : [yakuman("chuuren")];
};

/** 四槓子(明カン・暗槓が4つ) */
const detectSuukantsu: Detector = (ctx) => {
  const form = standardFormOf(ctx);
  if (form === null) {
    return [];
  }
  const kanCount = form.groups.filter(
    (group) => group.type === "kantsu",
  ).length;
  return kanCount === 4 ? [yakuman("suukantsu")] : [];
};

/**
 * 天和(親の配牌和了)・地和(子の第一ツモ和了)。
 * situational の申告に従う(親/子・ツモとの整合は入力側の責務)
 */
const detectTenchihou: Detector = (ctx) => [
  ...(ctx.situational.includes("tenhou") ? [yakuman("tenhou")] : []),
  ...(ctx.situational.includes("chihou") ? [yakuman("chihou")] : []),
];

const DETECTORS: readonly Detector[] = [
  detectKokushi,
  detectSuuankou,
  detectDaisangen,
  detectSuushi,
  detectTsuuiisou,
  detectChinroutou,
  detectRyuuiisou,
  detectChuuren,
  detectSuukantsu,
  detectTenchihou,
];

/**
 * 役満(天和・地和含む)をすべて検出する。単役満 han:13、ダブル役満 han:26。
 * 複合時は各エントリをそのまま列挙する(合計のダブル上限は呼び出し側の責務)
 */
export const detectYakumanList = (ctx: WinContext): readonly YakuResult[] =>
  DETECTORS.flatMap((detector) => detector(ctx));
