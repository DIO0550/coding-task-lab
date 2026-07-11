import { Tile } from "../tile/index.ts";
import { Meld } from "../meld/index.ts";
import { Hand } from "../hand/index.ts";

export type Wind = "ton" | "nan" | "sha" | "pei";

export type WinType = "tsumo" | "ron";

export type RiichiState = "none" | "riichi" | "double";

export type Situational =
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "tenhou"
  | "chihou";

/** 検証済みの点数計算リクエスト。concealed は winTile 込みの完成面前手 */
export type ScoreRequest = Readonly<{
  concealed: readonly Tile[];
  melds: readonly Meld[];
  winTile: Tile;
  winType: WinType;
  seatWind: Wind;
  roundWind: Wind;
  dora: readonly Tile[];
  uraDora: readonly Tile[];
  riichi: RiichiState;
  ippatsu: boolean;
  situational: readonly Situational[];
}>;

const SEAT_WINDS: readonly Wind[] = ["ton", "nan", "sha", "pei"];

const ROUND_WINDS: readonly Wind[] = ["ton", "nan"];

const WIN_TYPES: readonly WinType[] = ["tsumo", "ron"];

const RIICHI_STATES: readonly RiichiState[] = ["none", "riichi", "double"];

const SITUATIONAL_VALUES: readonly Situational[] = [
  "haitei",
  "houtei",
  "rinshan",
  "chankan",
  "tenhou",
  "chihou",
];

const MAX_TILES_PER_KIND = 4;

const getProperty = (value: object, key: string): unknown =>
  (value as Record<string, unknown>)[key];

const parseEnumValue = <T extends string>(
  raw: unknown,
  allowed: readonly T[],
): T | null =>
  typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : null;

const parseTileArray = (raw: unknown): readonly Tile[] | null => {
  if (!Array.isArray(raw)) {
    return null;
  }
  const tiles: Tile[] = [];
  for (const item of raw) {
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

/** dora/uraDora は省略可(省略時は空配列) */
const parseOptionalTileArray = (raw: unknown): readonly Tile[] | null =>
  raw === undefined ? [] : parseTileArray(raw);

const parseMelds = (raw: unknown): readonly Meld[] | null => {
  if (!Array.isArray(raw)) {
    return null;
  }
  const melds: Meld[] = [];
  for (const item of raw) {
    const meld = Meld.parse(item);
    if (meld === null) {
      return null;
    }
    melds.push(meld);
  }
  return melds;
};

const parseSituational = (raw: unknown): readonly Situational[] | null => {
  if (!Array.isArray(raw)) {
    return null;
  }
  const items: Situational[] = [];
  for (const item of raw) {
    const parsed = parseEnumValue(item, SITUATIONAL_VALUES);
    if (parsed === null) {
      return null;
    }
    items.push(parsed);
  }
  return items;
};

/** 完成手+副露で同一牌種が4枚を超えていないか */
const hasKindOverflow = (
  concealed: readonly Tile[],
  melds: readonly Meld[],
): boolean => {
  const totals = new Map<string, number>();
  for (const tile of [...concealed, ...melds.flatMap((meld) => meld.tiles)]) {
    const key = Tile.key(tile);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  return [...totals.values()].some((count) => count > MAX_TILES_PER_KIND);
};

export const ScoreRequest = {
  /**
   * 生JSON(JSON.parse 済みの unknown)を検証して ScoreRequest を返す。
   * hand は和了牌込み(14枚相当)/和了牌抜き(13枚相当)の両方を受理し、
   * 後者は winTile を補完する。牌表記・enum・枚数・winTile 不在・型の
   * いずれかが不正なら null(呼び出し側で invalid_input 扱い)
   */
  parse(raw: unknown): ScoreRequest | null {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return null;
    }
    const handTiles = parseTileArray(getProperty(raw, "hand"));
    if (handTiles === null) {
      return null;
    }
    const melds = parseMelds(getProperty(raw, "melds"));
    if (melds === null) {
      return null;
    }
    const winTileRaw = getProperty(raw, "winTile");
    const winTile =
      typeof winTileRaw === "string" ? Tile.parse(winTileRaw) : null;
    if (winTile === null) {
      return null;
    }
    const winType = parseEnumValue(getProperty(raw, "winType"), WIN_TYPES);
    const seatWind = parseEnumValue(getProperty(raw, "seatWind"), SEAT_WINDS);
    const roundWind = parseEnumValue(
      getProperty(raw, "roundWind"),
      ROUND_WINDS,
    );
    const riichi = parseEnumValue(getProperty(raw, "riichi"), RIICHI_STATES);
    if (
      winType === null ||
      seatWind === null ||
      roundWind === null ||
      riichi === null
    ) {
      return null;
    }
    const ippatsu = getProperty(raw, "ippatsu");
    if (typeof ippatsu !== "boolean") {
      return null;
    }
    const situational = parseSituational(getProperty(raw, "situational"));
    if (situational === null) {
      return null;
    }
    const dora = parseOptionalTileArray(getProperty(raw, "dora"));
    const uraDora = parseOptionalTileArray(getProperty(raw, "uraDora"));
    if (dora === null || uraDora === null) {
      return null;
    }
    const concealed = Hand.completeConcealed(handTiles, melds.length, winTile);
    if (concealed === null) {
      return null;
    }
    if (!concealed.some((tile) => Tile.equals(tile, winTile))) {
      return null;
    }
    if (hasKindOverflow(concealed, melds)) {
      return null;
    }
    return {
      concealed,
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
    };
  },
} as const;
