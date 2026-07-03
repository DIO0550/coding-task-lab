import { Tile } from "../../domains/tile/index.ts";
import type { TileSuit } from "../../domains/tile/index.ts";
import { Meld } from "../../domains/meld/index.ts";
import type { MeldType } from "../../domains/meld/index.ts";
import { WinContext } from "../../domains/win-context/index.ts";
import type {
  Wind,
  RoundWind,
  RiichiState,
  SituationalYaku,
} from "../../domains/win-context/index.ts";
import type { WinType } from "../../domains/score/index.ts";

/** 検証済みの点数計算入力 */
export type ParsedInput = Readonly<{
  /** 和了牌を含む純手牌 */
  concealedTiles: readonly Tile[];
  melds: readonly Meld[];
  winTile: Tile;
  context: WinContext;
  dora: readonly Tile[];
  uraDora: readonly Tile[];
}>;

const MELD_TYPES: readonly MeldType[] = ["chi", "pon", "kan", "ankan"];
const WIN_TYPES: readonly WinType[] = ["tsumo", "ron"];
const WINDS: readonly Wind[] = ["ton", "nan", "sha", "pei"];
const ROUND_WINDS: readonly RoundWind[] = ["ton", "nan"];
const RIICHI_STATES: readonly RiichiState[] = ["none", "riichi", "double"];
const SITUATIONAL_YAKU: readonly SituationalYaku[] = [
  "haitei",
  "houtei",
  "rinshan",
  "chankan",
  "tenhou",
  "chihou",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

const parseTiles = (value: unknown): Tile[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const tiles: Tile[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }
    const tile = Tile.parse(item);
    if (tile === null) {
      return null;
    }
    tiles.push(tile);
  }
  return tiles;
};

const parseOptionalTiles = (value: unknown): Tile[] | null =>
  value === undefined ? [] : parseTiles(value);

const parseMelds = (value: unknown): Meld[] | null => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const melds: Meld[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isOneOf(item.type, MELD_TYPES)) {
      return null;
    }
    const tiles = parseTiles(item.tiles);
    if (tiles === null) {
      return null;
    }
    const meld = Meld.create(item.type, tiles);
    if (meld === null) {
      return null;
    }
    melds.push(meld);
  }
  return melds;
};

const parseSituational = (value: unknown): SituationalYaku[] | null => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const result: SituationalYaku[] = [];
  for (const item of value) {
    if (!isOneOf(item, SITUATIONAL_YAKU)) {
      return null;
    }
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
};

const parseNonNegativeInt = (value: unknown): number | null => {
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
};

const RED_SUITS: readonly TileSuit[] = ["m", "p", "s"];

/** 入力JSONを検証して点数計算入力に変換する。不正な入力は null */
export const parseCalcInput = (raw: unknown): ParsedInput | null => {
  if (!isRecord(raw)) {
    return null;
  }
  const hand = parseTiles(raw.hand);
  const melds = parseMelds(raw.melds);
  const winTile = typeof raw.winTile === "string" ? Tile.parse(raw.winTile) : null;
  const dora = parseOptionalTiles(raw.dora);
  const uraDora = parseOptionalTiles(raw.uraDora);
  const situational = parseSituational(raw.situational);
  const honba = parseNonNegativeInt(raw.honba);
  const kyotaku = parseNonNegativeInt(raw.kyotaku);
  const riichi: unknown = raw.riichi === undefined ? "none" : raw.riichi;
  const ippatsu: unknown = raw.ippatsu === undefined ? false : raw.ippatsu;

  if (
    hand === null ||
    melds === null ||
    winTile === null ||
    dora === null ||
    uraDora === null ||
    situational === null ||
    honba === null ||
    kyotaku === null ||
    melds.length > 4 ||
    !isOneOf(raw.winType, WIN_TYPES) ||
    !isOneOf(raw.seatWind, WINDS) ||
    !isOneOf(raw.roundWind, ROUND_WINDS) ||
    !isOneOf(riichi, RIICHI_STATES) ||
    typeof ippatsu !== "boolean"
  ) {
    return null;
  }
  const winType = raw.winType;
  const seatWind = raw.seatWind;
  const roundWind = raw.roundWind;

  // 純手牌の枚数: 和了牌込みで 14-3×副露数。和了牌が不足する13枚形式も補完して受理(assumptions A1)
  const expected = 14 - 3 * melds.length;
  const winKind = Tile.kindIndex(winTile);
  let concealedTiles = hand;
  if (hand.length === expected) {
    if (!hand.some((tile) => Tile.kindIndex(tile) === winKind)) {
      return null;
    }
  } else if (hand.length === expected - 1) {
    concealedTiles = [...hand, winTile];
  } else {
    return null;
  }

  const allTiles = [...concealedTiles, ...melds.flatMap((meld) => meld.tiles)];
  const counts = Tile.countsOf(allTiles);
  if (counts.some((count) => count > 4)) {
    return null;
  }
  for (const suit of RED_SUITS) {
    if (allTiles.filter((tile) => tile.suit === suit && tile.red).length > 1) {
      return null;
    }
  }

  const menzen = melds.every((meld) => !Meld.isOpen(meld));
  if (riichi !== "none" && !menzen) {
    return null;
  }
  if (ippatsu && riichi === "none") {
    return null;
  }

  // 状況役の整合性(assumptions A9)
  const has = (yaku: SituationalYaku): boolean => situational.includes(yaku);
  if (has("haitei") && winType !== "tsumo") {
    return null;
  }
  if (has("houtei") && winType !== "ron") {
    return null;
  }
  if (has("chankan") && winType !== "ron") {
    return null;
  }
  if (has("rinshan") && (winType !== "tsumo" || !melds.some((meld) => Meld.isKan(meld)))) {
    return null;
  }
  const firstTurnInvalid = (requiredDealer: boolean): boolean =>
    (seatWind === "ton") !== requiredDealer ||
    winType !== "tsumo" ||
    melds.length > 0 ||
    riichi !== "none" ||
    ippatsu;
  if (has("tenhou") && firstTurnInvalid(true)) {
    return null;
  }
  if (has("chihou") && firstTurnInvalid(false)) {
    return null;
  }

  const context: WinContext = {
    winType,
    seatWind,
    roundWind,
    riichi,
    ippatsu,
    situational,
    menzen,
    honba,
    kyotaku,
  };
  return {
    concealedTiles,
    melds,
    winTile,
    context,
    dora,
    // 裏ドラはリーチ時のみ有効(assumptions A7)
    uraDora: riichi === "none" ? [] : uraDora,
  };
};
