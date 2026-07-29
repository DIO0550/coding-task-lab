import { WinningHand } from "../../../../domains/winning-hand/index.ts";
import type { Yaku } from "../../../../domains/yaku/index.ts";
import { CompositionYakuDetection } from "./composition/index.ts";
import { RunYakuDetection } from "./runs/index.ts";
import { TripletYakuDetection } from "./triplets/index.ts";

export const StandardYakuDetection = {
  /** 1〜6翻の通常役。国士無双形は役満のみで成立するため通常役は返さない。 */
  detect(winningHand: WinningHand): readonly Yaku[] {
    if (winningHand.form.kind === "thirteen_orphans") {
      return [];
    }
    return [
      ...RunYakuDetection.detect(winningHand),
      ...TripletYakuDetection.detect(winningHand),
      ...CompositionYakuDetection.detect(winningHand),
    ];
  },
} as const;
