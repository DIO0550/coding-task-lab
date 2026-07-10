import type { Rng } from "@/src/types/rng.ts";

/** CPU の「考慮時間」として演出する遅延の範囲(ミリ秒)。 */
export const CPU_THINK_MIN_MS = 300;
export const CPU_THINK_MAX_MS = 800;

/** [CPU_THINK_MIN_MS, CPU_THINK_MAX_MS) の乱数遅延を返す。rng は注入されたものを使い Math.random は使わない。 */
export const cpuThinkDelay = (rng: Rng): number =>
  Math.floor(CPU_THINK_MIN_MS + rng() * (CPU_THINK_MAX_MS - CPU_THINK_MIN_MS));
