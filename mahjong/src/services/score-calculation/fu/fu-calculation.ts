import { Block } from "../../../domains/block/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import type { Wait } from "../../../domains/wait/index.ts";
import { WinContext } from "../../../domains/win-context/index.ts";
import { WinningHand } from "../../../domains/winning-hand/index.ts";
import { Wind } from "../../../domains/wind/index.ts";

/** 副底。 */
const BASE_FU = 20;

/** 門前ロンの加符。 */
const MENZEN_RON_FU = 10;

/** ツモの加符。 */
const TSUMO_FU = 2;

/** 七対子の固定符。 */
const SEVEN_PAIRS_FU = 25;

/** 国士無双の符(役満のため点数には影響しない便宜上の値)。 */
const THIRTEEN_ORPHANS_FU = 25;

/** 喰い平和形(20符のまま計算が終わる形)の符。 */
const OPEN_PINFU_FU = 30;

const WAIT_FU: Readonly<Record<Wait, number>> = {
  ryanmen: 0,
  shanpon: 0,
  kanchan: 2,
  penchan: 2,
  tanki: 2,
};

const roundUpTo10 = (fu: number): number => Math.ceil(fu / 10) * 10;

/** 刻子・槓子の符。 */
const tripletFu = (block: Block): number => {
  const kindFu = block.kind === "kan" ? 8 : 2;
  const concealedFactor = block.concealed ? 2 : 1;
  const orphanFactor = Tile.isOrphan(Block.head(block)) ? 2 : 1;
  return kindFu * concealedFactor * orphanFactor;
};

/**
 * 雀頭の符。
 * 連風牌(場風かつ自風)の雀頭は2符とする(docs/assumptions.md 参照)。
 */
const pairFu = (pair: Block | null, context: WinContext): number => {
  if (pair === null) {
    return 0;
  }
  const tile = Block.head(pair);
  if (Tile.isDragon(tile)) {
    return 2;
  }
  const wind = Wind.fromTile(tile);
  if (wind === null) {
    return 0;
  }
  return wind === context.roundWind || wind === context.seatWind ? 2 : 0;
};

const setsFu = (winningHand: WinningHand): number =>
  WinningHand.blocks(winningHand)
    .filter((block) => Block.isTripletLike(block))
    .reduce((sum, block) => sum + tripletFu(block), 0);

export const FuCalculation = {
  /**
   * 符を計算する。
   * 平和の成立可否は役判定の結果に依存するため、呼び出し側から受け取る。
   */
  of(winningHand: WinningHand, hasPinfu: boolean): number {
    const { form, context } = winningHand;
    if (form.kind === "seven_pairs") {
      return SEVEN_PAIRS_FU;
    }
    if (form.kind === "thirteen_orphans") {
      return THIRTEEN_ORPHANS_FU;
    }
    if (hasPinfu) {
      return WinContext.isTsumo(context) ? BASE_FU : BASE_FU + MENZEN_RON_FU;
    }

    const tsumo = WinContext.isTsumo(context);
    const menzen = WinningHand.isMenzen(winningHand);
    const raw =
      BASE_FU +
      (menzen && !tsumo ? MENZEN_RON_FU : 0) +
      (tsumo ? TSUMO_FU : 0) +
      setsFu(winningHand) +
      pairFu(WinningHand.pair(winningHand), context) +
      WAIT_FU[winningHand.wait];

    return raw === BASE_FU ? OPEN_PINFU_FU : roundUpTo10(raw);
  },
} as const;
