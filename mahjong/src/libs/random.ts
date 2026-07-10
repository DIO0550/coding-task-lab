import type { Rng } from "../types/rng.ts";

/**
 * Math.random ベースの Rng 実装。
 * リポジトリ全体で Math.random の直接使用が許されるのはこのファイルのみ
 * (domains/services は Rng を引数で受け取り、この実装をここでのみ生成して渡す)。
 */
export const createRandomRng = (): Rng => () => Math.random();
