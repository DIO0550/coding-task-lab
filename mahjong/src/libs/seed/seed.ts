/**
 * 乱数 seed の境界。ブラウザごと・対局ごとに異なる seed を作る唯一の場所。
 * Math.random はこのモジュールに閉じ込め、domains / features では使わない。
 * テストは seed を直接注入することで決定的に検証する。
 */

const UINT32_RANGE = 4294967296; // 2^32

export const Seed = {
  /** 32bit 非負整数の seed を1つ生成する(非決定的) */
  random(): number {
    return Math.floor(Math.random() * UINT32_RANGE);
  },
} as const;
