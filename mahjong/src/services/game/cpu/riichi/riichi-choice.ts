import type { CpuLevel } from "../../../../domains/participant/index.ts";
import { GameAction } from "../../action/index.ts";
import { PlayerView } from "../../view/index.ts";
import type { DiscardCandidate } from "../candidate/index.ts";
import { DiscardChoice } from "../discard/index.ts";
import type { TableInfo } from "../table/index.ts";

/** 良い待ちとみなす受け入れ枚数。 */
const GOOD_WAIT = 4;

/** 打点があれば許容する最低の受け入れ枚数。 */
const MIN_WAIT = 2;

/** 悪い待ちでもリーチする打点の見込み(ドラ1枚相当)。 */
const VALUE_THRESHOLD = 4;

/** 待ちの良さと打点からリーチするか決める。 */
const shouldDeclare = (candidate: DiscardCandidate): boolean => {
  if (candidate.acceptance >= GOOD_WAIT) {
    return true;
  }
  return (
    candidate.acceptance >= MIN_WAIT && candidate.value >= VALUE_THRESHOLD
  );
};

export const RiichiChoice = {
  /**
   * リーチ宣言の行動を決める。宣言しない(ダマにする)なら null。
   * 入門はテンパイしたら常に宣言し、標準・上級は待ちの良さと打点で判断する。
   */
  choose(
    view: PlayerView,
    level: CpuLevel,
    info: TableInfo,
  ): GameAction | null {
    const chosen = DiscardChoice.select(
      view,
      level,
      info,
      PlayerView.riichiIndexes(view),
    );
    if (chosen === null) {
      return null;
    }
    if (level === "beginner") {
      return GameAction.riichi(chosen.index);
    }
    return shouldDeclare(chosen) ? GameAction.riichi(chosen.index) : null;
  },
} as const;
