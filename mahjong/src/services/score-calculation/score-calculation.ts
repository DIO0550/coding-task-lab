import { Tile } from "../../domains/tile/index.ts";
import { Hand } from "../../domains/hand/index.ts";
import type { WinningHand } from "../../domains/hand/index.ts";
import { WinContext } from "../../domains/win-context/index.ts";
import { Yaku } from "../../domains/yaku/index.ts";
import type { YakuHit, YakuName } from "../../domains/yaku/index.ts";
import { Fu } from "../../domains/fu/index.ts";
import { Score } from "../../domains/score/index.ts";
import type { ScoreResult } from "../../domains/score/index.ts";
import { parseInput } from "./parse-input.ts";
import type { ParsedInput } from "./parse-input.ts";

export type CalcYaku = Readonly<{ name: YakuName; han: number }>;

export type CalcSuccess = Readonly<{
  valid: true;
  yaku: ReadonlyArray<CalcYaku>;
  han: number;
  fu: number;
  score: ScoreResult;
}>;

export type CalcFailureReason = "no_yaku" | "not_winning_hand" | "invalid_input";

export type CalcFailure = Readonly<{
  valid: false;
  reason: CalcFailureReason;
}>;

export type CalcResult = CalcSuccess | CalcFailure;

const YAKUMAN_HAN_PER_UNIT = 13;

const countMatches = (
  tiles: ReadonlyArray<Tile>,
  targets: ReadonlyArray<Tile>,
): number =>
  targets.reduce(
    (sum, target) =>
      sum +
      tiles.filter((tile) => Tile.index(tile) === Tile.index(target)).length,
    0,
  );

/** ドラ・裏ドラ・赤ドラの追加翻(役ではないため役があるときのみ加算される) */
const doraHits = (parsed: ParsedInput): ReadonlyArray<YakuHit> => {
  const hits: YakuHit[] = [];
  const dora = countMatches(parsed.allTiles, parsed.context.dora);
  if (dora > 0) {
    hits.push({ name: "dora", han: dora });
  }
  if (WinContext.isRiichi(parsed.context)) {
    const uraDora = countMatches(parsed.allTiles, parsed.context.uraDora);
    if (uraDora > 0) {
      hits.push({ name: "ura_dora", han: uraDora });
    }
  }
  const akaDora = parsed.allTiles.filter((tile) => tile.red).length;
  if (akaDora > 0) {
    hits.push({ name: "aka_dora", han: akaDora });
  }
  return hits;
};

type Candidate = Readonly<{
  yaku: ReadonlyArray<CalcYaku>;
  han: number;
  fu: number;
  score: ScoreResult;
}>;

const buildCandidate = (
  win: WinningHand,
  parsed: ParsedInput,
  dora: ReadonlyArray<YakuHit>,
): Candidate | null => {
  const context = parsed.context;
  const detection = Yaku.detect(win, context);
  if (detection.hits.length === 0) {
    return null;
  }
  const fu = Fu.calculate(win, context);
  const isYakuman = detection.yakumanUnits > 0;
  const yaku = isYakuman ? detection.hits : [...detection.hits, ...dora];
  const han = isYakuman
    ? detection.yakumanUnits * YAKUMAN_HAN_PER_UNIT
    : yaku.reduce((sum, hit) => sum + hit.han, 0);
  const score = Score.calculate({
    han,
    fu,
    yakumanUnits: detection.yakumanUnits,
    dealer: WinContext.isDealer(context),
    winType: context.winType,
    honba: context.honba,
    kyotaku: context.kyotaku,
  });
  return { yaku, han, fu, score };
};

/** 高点法: 点数合計 → 翻 → 符 の優先順で最大の解釈を選ぶ */
const pickBest = (candidates: ReadonlyArray<Candidate>): Candidate =>
  candidates.reduce((best, candidate) => {
    if (candidate.score.total !== best.score.total) {
      return candidate.score.total > best.score.total ? candidate : best;
    }
    if (candidate.han !== best.han) {
      return candidate.han > best.han ? candidate : best;
    }
    return candidate.fu > best.fu ? candidate : best;
  });

export const ScoreCalculation = {
  /** 入力JSON(パース済み unknown 値)から点数計算結果を返す */
  calculate(input: unknown): CalcResult {
    const parsed = parseInput(input);
    if (parsed === null) {
      return { valid: false, reason: "invalid_input" };
    }

    const wins = Hand.enumerateWinningHands(
      parsed.concealedTiles,
      parsed.melds,
      parsed.context.winTile,
    );
    if (wins.length === 0) {
      return { valid: false, reason: "not_winning_hand" };
    }

    const dora = doraHits(parsed);
    const candidates = wins
      .map((win) => buildCandidate(win, parsed, dora))
      .filter((candidate): candidate is Candidate => candidate !== null);
    if (candidates.length === 0) {
      return { valid: false, reason: "no_yaku" };
    }

    const best = pickBest(candidates);
    return {
      valid: true,
      yaku: best.yaku,
      han: best.han,
      fu: best.fu,
      score: best.score,
    };
  },
} as const;
