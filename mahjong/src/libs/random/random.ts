import type { Rng } from "@/src/types/random";

/**
 * 乱数という外部世界(非決定性)との境界を閉じ込めるモジュール。
 * domains / services は Math.random を直接呼ばず、ここで生成した Rng を注入して使う。
 */
export const Random = {
  create(): Rng {
    return () => Math.random();
  },
} as const;
