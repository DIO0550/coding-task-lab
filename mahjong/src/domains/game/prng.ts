import type { Rng } from "../../types/rng.ts";

/**
 * apply() を純粋関数(Rng を引数に取らない)に保つため、MatchState には
 * 乱数生成器そのもの(関数、JSON化不可)ではなく 32bit の種(plain number)を持たせる。
 * 次局への遷移などで新しい牌山が必要になった際は、この種から決定的に
 * (mulberry32 アルゴリズムで)乱数列を再現する。
 *
 * createMatch(config, rng) の最初の1回だけ引数の Rng を呼び出して種を作り、
 * それ以降の shuffle はすべてこの決定的な PRNG で行う。
 */
const MAGIC = 0x6d2b79f5;

const step = (seed: number): Readonly<{ value: number; nextSeed: number }> => {
  const a = (seed + MAGIC) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextSeed: a >>> 0 };
};

/** 外部から渡された Rng を1回だけ呼び出し、決定的 PRNG の種を作る。 */
const seedFrom = (rng: Rng): number => Math.floor(rng() * 0xffffffff) >>> 0;

/** seed から Rng 互換の関数列を作る代わりに、都度 (value, nextSeed) を返す純粋なステップ関数として使う。 */
export const Prng = {
  seedFrom,
  step,
} as const;
