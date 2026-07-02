import { Tile } from "../../domains/tile/index.ts";
import type { Wind } from "../../domains/tile/index.ts";
import { Meld } from "../../domains/meld/index.ts";
import type { MeldType } from "../../domains/meld/index.ts";
import type { WinContext } from "../../domains/win-context/index.ts";
import type {
  RiichiType,
  Situational,
  WinType,
} from "../../domains/win-context/index.ts";

/** 入力JSONの検証済み表現。concealedTiles は和了牌を含む完成形 */
export type ParsedInput = Readonly<{
  concealedTiles: ReadonlyArray<Tile>;
  melds: ReadonlyArray<Meld>;
  allTiles: ReadonlyArray<Tile>;
  context: WinContext;
}>;

const SEAT_WINDS: ReadonlyArray<string> = ["ton", "nan", "sha", "pei"];
const ROUND_WINDS: ReadonlyArray<string> = ["ton", "nan"];
const WIN_TYPES: ReadonlyArray<string> = ["tsumo", "ron"];
const RIICHI_TYPES: ReadonlyArray<string> = ["none", "riichi", "double"];
const MELD_TYPES: ReadonlyArray<string> = ["chi", "pon", "kan", "ankan"];
const SITUATIONALS: ReadonlyArray<string> = [
  "haitei",
  "houtei",
  "rinshan",
  "chankan",
  "tenhou",
  "chihou",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseTileText = (value: unknown): Tile | null =>
  typeof value === "string" ? Tile.parse(value) : null;

const parseTileList = (value: unknown): ReadonlyArray<Tile> | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const tiles: Tile[] = [];
  for (const entry of value) {
    const tile = parseTileText(entry);
    if (tile === null) {
      return null;
    }
    tiles.push(tile);
  }
  return tiles;
};

const parseMelds = (value: unknown): ReadonlyArray<Meld> | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const melds: Meld[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }
    const type = parseEnum<MeldType>(entry["type"], MELD_TYPES);
    if (type === null) {
      return null;
    }
    const tiles = parseTileList(entry["tiles"]);
    if (tiles === null) {
      return null;
    }
    const meld = Meld.create(type, tiles);
    if (meld === null) {
      return null;
    }
    melds.push(meld);
  }
  return melds;
};

const parseEnum = <T extends string>(
  value: unknown,
  allowed: ReadonlyArray<string>,
): T | null =>
  typeof value === "string" && allowed.includes(value) ? (value as T) : null;

const parseCount = (value: unknown): number | null => {
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
};

const parseSituational = (
  value: unknown,
): ReadonlyArray<Situational> | null => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const entries: Situational[] = [];
  for (const entry of value) {
    const parsed = parseEnum<Situational>(entry, SITUATIONALS);
    if (parsed === null) {
      return null;
    }
    if (!entries.includes(parsed)) {
      entries.push(parsed);
    }
  }
  return entries;
};

/** 物理的にありえない牌構成(同種5枚以上・同色赤5が2枚以上)を検出する */
const hasImpossibleTileCounts = (tiles: ReadonlyArray<Tile>): boolean => {
  const counts = Tile.toCounts(tiles);
  if (counts.some((count) => count > 4)) {
    return true;
  }
  const redCounts = { m: 0, p: 0, s: 0, z: 0 };
  for (const tile of tiles) {
    if (tile.red) {
      redCounts[tile.suit] += 1;
    }
  }
  return Object.values(redCounts).some((count) => count > 1);
};

const isConsistentSituational = (
  situational: ReadonlyArray<Situational>,
  winType: WinType,
  seatWind: Wind,
  melds: ReadonlyArray<Meld>,
  riichi: RiichiType,
  ippatsu: boolean,
): boolean => {
  const has = (entry: Situational): boolean => situational.includes(entry);
  if (has("haitei") && winType !== "tsumo") {
    return false;
  }
  if (has("houtei") && winType !== "ron") {
    return false;
  }
  if (has("rinshan")) {
    if (winType !== "tsumo" || !melds.some(Meld.isKan) || ippatsu) {
      return false;
    }
    if (has("haitei")) {
      return false;
    }
  }
  if (has("chankan")) {
    if (winType !== "ron" || has("houtei")) {
      return false;
    }
  }
  if (has("tenhou") || has("chihou")) {
    if (situational.length !== 1) {
      return false;
    }
    if (winType !== "tsumo" || melds.length > 0) {
      return false;
    }
    if (riichi !== "none" || ippatsu) {
      return false;
    }
    if (has("tenhou") && seatWind !== "ton") {
      return false;
    }
    if (has("chihou") && seatWind === "ton") {
      return false;
    }
  }
  return true;
};

/**
 * 入力JSON(unknown)を検証して正規化する。不正なら null。
 * hand は「和了牌を含む形」と「和了牌を含まない形」の両方を受理する
 * (docs/assumptions.md §1)。
 */
export const parseInput = (input: unknown): ParsedInput | null => {
  if (!isRecord(input)) {
    return null;
  }

  const hand = parseTileList(input["hand"]);
  const melds = input["melds"] === undefined ? [] : parseMelds(input["melds"]);
  const winTile = parseTileText(input["winTile"]);
  const winType = parseEnum<WinType>(input["winType"], WIN_TYPES);
  const seatWind = parseEnum<Wind>(input["seatWind"], SEAT_WINDS);
  const roundWind = parseEnum<Wind>(input["roundWind"], ROUND_WINDS);
  const dora =
    input["dora"] === undefined ? [] : parseTileList(input["dora"]);
  const uraDora =
    input["uraDora"] === undefined ? [] : parseTileList(input["uraDora"]);
  const riichi =
    input["riichi"] === undefined
      ? "none"
      : parseEnum<RiichiType>(input["riichi"], RIICHI_TYPES);
  const ippatsu = input["ippatsu"] === undefined ? false : input["ippatsu"];
  const situational = parseSituational(input["situational"]);
  const honba = parseCount(input["honba"]);
  const kyotaku = parseCount(input["kyotaku"]);

  if (
    hand === null ||
    melds === null ||
    winTile === null ||
    winType === null ||
    seatWind === null ||
    roundWind === null ||
    dora === null ||
    uraDora === null ||
    riichi === null ||
    typeof ippatsu !== "boolean" ||
    situational === null ||
    honba === null ||
    kyotaku === null
  ) {
    return null;
  }

  const fullSize = 14 - melds.length * 3;
  if (fullSize < 2) {
    return null;
  }
  const winIndex = Tile.index(winTile);
  let concealedTiles: ReadonlyArray<Tile>;
  if (hand.length === fullSize) {
    if (!hand.some((tile) => Tile.index(tile) === winIndex)) {
      return null;
    }
    concealedTiles = hand;
  } else if (hand.length === fullSize - 1) {
    concealedTiles = [...hand, winTile];
  } else {
    return null;
  }

  const allTiles = [...concealedTiles, ...melds.flatMap((meld) => meld.tiles)];
  if (hasImpossibleTileCounts(allTiles)) {
    return null;
  }

  if (riichi !== "none" && melds.some(Meld.isOpen)) {
    return null;
  }
  if (ippatsu && riichi === "none") {
    return null;
  }
  if (
    !isConsistentSituational(
      situational,
      winType,
      seatWind,
      melds,
      riichi,
      ippatsu,
    )
  ) {
    return null;
  }

  return {
    concealedTiles,
    melds,
    allTiles,
    context: {
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
    },
  };
};
