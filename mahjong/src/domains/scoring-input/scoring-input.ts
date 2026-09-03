import { Meld } from "@/src/domains/meld";
import { Tile } from "@/src/domains/tile";
import { Wind } from "@/src/domains/wind";
import type { RiichiStatus, SituationalFlag, WinType } from "@/src/types/scoring";

/**
 * 点数計算の入力。CLI の入力 JSON 契約(docs/spec-phase1.md)に `honba` / `kyotaku` を加えたもの。
 * `hand` は和了牌を含む純手牌、`dora` / `uraDora` は表示牌ではなくドラそのもの。
 */
export type ScoringInput = Readonly<{
  hand: readonly Tile[];
  melds: readonly Meld[];
  winTile: Tile;
  winType: WinType;
  seatWind: Wind;
  roundWind: Wind;
  dora: readonly Tile[];
  uraDora: readonly Tile[];
  riichi: RiichiStatus;
  ippatsu: boolean;
  situational: readonly SituationalFlag[];
  /** 本場数(省略時 0) */
  honba: number;
  /** 供託リーチ棒の本数(省略時 0) */
  kyotaku: number;
}>;

const WIN_TYPES: readonly WinType[] = ["tsumo", "ron"];
const RIICHI_STATUSES: readonly RiichiStatus[] = ["none", "riichi", "double"];
const SITUATIONAL_FLAGS: readonly SituationalFlag[] = ["haitei", "houtei", "rinshan", "chankan", "tenhou", "chihou"];

const parseEnum = <T extends string>(candidates: readonly T[], value: unknown): T | undefined =>
  candidates.find((candidate) => candidate === value);

const parseFlags = (value: unknown): readonly SituationalFlag[] | undefined => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return undefined;
  const flags = value.map((item) => parseEnum(SITUATIONAL_FLAGS, item));
  if (!flags.every((flag): flag is SituationalFlag => flag !== undefined)) return undefined;
  return [...new Set(flags)];
};

const parseCount = (value: unknown): number | undefined => {
  if (value === undefined) return 0;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
};

const parseTilesOrEmpty = (value: unknown): readonly Tile[] | undefined =>
  value === undefined ? [] : Tile.parseAll(value);

const parseBoolean = (value: unknown, fallback: boolean): boolean | undefined => {
  if (value === undefined) return fallback;
  return typeof value === "boolean" ? value : undefined;
};

export const ScoringInput = {
  /** JSON から解釈した入力。契約に反する値が1つでもあれば undefined */
  parse(value: unknown): ScoringInput | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    const raw = value as Record<string, unknown>;
    const hand = Tile.parseAll(raw.hand);
    const melds = raw.melds === undefined ? [] : Meld.parseAll(raw.melds);
    const winTile = Tile.parse(raw.winTile);
    const winType = parseEnum(WIN_TYPES, raw.winType);
    const seatWind = Wind.parse(raw.seatWind);
    const roundWind = Wind.parse(raw.roundWind);
    const dora = parseTilesOrEmpty(raw.dora);
    const uraDora = parseTilesOrEmpty(raw.uraDora);
    const riichi = raw.riichi === undefined ? "none" : parseEnum(RIICHI_STATUSES, raw.riichi);
    const ippatsu = parseBoolean(raw.ippatsu, false);
    const situational = parseFlags(raw.situational);
    const honba = parseCount(raw.honba);
    const kyotaku = parseCount(raw.kyotaku);
    if (
      hand === undefined ||
      melds === undefined ||
      winTile === undefined ||
      winType === undefined ||
      seatWind === undefined ||
      roundWind === undefined ||
      dora === undefined ||
      uraDora === undefined ||
      riichi === undefined ||
      ippatsu === undefined ||
      situational === undefined ||
      honba === undefined ||
      kyotaku === undefined
    ) {
      return undefined;
    }
    return { hand, melds, winTile, winType, seatWind, roundWind, dora, uraDora, riichi, ippatsu, situational, honba, kyotaku };
  },

  /**
   * 和了牌を含む14枚相当の純手牌。
   * 契約上 `hand` は和了牌を含むが、13枚相当(和了牌を含めていない形)で渡された場合は和了牌を末尾に補う。
   */
  fullHand(input: ScoringInput): readonly Tile[] {
    const occupied = input.hand.length + input.melds.length * 3;
    return occupied === 13 ? [...input.hand, input.winTile] : input.hand;
  },

  isDealer(input: ScoringInput): boolean {
    return input.seatWind === "ton";
  },

  isMenzen(input: ScoringInput): boolean {
    return input.melds.every((meld) => !Meld.isOpen(meld));
  },

  has(input: ScoringInput, flag: SituationalFlag): boolean {
    return input.situational.includes(flag);
  },
} as const;
