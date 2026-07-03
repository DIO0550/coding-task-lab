import type { Decomposition } from "../hand/index.ts";
import { Tile } from "../tile/index.ts";
import type { WinContext } from "../win-context/index.ts";
import {
  allTilesOf,
  concealedTripletCount,
  dragonTripletCount,
  isStandard,
  isWindTile,
  kantsuCount,
  standardAllTiles,
  windTripletCount,
} from "./helpers.ts";
import type { YakumanHit } from "./types.ts";

/** 国士無双(13面待ちなら rank2、それ以外は rank1。排他)。 */
const detectKokushi = (d: Decomposition): YakumanHit | null => {
  if (d.kind !== "kokushi") {
    return null;
  }
  return d.thirteenWait
    ? { name: "kokushi_musou_juusanmen", rank: 2 }
    : { name: "kokushi_musou", rank: 1 };
};

/**
 * 暗刻4つ。ロンの双碰完成刻子は open:true のため、Wave1の分解が正しければ自然に
 * 対象から除外される(そのケースは sanankou+toitoi になる)。単騎待ちなら rank2(排他)。
 */
const detectSuuankou = (d: Decomposition): YakumanHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (concealedTripletCount(d) !== 4) {
    return null;
  }
  return d.wait === "tanki" ? { name: "suuankou_tanki", rank: 2 } : { name: "suuankou", rank: 1 };
};

/** 三元牌の刻子3つ。 */
const detectDaisangen = (d: Decomposition): YakumanHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (dragonTripletCount(d) !== 3) {
    return null;
  }
  return { name: "daisangen", rank: 1 };
};

/** 風牌刻子3+風牌雀頭なら shousuushi、風牌刻子4なら daisuushi(排他)。 */
const detectWindYakuman = (d: Decomposition): YakumanHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  const count = windTripletCount(d);
  if (count === 4) {
    return { name: "daisuushi", rank: 2 };
  }
  if (count === 3 && isWindTile(d.pair[0])) {
    return { name: "shousuushi", rank: 1 };
  }
  return null;
};

/** 全字牌(字七対でも成立)。 */
const detectTsuuiisou = (d: Decomposition): YakumanHit | null => {
  const tiles = allTilesOf(d);
  if (tiles === null) {
    return null;
  }
  if (!tiles.every((t) => t.kind === "honor")) {
    return null;
  }
  return { name: "tsuuiisou", rank: 1 };
};

/** 全老頭牌。 */
const detectChinroutou = (d: Decomposition): YakumanHit | null => {
  const tiles = allTilesOf(d);
  if (tiles === null) {
    return null;
  }
  if (!tiles.every((t) => t.kind === "number" && (t.rank === 1 || t.rank === 9))) {
    return null;
  }
  return { name: "chinroutou", rank: 1 };
};

/** 全緑牌(發不要=發なしでも成立)。 */
const detectRyuuiisou = (d: Decomposition): YakumanHit | null => {
  const tiles = allTilesOf(d);
  if (tiles === null) {
    return null;
  }
  if (!tiles.every(Tile.isGreen)) {
    return null;
  }
  return { name: "ryuuiisou", rank: 1 };
};

/** 槓子4つ。 */
const detectSuukantsu = (d: Decomposition): YakumanHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (kantsuCount(d) !== 4) {
    return null;
  }
  return { name: "suukantsu", rank: 1 };
};

/** rank(0-indexed)ごとの基準枚数: 1が3枚, 2〜8が1枚ずつ, 9が3枚。 */
const CHUUREN_BASE_COUNTS: readonly number[] = [3, 1, 1, 1, 1, 1, 1, 1, 3];

/**
 * 門前清一色で 1112345678999+X。九蓮は Decomposition 単位でなく手牌全体(pair+blocks の
 * 門前牌)で判定する。ここでは簡略化のため副露(暗槓含む)が一切ない場合のみ対象とする。
 * 純正 = 和了牌を除いた13枚がちょうど 1112345678999 形(9面待ち)のとき rank2(排他)。
 */
const detectChuurenPoutou = (d: Decomposition, ctx: WinContext): YakumanHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (ctx.melds.length !== 0 || !ctx.isMenzen) {
    return null;
  }
  const tiles = standardAllTiles(d);
  const first = tiles[0];
  if (first === undefined || first.kind !== "number") {
    return null;
  }
  const suit = first.suit;
  if (!tiles.every((t) => t.kind === "number" && t.suit === suit)) {
    return null;
  }

  const counts = new Array<number>(9).fill(0);
  for (const t of tiles) {
    if (t.kind === "number") {
      counts[t.rank - 1] = (counts[t.rank - 1] ?? 0) + 1;
    }
  }

  let excessRank: number | null = null;
  for (let i = 0; i < 9; i += 1) {
    const diff = (counts[i] ?? 0) - (CHUUREN_BASE_COUNTS[i] ?? 0);
    if (diff === 0) {
      continue;
    }
    if (diff === 1 && excessRank === null) {
      excessRank = i + 1;
      continue;
    }
    return null;
  }
  if (excessRank === null) {
    return null;
  }

  const isJunsei =
    ctx.winTile.kind === "number" && ctx.winTile.suit === suit && ctx.winTile.rank === excessRank;
  return isJunsei ? { name: "junsei_chuuren_poutou", rank: 2 } : { name: "chuuren_poutou", rank: 1 };
};

/** 天和・地和(ツモのみ)。 */
const detectTenhouChihou = (ctx: WinContext): readonly YakumanHit[] => {
  const hits: YakumanHit[] = [];
  if (ctx.winType === "tsumo" && ctx.situational.includes("tenhou")) {
    hits.push({ name: "tenhou", rank: 1 });
  }
  if (ctx.winType === "tsumo" && ctx.situational.includes("chihou")) {
    hits.push({ name: "chihou", rank: 1 });
  }
  return hits;
};

export const detectYakuman = (d: Decomposition, ctx: WinContext): readonly YakumanHit[] => {
  const single = [
    detectKokushi(d),
    detectSuuankou(d),
    detectDaisangen(d),
    detectWindYakuman(d),
    detectTsuuiisou(d),
    detectChinroutou(d),
    detectRyuuiisou(d),
    detectSuukantsu(d),
    detectChuurenPoutou(d, ctx),
  ].filter((h): h is YakumanHit => h !== null);
  return [...single, ...detectTenhouChihou(ctx)];
};
