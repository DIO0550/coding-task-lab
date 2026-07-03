import type { Decomposition } from "../hand/index.ts";
import type { WinContext } from "../win-context/index.ts";
import { detectBlockYaku } from "./block-yaku.ts";
import { detectHonorYaku } from "./honor-yaku.ts";
import { detectShapeYaku } from "./shape-yaku.ts";
import { detectSituationalYaku } from "./situational-yaku.ts";
import type { YakuHit, YakumanHit } from "./types.ts";
import { detectYakuman } from "./yakuman.ts";

const detect = (
  d: Decomposition,
  ctx: WinContext,
): Readonly<{ yakuman: readonly YakumanHit[]; normal: readonly YakuHit[] }> => {
  const normal: readonly YakuHit[] = [
    ...detectSituationalYaku(ctx),
    ...detectShapeYaku(d, ctx),
    ...detectHonorYaku(d, ctx),
    ...detectBlockYaku(d),
  ];
  const yakuman = detectYakuman(d, ctx);
  return { yakuman, normal };
};

export const Yaku = { detect } as const;
