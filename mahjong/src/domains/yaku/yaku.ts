import type { WinContext, YakuResult } from "../win-context/index.ts";
import { detectNormalYaku } from "./normal-yaku.ts";
import { detectYakumanList } from "./yakuman.ts";

/**
 * 役判定ドメイン。1つの WinContext(和了分解+和了位置)に対する役を返す。
 * 複数解釈の高点法・ドラ/裏ドラ/赤ドラの加算は呼び出し側
 * (オーケストレータ)の責務で、ここでは扱わない
 */
export const Yaku = {
  /**
   * 通常役(ドラを除く)をすべて検出する。面前/鳴きの食い下がりを適用済みの
   * 翻を返す。連風牌の刻子は round_wind と seat_wind の2エントリになる。
   * 役満成立時は空配列を返す(呼び出し側は detectYakuman を優先採用する)
   */
  detect(ctx: WinContext): readonly YakuResult[] {
    if (detectYakumanList(ctx).length > 0) {
      return [];
    }
    return detectNormalYaku(ctx);
  },

  /**
   * 役満(天和・地和含む)を検出する。単役満 han:13、ダブル役満 han:26。
   * 複合あり(各エントリを列挙。合計をダブルまでに丸めるのは呼び出し側)
   */
  detectYakuman(ctx: WinContext): readonly YakuResult[] {
    return detectYakumanList(ctx);
  },
} as const;
