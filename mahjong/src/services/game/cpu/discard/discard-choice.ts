import type { CpuLevel } from "../../../../domains/participant/index.ts";
import { GameAction } from "../../action/index.ts";
import { PlayerView } from "../../view/index.ts";
import { DiscardCandidate } from "../candidate/index.ts";
import type { DiscardRanking } from "../candidate/index.ts";
import { TableInfo } from "../table/index.ts";

/** 上級の攻撃時に、受け入れ1枚を打点の見込み何点分とみなすか。 */
const ACCEPTANCE_WEIGHT = 2;

/** 他家のリーチに対して降りに回るシャンテン数。 */
const FOLD_SHANTEN = 2;

const genbutsuKey = (candidate: DiscardCandidate): number =>
  candidate.danger === 0 ? 0 : 1;

/** 入門: シャンテン数を落とさない範囲で、孤立牌・字牌から切る。 */
const beginnerRanking: DiscardRanking = (candidate) => [
  candidate.shanten,
  candidate.isolation,
  candidate.index,
];

/** 標準: シャンテン数 → 受け入れ枚数 → ドラ残し。 */
const standardRanking: DiscardRanking = (candidate) => [
  candidate.shanten,
  -candidate.acceptance,
  -candidate.doraCount,
  candidate.index,
];

/** 標準の押し引き: 現物を優先し、その中で手を進める。 */
const genbutsuRanking: DiscardRanking = (candidate) => [
  genbutsuKey(candidate),
  candidate.shanten,
  -candidate.acceptance,
  -candidate.doraCount,
  candidate.index,
];

/** 上級: シャンテン数 → 受け入れと打点から危険度を差し引いた効率。 */
const advancedRanking: DiscardRanking = (candidate) => [
  candidate.shanten,
  -(
    candidate.acceptance * ACCEPTANCE_WEIGHT +
    candidate.value -
    candidate.danger
  ),
  candidate.index,
];

/** 上級の降り: 最も安全な牌から切る。 */
const foldRanking: DiscardRanking = (candidate) => [
  candidate.danger,
  candidate.shanten,
  -candidate.acceptance,
  candidate.index,
];

const rankingOf = (level: CpuLevel, defending: boolean): DiscardRanking => {
  if (level === "beginner") {
    return beginnerRanking;
  }
  if (level === "standard") {
    return defending ? genbutsuRanking : standardRanking;
  }
  return defending ? foldRanking : advancedRanking;
};

/** 他家がリーチしていて、自分の手が遠いか。 */
const isDefending = (
  info: TableInfo,
  candidates: readonly DiscardCandidate[],
): boolean =>
  TableInfo.hasThreat(info) &&
  DiscardCandidate.minShanten(candidates) >= FOLD_SHANTEN;

export const DiscardChoice = {
  /** 指定した位置の中から切る牌を選ぶ。候補が無ければ null。 */
  select(
    view: PlayerView,
    level: CpuLevel,
    info: TableInfo,
    indexes: readonly number[],
  ): DiscardCandidate | null {
    const candidates = DiscardCandidate.list(view, info, indexes);
    return DiscardCandidate.best(
      candidates,
      rankingOf(level, isDefending(info, candidates)),
    );
  },

  /** 打牌の行動を決める。切れる牌が無ければ null。 */
  choose(
    view: PlayerView,
    level: CpuLevel,
    info: TableInfo,
  ): GameAction | null {
    const chosen = DiscardChoice.select(
      view,
      level,
      info,
      PlayerView.discardableIndexes(view),
    );
    return chosen === null ? null : GameAction.discard(chosen.index);
  },
} as const;
