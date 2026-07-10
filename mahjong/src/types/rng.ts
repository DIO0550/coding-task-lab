/** [0, 1) の一様乱数を返す関数。domains/services はこの型を引数で受け取り、Math.random を直接使わない。 */
export type Rng = () => number;
