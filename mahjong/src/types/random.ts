/**
 * [0, 1) の一様乱数を返す乱数生成器。
 * 実体は `src/libs/random` が生成し、domains / services へは引数で注入する。
 * テストではシード付きの決定的なフェイクを注入できる。
 */
export type Rng = () => number;
