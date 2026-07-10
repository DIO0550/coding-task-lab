import type { ScoreInput } from "../../domains/scoring/index.ts";
import { Meld } from "../../domains/meld/index.ts";
import type { MeldType } from "../../domains/meld/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import type { Tile as TileT } from "../../domains/tile/index.ts";
import type { Situational } from "../../domains/win-context/index.ts";
import {
  isBoolean,
  isFiniteNonNegativeInteger,
  isOneOf,
  isRecord,
  isStringArray,
} from "./json-guards.ts";

const WIN_TYPES = ["tsumo", "ron"] as const;
const WINDS = ["ton", "nan", "sha", "pei"] as const;
const ROUND_WINDS = ["ton", "nan"] as const;
const RIICHI_STATES = ["none", "riichi", "double"] as const;
const SITUATIONALS = ["haitei", "houtei", "rinshan", "chankan", "tenhou", "chihou"] as const;
const MELD_TYPES = ["chi", "pon", "kan", "ankan"] as const;
const TSUMO_ONLY_SITUATIONALS = ["haitei", "rinshan", "tenhou", "chihou"] as const;
const RON_ONLY_SITUATIONALS = ["houtei", "chankan"] as const;
const SUITS = ["m", "p", "s"] as const;

const parseTiles = (list: readonly string[]): readonly TileT[] | null => {
  const tiles: TileT[] = [];
  for (const s of list) {
    const t = Tile.parse(s);
    if (t === null) {
      return null;
    }
    tiles.push(t);
  }
  return tiles;
};

const parseMeld = (raw: unknown): Meld | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const { type, tiles } = raw;
  if (!isOneOf(MELD_TYPES, type)) {
    return null;
  }
  if (!isStringArray(tiles)) {
    return null;
  }
  const parsedTiles = parseTiles(tiles);
  if (parsedTiles === null) {
    return null;
  }
  const meld: Meld = { type: type as MeldType, tiles: parsedTiles };
  return Meld.isValid(meld) ? meld : null;
};

const parseMelds = (raw: unknown): readonly Meld[] | null => {
  if (!Array.isArray(raw)) {
    return null;
  }
  const melds: Meld[] = [];
  for (const item of raw) {
    const meld = parseMeld(item);
    if (meld === null) {
      return null;
    }
    melds.push(meld);
  }
  return melds;
};

/** hand は和了牌を含む純手牌(14-3n枚)でなければならない。 */
const resolveConcealedHand = (
  handTiles: readonly TileT[],
  winTile: TileT,
  meldCount: number,
): readonly TileT[] | null => {
  const fullLength = 14 - 3 * meldCount;
  if (handTiles.length !== fullLength) {
    return null;
  }
  return handTiles.some((tile) => Tile.strictEquals(tile, winTile)) ? handTiles : null;
};

/** 同種牌(赤同一視)が5枚以上、または同色の赤5が2枚以上ないかを確認する。 */
const hasValidTileCounts = (allTiles: readonly TileT[]): boolean => {
  const kindCounts = new Array<number>(34).fill(0);
  for (const t of allTiles) {
    const index = Tile.toIndex34(t);
    kindCounts[index] = (kindCounts[index] ?? 0) + 1;
  }
  if (kindCounts.some((count) => count > 4)) {
    return false;
  }

  const redCounts: Record<(typeof SUITS)[number], number> = { m: 0, p: 0, s: 0 };
  for (const t of allTiles) {
    if (t.kind === "number" && t.red) {
      redCounts[t.suit] += 1;
    }
  }
  return SUITS.every((suit) => redCounts[suit] <= 1);
};

