import { Tile, type WindTile } from "@/src/domains/tile";
import { Meld } from "@/src/domains/meld";
import { Hand } from "@/src/domains/hand";
import {
  Yaku,
  type Situational,
  type WinContext,
  type YakuHit,
  type YakumanHit,
} from "@/src/domains/yaku";
import { Fu } from "@/src/domains/fu";
import { Score } from "@/src/domains/score";

export type RiichiState = "none" | "riichi" | "double";

export type WinType = "tsumo" | "ron";

export type ScoringInput = Readonly<{
  hand: readonly Tile[];
  melds: readonly Meld[];
  winTile: Tile;
  winType: WinType;
  seatWind: WindTile;
  roundWind: "ton" | "nan";
  dora: readonly Tile[];
  uraDora: readonly Tile[];
  riichi: RiichiState;
  ippatsu: boolean;
  situational: readonly Situational[];
  honba: number;
  kyotaku: number;
  kuitan: boolean;
}>;

export type ScoringYakuEntry = Readonly<{ name: string; han: number }>;

export type ScoringFailureReason =
  | "no_yaku"
  | "not_winning_hand"
  | "invalid_input";

export type Scoring =
  | Readonly<{
      valid: true;
      yaku: readonly ScoringYakuEntry[];
      han: number;
      fu: number;
      score: Score;
    }>
  | Readonly<{ valid: false; reason: ScoringFailureReason }>;

const invalid = (): Scoring => ({ valid: false, reason: "invalid_input" });

/**
 * 純手牌が1枚不足している(和了牌が含まれていない)入力を許容し、
 * 和了牌を補って正規化する。仕様の入力例が13枚形のため両形式を受け付ける。
 */
const normalizeInput = (input: ScoringInput): ScoringInput => {
  if (input.hand.length === 13 - 3 * input.melds.length) {
    return { ...input, hand: [...input.hand, input.winTile] };
  }
  return input;
};

const validateInput = (input: ScoringInput): boolean => {
  if (input.melds.length > 4) {
    return false;
  }
  if (input.hand.length !== 14 - 3 * input.melds.length) {
    return false;
  }
  if (!input.melds.every(Meld.isValid)) {
    return false;
  }
  if (!input.hand.includes(input.winTile)) {
    return false;
  }

  const allTiles = [...input.hand, ...input.melds.flatMap((m) => m.tiles)];
  const counts = Tile.toCounts(allTiles);
  if (counts.some((count) => count > 4)) {
    return false;
  }
  const redCounts = allTiles.filter(Tile.isRed);
  const redPerSuit = new Map<string, number>();
  for (const red of redCounts) {
    const suit = Tile.suitOf(red) as string;
    redPerSuit.set(suit, (redPerSuit.get(suit) ?? 0) + 1);
  }
  if ([...redPerSuit.values()].some((count) => count > 1)) {
    return false;
  }

  const menzen = input.melds.every((meld) => !Meld.isOpen(meld));
  if (input.riichi !== "none" && !menzen) {
    return false;
  }
  if (input.ippatsu && input.riichi === "none") {
    return false;
  }

  const has = (s: Situational): boolean => input.situational.includes(s);
  if (has("haitei") && input.winType !== "tsumo") {
    return false;
  }
  if (has("rinshan") && input.winType !== "tsumo") {
    return false;
  }
  if (has("houtei") && input.winType !== "ron") {
    return false;
  }
  if (has("chankan") && input.winType !== "ron") {
    return false;
  }
  if (has("tenhou")) {
    if (
      input.seatWind !== "ton" ||
      input.winType !== "tsumo" ||
      input.riichi !== "none" ||
      input.ippatsu ||
      input.melds.length > 0
    ) {
      return false;
    }
  }
  if (has("chihou")) {
    if (
      input.seatWind === "ton" ||
      input.winType !== "tsumo" ||
      input.riichi !== "none" ||
      input.ippatsu ||
      input.melds.length > 0
    ) {
      return false;
    }
  }
  if (input.honba < 0 || input.kyotaku < 0) {
    return false;
  }
  return true;
};

