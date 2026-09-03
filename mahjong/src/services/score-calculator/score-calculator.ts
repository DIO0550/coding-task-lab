import { Fu } from "@/src/domains/fu";
import { Hand } from "@/src/domains/hand";
import { Score } from "@/src/domains/score";
import { ScoringInput } from "@/src/domains/scoring-input";
import { WinningShape } from "@/src/domains/winning-shape";
import { Yaku } from "@/src/domains/yaku";
import type { ScoringResult, ScoringRules } from "@/src/types/scoring";

/**
 * 点数計算のオーケストレーション。
 * 入力検証 → 和了形の列挙 → 解釈ごとに役・符・点数を求め、高点法で最も点数の高い解釈を採用する。
 */
type ValidResult = Extract<ScoringResult, { valid: true }>;

const DEFAULT_RULES: ScoringRules = { kuitan: true, atozuke: true };

const sumHan = (yaku: ValidResult["yaku"]): number => yaku.reduce((total, entry) => total + entry.han, 0);

const evaluate = (shape: WinningShape, hand: Hand, input: ScoringInput, rules: ScoringRules): ValidResult | undefined => {
  const yaku = Yaku.detect(shape, { hand, input, rules });
  if (yaku.length === 0) return undefined;
  const han = sumHan(yaku);
  const fu = Fu.calculate(shape, {
    hand,
    winType: input.winType,
    seatWind: input.seatWind,
    roundWind: input.roundWind,
    hasPinfu: yaku.some((entry) => entry.name === "pinfu"),
  });
  const score = Score.calculate({
    han,
    fu,
    isDealer: ScoringInput.isDealer(input),
    winType: input.winType,
    honba: input.honba,
    kyotaku: input.kyotaku,
  });
  return { valid: true, yaku, han, fu, score };
};

const compareByPoints = (a: ValidResult, b: ValidResult): number =>
  b.score.total - a.score.total || b.han - a.han || b.fu - a.fu;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const ScoreCalculator = {
  calculate(input: ScoringInput, rules: ScoringRules = DEFAULT_RULES): ScoringResult {
    const hand = Hand.create(ScoringInput.fullHand(input), input.melds);
    if (hand === undefined || !Hand.contains(hand, input.winTile)) return { valid: false, reason: "invalid_input" };
    const shapes = WinningShape.enumerate(hand, input.winTile, input.winType);
    if (shapes.length === 0) return { valid: false, reason: "not_winning_hand" };
    const candidates = shapes
      .map((shape) => evaluate(shape, hand, input, rules))
      .filter((candidate): candidate is ValidResult => candidate !== undefined);
    if (candidates.length === 0) return { valid: false, reason: "no_yaku" };
    return [...candidates].sort(compareByPoints)[0];
  },

  /** 未検証の JSON 値から計算する。契約に反する入力は invalid_input */
  calculateFromValue(value: unknown, rules: ScoringRules = DEFAULT_RULES): ScoringResult {
    const input = ScoringInput.parse(value);
    if (input === undefined) return { valid: false, reason: "invalid_input" };
    return ScoreCalculator.calculate(input, rules);
  },

  /** CLI 用: JSON 文字列から計算する */
  calculateFromJson(text: string, rules: ScoringRules = DEFAULT_RULES): ScoringResult {
    const value = parseJson(text);
    if (value === undefined) return { valid: false, reason: "invalid_input" };
    return ScoreCalculator.calculateFromValue(value, rules);
  },
} as const;