export const parseScoreInput = (raw: unknown): ScoreInput | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const {
    hand,
    melds,
    winTile,
    winType,
    seatWind,
    roundWind,
    dora,
    uraDora,
    riichi,
    ippatsu,
    situational,
    honba,
    kyotaku,
    rules,
  } = raw;

  if (!isStringArray(hand)) {
    return null;
  }
  if (typeof winTile !== "string") {
    return null;
  }
  if (!isOneOf(WIN_TYPES, winType)) {
    return null;
  }
  if (!isOneOf(WINDS, seatWind)) {
    return null;
  }
  if (!isOneOf(ROUND_WINDS, roundWind)) {
    return null;
  }
  if (!isStringArray(dora)) {
    return null;
  }
  if (!isStringArray(uraDora)) {
    return null;
  }
  if (!isOneOf(RIICHI_STATES, riichi)) {
    return null;
  }
  if (!isBoolean(ippatsu)) {
    return null;
  }
  if (!isStringArray(situational)) {
    return null;
  }
  if (!situational.every((s) => isOneOf(SITUATIONALS, s))) {
    return null;
  }
  const situationalTyped = situational as readonly Situational[];

  const parsedMelds = parseMelds(melds);
  if (parsedMelds === null) {
    return null;
  }

  const parsedWinTile = Tile.parse(winTile);
  if (parsedWinTile === null) {
    return null;
  }

  const parsedHandTiles = parseTiles(hand);
  if (parsedHandTiles === null) {
    return null;
  }

  const parsedDora = parseTiles(dora);
  if (parsedDora === null) {
    return null;
  }

  const parsedUraDora = parseTiles(uraDora);
  if (parsedUraDora === null) {
    return null;
  }

  const concealedHand = resolveConcealedHand(parsedHandTiles, parsedWinTile, parsedMelds.length);
  if (concealedHand === null) {
    return null;
  }

  const allTiles = [...concealedHand, ...parsedMelds.flatMap((m) => m.tiles)];
  if (!hasValidTileCounts(allTiles)) {
    return null;
  }

  const isMenzen = parsedMelds.every((m) => !Meld.isOpen(m));
  if (riichi !== "none" && !isMenzen) {
    return null;
  }
  if (ippatsu && riichi === "none") {
    return null;
  }
  if (parsedUraDora.length > 0 && riichi === "none") {
    return null;
  }

  if (new Set(situationalTyped).size !== situationalTyped.length) {
    return null;
  }

  const hasTenhou = situationalTyped.includes("tenhou");
  const hasChihou = situationalTyped.includes("chihou");
  if ((hasTenhou || hasChihou) && parsedMelds.length > 0) {
    return null;
  }
  if (hasTenhou && seatWind !== "ton") {
    return null;
  }
  if (hasChihou && seatWind === "ton") {
    return null;
  }
  if (
    (hasTenhou || hasChihou) &&
    (situationalTyped.length !== 1 || riichi !== "none" || ippatsu)
  ) {
    return null;
  }
  const hasHaitei = situationalTyped.includes("haitei");
  const hasHoutei = situationalTyped.includes("houtei");
  const hasRinshan = situationalTyped.includes("rinshan");
  const hasChankan = situationalTyped.includes("chankan");
  if ((hasHaitei && hasRinshan) || (hasHoutei && hasChankan)) {
    return null;
  }
  if (hasRinshan && !parsedMelds.some((meld) => meld.type === "kan" || meld.type === "ankan")) {
    return null;
  }
  if (ippatsu && (hasRinshan || hasChankan)) {
    return null;
  }

  const requiresTsumo = situationalTyped.some((s) =>
    (TSUMO_ONLY_SITUATIONALS as readonly Situational[]).includes(s),
  );
  if (requiresTsumo && winType !== "tsumo") {
    return null;
  }
  const requiresRon = situationalTyped.some((s) =>
    (RON_ONLY_SITUATIONALS as readonly Situational[]).includes(s),
  );
  if (requiresRon && winType !== "ron") {
    return null;
  }

  let honbaValue = 0;
  if (honba !== undefined) {
    if (!isFiniteNonNegativeInteger(honba)) {
      return null;
    }
    honbaValue = honba;
  }

  let kyotakuValue = 0;
  if (kyotaku !== undefined) {
    if (!isFiniteNonNegativeInteger(kyotaku)) {
      return null;
    }
    kyotakuValue = kyotaku;
  }

  let kuitanValue = true;
  let redDoraValue = true;
  if (rules !== undefined) {
    if (!isRecord(rules)) {
      return null;
    }
    const { kuitan, redDora } = rules;
    if (kuitan !== undefined) {
      if (!isBoolean(kuitan)) {
        return null;
      }
      kuitanValue = kuitan;
    }
    if (redDora !== undefined) {
      if (!isBoolean(redDora)) {
        return null;
      }
      redDoraValue = redDora;
    }
  }

  return {
    hand: concealedHand,
    melds: parsedMelds,
    winTile: parsedWinTile,
    winType,
    seatWind,
    roundWind,
    dora: parsedDora,
    uraDora: parsedUraDora,
    riichi,
    ippatsu,
    situational: situationalTyped,
    honba: honbaValue,
    kyotaku: kyotakuValue,
    rules: { kuitan: kuitanValue, redDora: redDoraValue },
  };
};
