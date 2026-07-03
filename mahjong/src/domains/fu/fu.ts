import { Tile } from "../tile/index.ts";
import type { WinningHand } from "../hand/index.ts";
import { WinContext } from "../win-context/index.ts";

const CHIITOITSU_FU = 25;
const BASE_FU = 20;

const isDragonKind = (kind: number): boolean => kind >= 31;

const roundUp10 = (fu: number): number => Math.ceil(fu / 10) * 10;

export const Fu = {
  /**
   * 符を計算する。平和ツモ20符・平和ロン30符・七対子25符固定。
   * 国士無双は符計算の対象外として 0 を返す(点数計算に符は使わない)。
   */
  calculate(
    win: WinningHand,
    context: WinContext,
    options: Readonly<{ isPinfu: boolean }>,
  ): number {
    if (win.form === "chiitoitsu") {
      return CHIITOITSU_FU;
    }
    if (win.form === "kokushi") {
      return 0;
    }
    if (options.isPinfu) {
      return context.winType === "tsumo" ? 20 : 30;
    }

    let fu = BASE_FU;
    if (context.menzen && context.winType === "ron") {
      fu += 10;
    }
    if (context.winType === "tsumo") {
      fu += 2;
    }
    for (const set of win.sets) {
      if (set.kind === "run") {
        continue;
      }
      const base = set.kind === "kan" ? 8 : 2;
      const concealedFactor = set.concealed ? 2 : 1;
      const yaochuuFactor = Tile.isYaochuuKind(set.tileKind) ? 2 : 1;
      fu += base * concealedFactor * yaochuuFactor;
    }
    if (isDragonKind(win.pairKind)) {
      fu += 2;
    }
    if (win.pairKind === WinContext.windTileKind(context.seatWind)) {
      fu += 2;
    }
    if (win.pairKind === WinContext.windTileKind(context.roundWind)) {
      fu += 2;
    }
    if (win.wait === "kanchan" || win.wait === "penchan" || win.wait === "tanki") {
      fu += 2;
    }
    // 副露のみ・符要素なしの喰い平和形は30符に繰り上げ(assumptions A12)
    return Math.max(30, roundUp10(fu));
  },
} as const;
