import { Hand } from "@/src/domains/hand";
import { Tile } from "@/src/domains/tile";
import type { Wind } from "@/src/domains/wind";
import type { Mentsu, StandardShape, WinningShape } from "@/src/domains/winning-shape";
import type { WinType } from "@/src/types/scoring";

/**
 * 符計算。平和ツモ20符・七対子25符固定、それ以外は10符単位に切り上げる。
 * 平和かどうかは役判定の結果(`hasPinfu`)として受け取る。
 */
export type FuContext = Readonly<{
  hand: Hand;
  winType: WinType;
  seatWind: Wind;
  roundWind: Wind;
  hasPinfu: boolean;
}>;

const BASE_FU = 20;
const MENZEN_RON_FU = 10;
const TSUMO_FU = 2;
const CHIITOI_FU = 25;
const KOKUSHI_FU = 30;
const OPEN_PINFU_FU = 30;

const mentsuFu = (mentsu: Mentsu): number => {
  if (mentsu.type === "shuntsu") return 0;
  const yaochu = Tile.isYaochu(mentsu.tiles[0]) ? 2 : 1;
  const closed = mentsu.open ? 1 : 2;
  const kan = mentsu.type === "kantsu" ? 4 : 1;
  return 2 * yaochu * closed * kan;
};

const pairFu = (pair: Tile, context: FuContext): number => {
  if (Tile.isDragon(pair)) return 2;
  const seat = Tile.equals(pair, Tile.ofWind(context.seatWind)) ? 2 : 0;
  const round = Tile.equals(pair, Tile.ofWind(context.roundWind)) ? 2 : 0;
  return seat + round;
};

const waitFu = (shape: StandardShape): number =>
  shape.wait === "kanchan" || shape.wait === "penchan" || shape.wait === "tanki" ? 2 : 0;

const roundUp10 = (fu: number): number => Math.ceil(fu / 10) * 10;

const standardFu = (shape: StandardShape, context: FuContext): number => {
  if (context.hasPinfu) return context.winType === "tsumo" ? BASE_FU : BASE_FU + MENZEN_RON_FU;
  const menzen = Hand.isMenzen(context.hand);
  const shapeFu =
    shape.mentsu.reduce((total, mentsu) => total + mentsuFu(mentsu), 0) + pairFu(shape.pair, context) + waitFu(shape);
  const winFu = context.winType === "tsumo" ? TSUMO_FU : menzen ? MENZEN_RON_FU : 0;
  const total = BASE_FU + shapeFu + winFu;
  return total === BASE_FU ? OPEN_PINFU_FU : roundUp10(total);
};

export const Fu = {
  calculate(shape: WinningShape, context: FuContext): number {
    switch (shape.kind) {
      case "chiitoi":
        return CHIITOI_FU;
      case "kokushi":
        return KOKUSHI_FU;
      case "standard":
        return standardFu(shape, context);
    }
  },
} as const;
