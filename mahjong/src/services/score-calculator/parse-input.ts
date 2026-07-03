import { Tile, type WindTile } from "@/src/domains/tile";
import type { Meld, MeldType } from "@/src/domains/meld";
import type {
  RiichiState,
  ScoringInput,
  WinType,
} from "@/src/domains/scoring";
import type { Situational } from "@/src/domains/yaku";

const MELD_TYPES: readonly MeldType[] = ["chi", "pon", "kan", "ankan"];
const WIN_TYPES: readonly WinType[] = ["tsumo", "ron"];
const SEAT_WINDS: readonly WindTile[] = ["ton", "nan", "sha", "pei"];
const ROUND_WINDS: readonly ("ton" | "nan")[] = ["ton", "nan"];
const RIICHI_STATES: readonly RiichiState[] = ["none", "riichi", "double"];
const SITUATIONAL: readonly Situational[] = [
  "haitei",
  "houtei",
  "rinshan",
  "chankan",
  "tenhou",
  "chihou",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseTileArray = (value: unknown): readonly Tile[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const tiles: Tile[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !Tile.isTile(item)) {
      return null;
    }
    tiles.push(item);
  }
  return tiles;
};

const parseMelds = (value: unknown): readonly Meld[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const melds: Meld[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }
    const type = item.type;
    if (typeof type !== "string" || !MELD_TYPES.includes(type as MeldType)) {
      return null;
    }
    const tiles = parseTileArray(item.tiles);
    if (tiles === null) {
      return null;
    }
    melds.push({ type: type as MeldType, tiles });
  }
  return melds;
};

const parseSituational = (value: unknown): readonly Situational[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const items: Situational[] = [];
  for (const item of value) {
    if (
      typeof item !== "string" ||
      !SITUATIONAL.includes(item as Situational)
    ) {
      return null;
    }
    items.push(item as Situational);
  }
  return items;
};

const parseOneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null =>
  typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;

const parseOptionalCount = (value: unknown): number | null => {
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
};

/** 入力JSON(unknown)を検証して ScoringInput へ変換する。不正なら null */
export const parseScoringInput = (value: unknown): ScoringInput | null => {
  if (!isRecord(value)) {
    return null;
  }

  const hand = parseTileArray(value.hand);
  const melds = parseMelds(value.melds);
  const winTile =
    typeof value.winTile === "string" && Tile.isTile(value.winTile)
      ? value.winTile
      : null;
  const winType = parseOneOf(value.winType, WIN_TYPES);
  const seatWind = parseOneOf(value.seatWind, SEAT_WINDS);
  const roundWind = parseOneOf(value.roundWind, ROUND_WINDS);
  const dora = parseTileArray(value.dora);
  const uraDora = parseTileArray(value.uraDora);
  const riichi = parseOneOf(value.riichi, RIICHI_STATES);
  const ippatsu = typeof value.ippatsu === "boolean" ? value.ippatsu : null;
  const situational = parseSituational(value.situational);
  const honba = parseOptionalCount(value.honba);
  const kyotaku = parseOptionalCount(value.kyotaku);

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
    ippatsu === null ||
    situational === null ||
    honba === null ||
    kyotaku === null
  ) {
    return null;
  }

  return {
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
    kuitan: true,
  };
};
