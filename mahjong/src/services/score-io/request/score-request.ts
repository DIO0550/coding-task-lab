import { Hand } from "../../../domains/hand/index.ts";
import { Meld } from "../../../domains/meld/index.ts";
import type { MeldType } from "../../../domains/meld/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import { TileCounts } from "../../../domains/tile-counts/index.ts";
import { WinContext } from "../../../domains/win-context/index.ts";
import type {
  RiichiState,
  SituationalYaku,
  WinType,
} from "../../../domains/win-context/index.ts";
import { Wind } from "../../../domains/wind/index.ts";

/** 検証済みの点数計算リクエスト。 */
export type ScoreRequest = Readonly<{
  hand: Hand;
  context: WinContext;
}>;

/** 和了形として必要な牌の数(槓子も3枚分として数える)。 */
const WINNING_TILE_COUNT = 14;

const MELD_TYPES: readonly MeldType[] = ["chi", "pon", "kan", "ankan"];

type JsonRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asStringArray = (value: unknown): readonly string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.every((entry) => typeof entry === "string")
    ? (value as readonly string[])
    : null;
};

const parseTiles = (value: unknown): readonly Tile[] | null => {
  const codes = asStringArray(value);
  return codes === null ? null : Tile.fromCodes(codes);
};

const optionalTiles = (value: unknown): readonly Tile[] | null => {
  if (value === undefined) {
    return [];
  }
  return parseTiles(value);
};

const isRun = (tiles: readonly Tile[]): boolean => {
  const sorted = Tile.sort(tiles);
  return (
    sorted.length === 3 &&
    sorted.every((tile) => tile.suit === sorted[0].suit) &&
    !Tile.isHonor(sorted[0]) &&
    sorted[1].rank === sorted[0].rank + 1 &&
    sorted[2].rank === sorted[0].rank + 2
  );
};

const isSameKindGroup = (tiles: readonly Tile[], size: number): boolean =>
  tiles.length === size &&
  tiles.every((tile) => Tile.isSameKind(tile, tiles[0]));

const isValidMeldShape = (type: MeldType, tiles: readonly Tile[]): boolean => {
  if (type === "chi") {
    return isRun(tiles);
  }
  if (type === "pon") {
    return isSameKindGroup(tiles, 3);
  }
  return isSameKindGroup(tiles, 4);
};

const parseMeld = (value: unknown): Meld | null => {
  if (!isRecord(value)) {
    return null;
  }
  const type = value.type;
  if (typeof type !== "string" || !MELD_TYPES.includes(type as MeldType)) {
    return null;
  }
  const tiles = parseTiles(value.tiles);
  if (tiles === null || !isValidMeldShape(type as MeldType, tiles)) {
    return null;
  }
  if (type === "ankan") {
    return Meld.ankan(tiles);
  }
  if (type === "kan") {
    return Meld.minkan(tiles, null);
  }
  if (type === "pon") {
    return Meld.pon(tiles, null);
  }
  return Meld.chi(tiles, null);
};

const parseMelds = (value: unknown): readonly Meld[] | null => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const melds = value.map((entry) => parseMeld(entry));
  return melds.every((meld): meld is Meld => meld !== null) ? melds : null;
};

const parseSituational = (
  value: unknown,
): readonly SituationalYaku[] | null => {
  if (value === undefined) {
    return [];
  }
  const codes = asStringArray(value);
  if (codes === null) {
    return null;
  }
  return codes.every((code) => WinContext.isSituationalYaku(code))
    ? (codes as readonly SituationalYaku[])
    : null;
};

const parseCount = (value: unknown): number | null => {
  if (value === undefined) {
    return 0;
  }
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
};

const isWithinTileLimit = (hand: Hand): boolean =>
  TileCounts.isWithinDuplicateLimit(TileCounts.fromTiles(Hand.allTiles(hand)));

/**
 * 和了牌を含む形へ揃える。
 * 仕様の入力例は和了牌を含まない13枚形のため、13枚なら和了牌を補って受け付ける
 * (docs/assumptions.md 参照)。14枚形は和了牌が純手牌に含まれていることを要求する。
 */
const buildHand = (
  concealed: readonly Tile[],
  melds: readonly Meld[],
  winTile: Tile,
): Hand | null => {
  const total = concealed.length + melds.length * 3;
  if (total === WINNING_TILE_COUNT) {
    const hand = Hand.create(concealed, melds);
    return Hand.has(hand, winTile) ? hand : null;
  }
  if (total === WINNING_TILE_COUNT - 1) {
    return Hand.create([...concealed, winTile], melds);
  }
  return null;
};

export const ScoreRequest = {
  /** 入力JSONを検証して点数計算リクエストへ変換する。不正なら null。 */
  parse(value: unknown): ScoreRequest | null {
    if (!isRecord(value)) {
      return null;
    }
    const concealed = parseTiles(value.hand);
    const melds = parseMelds(value.melds);
    const winTileCode = value.winTile;
    const winTile =
      typeof winTileCode === "string" ? Tile.fromCode(winTileCode) : null;
    if (concealed === null || melds === null || winTile === null) {
      return null;
    }
    const hand = buildHand(concealed, melds, winTile);
    if (hand === null || !isWithinTileLimit(hand)) {
      return null;
    }

    const winType = value.winType;
    const seatWind = value.seatWind;
    const roundWind = value.roundWind;
    if (
      typeof winType !== "string" ||
      !WinContext.isWinType(winType) ||
      typeof seatWind !== "string" ||
      !Wind.isWind(seatWind) ||
      typeof roundWind !== "string" ||
      !WinContext.isRoundWind(roundWind)
    ) {
      return null;
    }

    const riichi = value.riichi ?? "none";
    if (typeof riichi !== "string" || !WinContext.isRiichiState(riichi)) {
      return null;
    }
    const ippatsu = value.ippatsu ?? false;
    if (typeof ippatsu !== "boolean") {
      return null;
    }

    const dora = optionalTiles(value.dora);
    const uraDora = optionalTiles(value.uraDora);
    const situational = parseSituational(value.situational);
    const honba = parseCount(value.honba);
    const riichiSticks = parseCount(value.riichiSticks);
    if (
      dora === null ||
      uraDora === null ||
      situational === null ||
      honba === null ||
      riichiSticks === null
    ) {
      return null;
    }

    return {
      hand,
      context: WinContext.create({
        winTile,
        winType: winType as WinType,
        seatWind,
        roundWind,
        dora,
        uraDora,
        riichi: riichi as RiichiState,
        ippatsu,
        situational,
        honba,
        riichiSticks,
      }),
    };
  },

  /** JSON文字列を検証して点数計算リクエストへ変換する。不正なら null。 */
  fromJson(text: string): ScoreRequest | null {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const parsed = ScoreRequest.tryParseJson(trimmed);
    return parsed === null ? null : ScoreRequest.parse(parsed);
  },

  /** JSONとして解釈できなければ null。 */
  tryParseJson(text: string): unknown {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  },
} as const;
