import type { Decomposition } from "../hand/index.ts";
import type { Suit } from "../tile/index.ts";
import { Tile } from "../tile/index.ts";
import type { WinContext } from "../win-context/index.ts";
import { allTilesOf, groupsOf, isStandard, isYakuhaiTile, shuntsuStart } from "./helpers.ts";
import type { YakuHit } from "./types.ts";

/** 門前・全ブロック順子・雀頭が役牌でない・両面待ち。 */
const detectPinfu = (d: Decomposition, ctx: WinContext): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (!ctx.isMenzen) {
    return null;
  }
  if (d.wait !== "ryanmen") {
    return null;
  }
  if (!d.blocks.every((b) => b.kind === "shuntsu" && b.meldType === null)) {
    return null;
  }
  if (isYakuhaiTile(d.pair[0], ctx)) {
    return null;
  }
  return { name: "pinfu", han: 1 };
};

/** 全牌が中張牌(2〜8の数牌)。喰いタンは ctx.rules.kuitan で制御する。 */
const detectTanyao = (d: Decomposition, ctx: WinContext): YakuHit | null => {
  const tiles = allTilesOf(d);
  if (tiles === null) {
    return null;
  }
  if (!tiles.every((t) => !Tile.isYaochuu(t))) {
    return null;
  }
  if (!ctx.isMenzen && !ctx.rules.kuitan) {
    return null;
  }
  return { name: "tanyao", han: 1 };
};

/** 同一順子2組の重複ペア数を数え、iipeiko(1組)/ryanpeiko(2組)を排他的に判定する(門前のみ)。 */
const detectPeikou = (d: Decomposition, ctx: WinContext): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  if (!ctx.isMenzen) {
    return null;
  }
  const keyCounts = new Map<number, number>();
  for (const b of d.blocks) {
    if (b.kind !== "shuntsu") {
      continue;
    }
    const key = Math.min(...b.tiles.map(Tile.toIndex34));
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  const duplicatePairs = [...keyCounts.values()].reduce((sum, c) => sum + Math.floor(c / 2), 0);
  if (duplicatePairs >= 2) {
    return { name: "ryanpeiko", han: 3 };
  }
  if (duplicatePairs === 1) {
    return { name: "iipeiko", han: 1 };
  }
  return null;
};

/** 全ブロック+雀頭が么九牌を含む(chanta)。老頭牌のみ・字牌なしなら junchan。全て么九牌のみ(honroutou形)なら出さない。 */
const detectChantaFamily = (d: Decomposition, ctx: WinContext): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  const groups = groupsOf(d);
  const allContainYaochuu = groups.every((g) => g.some(Tile.isYaochuu));
  if (!allContainYaochuu) {
    return null;
  }
  const isHonroutouShape = groups.every((g) => g.every(Tile.isYaochuu));
  if (isHonroutouShape) {
    return null;
  }
  const hasHonor = groups.some((g) => g.some((t) => t.kind === "honor"));
  const allContainTerminal = groups.every((g) => g.some(Tile.isTerminal));
  const isOpen = !ctx.isMenzen;
  if (!hasHonor && allContainTerminal) {
    return { name: "junchan", han: isOpen ? 2 : 3 };
  }
  return { name: "chanta", han: isOpen ? 1 : 2 };
};

/** 一色+字牌なら honitsu、字牌を含まず一色のみなら chinitsu(chinitsu成立時はhonitsuを出さない)。 */
const detectHonitsuFamily = (d: Decomposition, ctx: WinContext): YakuHit | null => {
  const tiles = allTilesOf(d);
  if (tiles === null) {
    return null;
  }
  const suits = new Set<Suit>();
  let hasHonor = false;
  for (const t of tiles) {
    if (t.kind === "number") {
      suits.add(t.suit);
    } else {
      hasHonor = true;
    }
  }
  if (suits.size > 1) {
    return null;
  }
  const isOpen = !ctx.isMenzen;
  if (suits.size === 1 && !hasHonor) {
    return { name: "chinitsu", han: isOpen ? 5 : 6 };
  }
  if (!hasHonor) {
    return null;
  }
  return { name: "honitsu", han: isOpen ? 2 : 3 };
};

/** 同数字並びの順子が三色。 */
const detectSanshokuDoujun = (d: Decomposition, ctx: WinContext): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  const bySuit: Record<Suit, Set<number>> = { m: new Set(), p: new Set(), s: new Set() };
  for (const b of d.blocks) {
    const start = shuntsuStart(b);
    if (start !== null) {
      bySuit[start.suit].add(start.rank);
    }
  }
  const isOpen = !ctx.isMenzen;
  for (const rank of bySuit.m) {
    if (bySuit.p.has(rank) && bySuit.s.has(rank)) {
      return { name: "sanshoku_doujun", han: isOpen ? 1 : 2 };
    }
  }
  return null;
};

/** 同数字の刻子が三色。 */
const detectSanshokuDoukou = (d: Decomposition): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  const bySuit: Record<Suit, Set<number>> = { m: new Set(), p: new Set(), s: new Set() };
  for (const b of d.blocks) {
    if (b.kind !== "koutsu" && b.kind !== "kantsu") {
      continue;
    }
    const t = b.tiles[0];
    if (t === undefined || t.kind !== "number") {
      continue;
    }
    bySuit[t.suit].add(t.rank);
  }
  for (const rank of bySuit.m) {
    if (bySuit.p.has(rank) && bySuit.s.has(rank)) {
      return { name: "sanshoku_doukou", han: 2 };
    }
  }
  return null;
};

/** 同色の123・456・789(一気通貫)。 */
const detectIttsu = (d: Decomposition, ctx: WinContext): YakuHit | null => {
  if (!isStandard(d)) {
    return null;
  }
  const bySuit: Record<Suit, Set<number>> = { m: new Set(), p: new Set(), s: new Set() };
  for (const b of d.blocks) {
    const start = shuntsuStart(b);
    if (start !== null) {
      bySuit[start.suit].add(start.rank);
    }
  }
  const isOpen = !ctx.isMenzen;
  for (const suit of ["m", "p", "s"] as const) {
    if (bySuit[suit].has(1) && bySuit[suit].has(4) && bySuit[suit].has(7)) {
      return { name: "ittsu", han: isOpen ? 1 : 2 };
    }
  }
  return null;
};

const detectChiitoitsu = (d: Decomposition): YakuHit | null =>
  d.kind === "chiitoitsu" ? { name: "chiitoitsu", han: 2 } : null;

export const detectShapeYaku = (d: Decomposition, ctx: WinContext): readonly YakuHit[] => {
  const hits = [
    detectPinfu(d, ctx),
    detectTanyao(d, ctx),
    detectPeikou(d, ctx),
    detectChantaFamily(d, ctx),
    detectHonitsuFamily(d, ctx),
    detectSanshokuDoujun(d, ctx),
    detectSanshokuDoukou(d),
    detectIttsu(d, ctx),
    detectChiitoitsu(d),
  ];
  return hits.filter((h): h is YakuHit => h !== null);
};