const countDoraMatches = (
  tiles: readonly Tile[],
  doraTiles: readonly Tile[],
): number => {
  const doraIndexes = doraTiles.map(Tile.toIndex);
  return tiles.reduce(
    (sum, tile) =>
      sum + doraIndexes.filter((d) => d === Tile.toIndex(tile)).length,
    0,
  );
};

type Candidate = Readonly<{
  yaku: readonly ScoringYakuEntry[];
  han: number;
  fu: number;
  score: Score;
}>;

const buildYakumanCandidate = (
  yakuman: readonly YakumanHit[],
  fu: number,
  input: ScoringInput,
): Candidate => {
  const rawUnits = yakuman.reduce((sum, hit) => sum + hit.units, 0);
  const units = Math.min(rawUnits, 2);
  const han = 13 * units;
  const score = Score.calculate({
    han,
    fu,
    yakumanUnits: units,
    isDealer: input.seatWind === "ton",
    winType: input.winType,
    honba: input.honba,
    kyotaku: input.kyotaku,
  });
  return {
    yaku: yakuman.map((hit) => ({ name: hit.name, han: 13 * hit.units })),
    han,
    fu,
    score,
  };
};

const buildNormalCandidate = (
  yaku: readonly YakuHit[],
  fu: number,
  doraEntries: readonly ScoringYakuEntry[],
  input: ScoringInput,
): Candidate => {
  const entries = [...yaku, ...doraEntries];
  const han = entries.reduce((sum, entry) => sum + entry.han, 0);
  const score = Score.calculate({
    han,
    fu,
    yakumanUnits: 0,
    isDealer: input.seatWind === "ton",
    winType: input.winType,
    honba: input.honba,
    kyotaku: input.kyotaku,
  });
  return { yaku: entries, han, fu, score };
};

const isBetter = (a: Candidate, b: Candidate): boolean => {
  if (a.score.total !== b.score.total) {
    return a.score.total > b.score.total;
  }
  if (a.han !== b.han) {
    return a.han > b.han;
  }
  return a.fu > b.fu;
};

export const Scoring = {
  /** 和了の点数計算。高点法により最も点数の高い解釈を採用する */
  calculate(rawInput: ScoringInput): Scoring {
    const input = normalizeInput(rawInput);
    if (!validateInput(input)) {
      return invalid();
    }

    const hand = Hand.create(input.hand, input.melds);
    const interpretations = Hand.decompose(hand, input.winTile, input.winType);
    if (interpretations.length === 0) {
      return { valid: false, reason: "not_winning_hand" };
    }

    const allTiles = [
      ...input.hand,
      ...input.melds.flatMap((meld) => meld.tiles),
    ];
    const ctx: WinContext = {
      winType: input.winType,
      seatWind: Tile.toIndex(input.seatWind),
      roundWind: Tile.toIndex(input.roundWind),
      menzen: Hand.isMenzen(hand),
      riichi: input.riichi,
      ippatsu: input.ippatsu,
      situational: input.situational,
      winTile: Tile.toIndex(input.winTile),
      allTiles,
      kuitan: input.kuitan,
    };

    const doraEntries: ScoringYakuEntry[] = [];
    const doraCount = countDoraMatches(allTiles, input.dora);
    if (doraCount > 0) {
      doraEntries.push({ name: "dora", han: doraCount });
    }
    if (input.riichi !== "none") {
      const uraCount = countDoraMatches(allTiles, input.uraDora);
      if (uraCount > 0) {
        doraEntries.push({ name: "ura_dora", han: uraCount });
      }
    }
    const akaCount = allTiles.filter(Tile.isRed).length;
    if (akaCount > 0) {
      doraEntries.push({ name: "aka_dora", han: akaCount });
    }

    const candidates = interpretations.flatMap((interp): Candidate[] => {
      const detected = Yaku.detect(interp, ctx);
      const fu = Fu.calculate(interp, ctx);
      if (detected.yakuman.length > 0) {
        return [buildYakumanCandidate(detected.yakuman, fu, input)];
      }
      if (detected.yaku.length === 0) {
        return [];
      }
      return [buildNormalCandidate(detected.yaku, fu, doraEntries, input)];
    });

    if (candidates.length === 0) {
      return { valid: false, reason: "no_yaku" };
    }

    const best = candidates.reduce((a, b) => (isBetter(b, a) ? b : a));
    return { valid: true, ...best };
  },
} as const;
