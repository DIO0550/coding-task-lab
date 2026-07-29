import { Block } from "../../domains/block/index.ts";
import { Hand } from "../../domains/hand/index.ts";
import { Score } from "../../domains/score/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import { Wait } from "../../domains/wait/index.ts";
import { WinContext } from "../../domains/win-context/index.ts";
import type { WinningFormKind } from "../../domains/winning-form/index.ts";
import { WinningHand } from "../../domains/winning-hand/index.ts";
import { Yaku, YAKUMAN_HAN } from "../../domains/yaku/index.ts";
import type { YakuName } from "../../domains/yaku/index.ts";
import { FuCalculation } from "./fu/index.ts";
import { YakuDetection } from "./yaku/index.ts";

/** 点数計算の結果。 */
export type ScoreResult = Readonly<{
  yaku: readonly Yaku[];
  han: number;
  fu: number;
  score: Score;
  form: WinningFormKind;
  wait: Wait;
}>;

/** 点数計算の結果、または和了不成立の理由。 */
export type ScoreOutcome =
  | Readonly<{ type: "scored"; result: ScoreResult }>
  | Readonly<{ type: "no_yaku" }>
  | Readonly<{ type: "not_winning_hand" }>;

/** ルール設定のうち、役の成立可否に影響するもの。 */
export type ScoreOptions = Readonly<{
  kuitan: boolean;
  atozuke: boolean;
}>;

const DEFAULT_OPTIONS: ScoreOptions = { kuitan: true, atozuke: true };

/** 役満の複合上限(ダブル役満まで)。 */
const MAX_YAKUMAN_MULTIPLIER = 2;

const YAKUHAI_NAMES: readonly YakuName[] = [
  "yakuhai_haku",
  "yakuhai_hatsu",
  "yakuhai_chun",
  "yakuhai_round_wind",
  "yakuhai_seat_wind",
];

/** 和了牌を含むブロックごとに、待ちの取り方を変えた解釈を列挙する。 */
const interpretations = (
  hand: Hand,
  context: WinContext,
): readonly WinningHand[] =>
  Hand.winningForms(hand).flatMap((form) => {
    if (form.kind === "thirteen_orphans") {
      return [WinningHand.create(hand, form, -1, "tanki", context)];
    }
    return form.blocks.flatMap((block, index) => {
      const wait = Wait.of(block, context.winTile);
      return wait === null
        ? []
        : [WinningHand.create(hand, form, index, wait, context)];
    });
  });

const countDora = (
  tiles: readonly Tile[],
  dora: readonly Tile[],
): number =>
  dora.reduce(
    (sum, target) =>
      sum + tiles.filter((tile) => Tile.isSameKind(tile, target)).length,
    0,
  );

const doraYaku = (winningHand: WinningHand): readonly Yaku[] => {
  const tiles = WinningHand.allTiles(winningHand);
  const { context } = winningHand;
  const dora = countDora(tiles, context.dora);
  const ura = WinContext.isRiichi(context)
    ? countDora(tiles, context.uraDora)
    : 0;
  const aka = tiles.filter((tile) => tile.red).length;
  return [
    ...(dora > 0 ? [Yaku.dora("dora", dora)] : []),
    ...(ura > 0 ? [Yaku.dora("ura_dora", ura)] : []),
    ...(aka > 0 ? [Yaku.dora("aka_dora", aka)] : []),
  ];
};

const yakumanMultiplierOf = (yaku: readonly Yaku[]): number =>
  Math.min(
    MAX_YAKUMAN_MULTIPLIER,
    yaku.reduce((sum, entry) => sum + Yaku.yakumanMultiplier(entry.name), 0),
  );

/** 喰いタンなしの場合、副露手のタンヤオを取り除く。 */
const applyKuitan = (
  yaku: readonly Yaku[],
  menzen: boolean,
  options: ScoreOptions,
): readonly Yaku[] =>
  options.kuitan || menzen
    ? yaku
    : yaku.filter((entry) => entry.name !== "tanyao");

/**
 * 後付けなしの場合に和了を認めない形か。
 * 副露手で、成立役が役牌のみ、かつ和了牌がその役牌の刻子を完成させた場合とする。
 */
const isRejectedByAtozuke = (
  winningHand: WinningHand,
  yaku: readonly Yaku[],
  options: ScoreOptions,
): boolean => {
  if (options.atozuke || WinningHand.isMenzen(winningHand)) {
    return false;
  }
  if (!yaku.every((entry) => YAKUHAI_NAMES.includes(entry.name))) {
    return false;
  }
  const block = WinningHand.winBlock(winningHand);
  return block !== null && Block.isTripletLike(block);
};

const evaluate = (
  winningHand: WinningHand,
  options: ScoreOptions,
): ScoreResult | null => {
  const menzen = WinningHand.isMenzen(winningHand);
  const detected = applyKuitan(
    YakuDetection.detect(winningHand),
    menzen,
    options,
  );
  if (detected.length === 0) {
    return null;
  }
  if (isRejectedByAtozuke(winningHand, detected, options)) {
    return null;
  }

  const multiplier = yakumanMultiplierOf(detected);
  const yaku =
    multiplier > 0 ? detected : [...detected, ...doraYaku(winningHand)];
  const han = multiplier > 0 ? YAKUMAN_HAN * multiplier : Yaku.totalHan(yaku);
  const fu = FuCalculation.of(
    winningHand,
    detected.some((entry) => entry.name === "pinfu"),
  );
  const { context } = winningHand;
  return {
    yaku,
    han,
    fu,
    score: Score.calculate({
      han,
      fu,
      yakumanMultiplier: multiplier,
      isDealer: WinContext.isDealer(context),
      winType: context.winType,
      honba: context.honba,
      riichiSticks: context.riichiSticks,
    }),
    form: winningHand.form.kind,
    wait: winningHand.wait,
  };
};

/** 高点法: 点数 → 翻 → 符 の順に高い解釈を採る。 */
const higher = (left: ScoreResult, right: ScoreResult): ScoreResult => {
  if (left.score.total !== right.score.total) {
    return left.score.total > right.score.total ? left : right;
  }
  if (left.han !== right.han) {
    return left.han > right.han ? left : right;
  }
  return left.fu >= right.fu ? left : right;
};

export const ScoreCalculation = {
  /**
   * 和了手の点数を計算する。
   * 複数の解釈がある場合は高点法で最も高くなるものを採用する。
   */
  calculate(
    hand: Hand,
    context: WinContext,
    options: ScoreOptions = DEFAULT_OPTIONS,
  ): ScoreOutcome {
    if (!Hand.has(hand, context.winTile)) {
      return { type: "not_winning_hand" };
    }
    const candidates = interpretations(hand, context);
    if (candidates.length === 0) {
      return { type: "not_winning_hand" };
    }
    const scored = candidates
      .map((candidate) => evaluate(candidate, options))
      .filter((result): result is ScoreResult => result !== null);
    if (scored.length === 0) {
      return { type: "no_yaku" };
    }
    return { type: "scored", result: scored.reduce(higher) };
  },

  /** 役ありで和了できるか。 */
  canWin(
    hand: Hand,
    context: WinContext,
    options: ScoreOptions = DEFAULT_OPTIONS,
  ): boolean {
    return ScoreCalculation.calculate(hand, context, options).type === "scored";
  },
} as const;
