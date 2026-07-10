import type {
  Block,
  Decomposition,
  StandardDecomposition,
} from "../hand/index.ts";
import { Tile } from "../tile/index.ts";
import type { HonorKind } from "../tile/index.ts";
import type { WinContext } from "../win-context/index.ts";

const BASE_FU = 20;
const MENZEN_RON_FU = 10;
const TSUMO_FU = 2;
const WAIT_FU = 2;
const YAKUHAI_PAIR_FU = 2;
const OPEN_KUITAN_ROUNDED_FU = 30;

const DRAGON_HONORS: readonly HonorKind[] = ["haku", "hatsu", "chun"];

const roundUpToTen = (fu: number): number => Math.ceil(fu / 10) * 10;

const waitFu = (wait: StandardDecomposition["wait"]): number =>
  wait === "kanchan" || wait === "penchan" || wait === "tanki" ? WAIT_FU : 0;

const pairFu = (pair: StandardDecomposition["pair"], ctx: WinContext): number => {
  const tile = pair[0];
  if (tile === undefined || tile.kind !== "honor") {
    return 0;
  }

  let fu = 0;
  if (DRAGON_HONORS.includes(tile.honor)) {
    fu += YAKUHAI_PAIR_FU;
  }
  if (tile.honor === ctx.seatWind) {
    fu += YAKUHAI_PAIR_FU;
  }
  if (tile.honor === ctx.roundWind) {
    fu += YAKUHAI_PAIR_FU;
  }
  return fu;
};

const blockFu = (block: Block): number => {
  if (block.kind === "shuntsu") {
    return 0;
  }

  const representative = block.tiles[0];
  const isYaochuu = representative !== undefined && Tile.isYaochuu(representative);

  if (block.kind === "koutsu") {
    if (block.open) {
      return isYaochuu ? 4 : 2;
    }
    return isYaochuu ? 8 : 4;
  }

  // kantsu
  if (block.open) {
    return isYaochuu ? 16 : 8;
  }
  return isYaochuu ? 32 : 16;
};

const calculateStandardFu = (d: StandardDecomposition, ctx: WinContext): number => {
  const menzenRon = ctx.isMenzen && ctx.winType === "ron" ? MENZEN_RON_FU : 0;
  const tsumo = ctx.winType === "tsumo" ? TSUMO_FU : 0;
  const blocksTotal = d.blocks.reduce((sum, block) => sum + blockFu(block), 0);

  const total =
    BASE_FU + menzenRon + tsumo + waitFu(d.wait) + pairFu(d.pair, ctx) + blocksTotal;
  const rounded = roundUpToTen(total);

  const isOpenHand = !ctx.isMenzen;
  if (isOpenHand && rounded === BASE_FU) {
    // 鳴きあり(食い平和形)の20符はロン・ツモとも30符に繰り上げる
    return OPEN_KUITAN_ROUNDED_FU;
  }
  return rounded;
};

const calculate = (
  d: Decomposition,
  ctx: WinContext,
  opts: Readonly<{ isPinfu: boolean }>,
): number => {
  if (d.kind === "chiitoitsu") {
    return 25;
  }
  if (d.kind === "kokushi") {
    return 30;
  }
  if (opts.isPinfu) {
    return ctx.winType === "tsumo" ? 20 : 30;
  }
  return calculateStandardFu(d, ctx);
};

export const Fu = {
  calculate,
} as const;
