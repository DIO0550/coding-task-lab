import type { Tile } from "@/src/domains/tile";
import type { GameSetup } from "@/src/services/game-engine";

/**
 * 対戦画面の動作オプション。通常は省略し、テストで乱数・牌山・開始局・CPU 進行間隔を固定するために使う。
 */
export type MatchOptions = Readonly<{
  rng?: () => number;
  wallTiles?: readonly Tile[];
  initial?: GameSetup["initial"];
  /** CPU が1手進むまでの待ち時間(ミリ秒) */
  stepDelayMs?: number;
}>;
