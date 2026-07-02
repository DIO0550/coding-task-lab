import { Tile } from "../tile/index.ts";
import { Hand } from "../hand/index.ts";
import type { StandardWin, WinningHand } from "../hand/index.ts";
import type { WinContext } from "../win-context/index.ts";
import { Yaku } from "../yaku/index.ts";

const KOKUSHI_FU = 30;
const CHIITOI_FU = 25;

const setFu = (win: StandardWin, winByRon: boolean): number =>
  win.sets.reduce((sum, set) => {
    if (set.kind === "run") {
      return sum;
    }
    let value = 2;
    if (Hand.isEffectiveConcealedTriplet(set, winByRon)) {
      value *= 2;
    }
    if (set.kind === "kan") {
      value *= 4;
    }
    if (Tile.isYaochuu(set.tile)) {
      value *= 2;
    }
    return sum + value;
  }, 0);

const pairFu = (win: StandardWin, context: WinContext): number => {
  let value = 0;
  if (Tile.isDragon(win.pairTile)) {
    value += 2;
  }
  if (win.pairTile === Tile.windIndex(context.seatWind)) {
    value += 2;
  }
  if (win.pairTile === Tile.windIndex(context.roundWind)) {
    value += 2;
  }
  return value;
};

const waitFu = (win: StandardWin): number =>
  win.wait === "kanchan" || win.wait === "penchan" || win.wait === "tanki"
    ? 2
    : 0;

export const Fu = {
  /** 和了解釈1つに対する符(10符単位に切り上げ済み)を計算する */
  calculate(win: WinningHand, context: WinContext): number {
    if (win.form === "kokushi") {
      return KOKUSHI_FU;
    }
    if (win.form === "chiitoi") {
      return CHIITOI_FU;
    }

    const winByRon = context.winType === "ron";
    const menzen = Hand.isMenzen(win);
    const pinfu = Yaku.isPinfu(win, context);

    let fu = 20;
    if (menzen && winByRon) {
      fu += 10;
    }
    if (!winByRon && !pinfu) {
      fu += 2;
    }
    fu += setFu(win, winByRon);
    fu += pairFu(win, context);
    fu += waitFu(win);

    // 副露手で加符のない形(喰い平和形)のロンは30符に引き上げる
    if (fu === 20 && winByRon) {
      fu = 30;
    }
    return Math.ceil(fu / 10) * 10;
  },
} as const;
