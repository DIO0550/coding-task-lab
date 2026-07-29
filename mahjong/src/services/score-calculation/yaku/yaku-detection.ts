import { WinningHand } from "../../../domains/winning-hand/index.ts";
import { Yaku } from "../../../domains/yaku/index.ts";
import { SituationalYakuDetection } from "./situational/index.ts";
import { StandardYakuDetection } from "./standard/index.ts";
import { YakumanDetection } from "./yakuman/index.ts";

export const YakuDetection = {
  /** 成立する役の一覧を返す。ドラは含めない。役満が1つでも成立する場合は役満のみを返す。 */
  detect(winningHand: WinningHand): readonly Yaku[] {
    const detected = [
      ...SituationalYakuDetection.detect(winningHand),
      ...StandardYakuDetection.detect(winningHand),
      ...YakumanDetection.detect(winningHand),
    ];
    const yakuman = detected.filter((yaku) => Yaku.isYakuman(yaku.name));
    return yakuman.length > 0 ? yakuman : detected;
  },
} as const;
