import { Tile } from "../tile/index.ts";
import type { HandDecomposition, RegularDecomposition } from "../hand/index.ts";
import type { YakuContext } from "../yaku/index.ts";
import { Yaku } from "../yaku/index.ts";
import type { PaymentResult, ScoreResult, YakuResult } from "../../types/output.ts";

export type EvaluationOption = Readonly<{
  decomposition: HandDecomposition;
  yaku: readonly YakuResult[];
  han: number;
  fu: number;
  basePoints: number;
  score: ScoreResult;
}>;

export const Score = {
  calculateFu(
    decomp: HandDecomposition,
    ctx: YakuContext
  ): number {
    if (decomp.shape === "chiitoitsu") {
      return 25;
    }
    if (decomp.shape === "kokushi") {
      return 20;
    }

    return Score.calculateRegularFu(decomp, ctx);
  },

  calculateRegularFu(
    decomp: RegularDecomposition,
    ctx: YakuContext
  ): number {
    let fu = 20;

    if (decomp.isMenzen && decomp.winType === "ron") {
      fu += 10;
    }

    const isPinfu = Yaku.evaluate(decomp, ctx).some((y) => y.name === "pinfu");
    if (decomp.winType === "tsumo" && !isPinfu) {
      fu += 2;
    }

    const pairTile = decomp.pair.tile;
    if (pairTile.suit === "z") {
      if (pairTile.value >= 5) {
        fu += 2;
      }
      if (pairTile.value === Yaku.windToNumber(ctx.seatWind)) {
        fu += 2;
      }
      if (pairTile.value === Yaku.windToNumber(ctx.roundWind)) {
        fu += 2;
      }
    }

    if (decomp.pair.isTankiWait) {
      fu += 2;
    } else {
      const winSet = decomp.sets.find((s) => s.containsWinTile);
      if (winSet) {
        if (
          winSet.waitType === "kanchan" ||
          winSet.waitType === "penchan" ||
          winSet.waitType === "tanki"
        ) {
          fu += 2;
        }
      }
    }

    for (const set of decomp.sets) {
      if (set.type === "koutsu") {
        const isTerminalOrHonor = Tile.isTerminalOrHonor(set.tiles[0]);
        if (set.isConcealed) {
          fu += isTerminalOrHonor ? 8 : 4;
        } else {
          fu += isTerminalOrHonor ? 4 : 2;
        }
      } else if (set.type === "kantsu") {
        const isTerminalOrHonor = Tile.isTerminalOrHonor(set.tiles[0]);
        if (set.isConcealed) {
          fu += isTerminalOrHonor ? 32 : 16;
        } else {
          fu += isTerminalOrHonor ? 16 : 8;
        }
      }
    }

    if (isPinfu && decomp.winType === "tsumo") {
      return 20;
    }

    const rounded = Math.ceil(fu / 10) * 10;
    return Math.max(30, rounded);
  },

  calculateBasePoints(han: number, fu: number, isYakuman: boolean): number {
    if (isYakuman) {
      if (han >= 26) return 16000;
      return 8000;
    }

    if (han >= 13) return 8000;
    if (han >= 11) return 6000;
    if (han >= 8) return 4000;
    if (han >= 6) return 3000;
    if (han >= 5) return 2000;

    const calc = fu * Math.pow(2, han + 2);
    if (calc >= 2000) return 2000;
    return calc;
  },

  calculateScorePayments(
    basePoints: number,
    winType: "tsumo" | "ron",
    seatWind: "ton" | "nan" | "sha" | "pei",
    honba: number,
    kyoutaku: number
  ): ScoreResult {
    const isParent = seatWind === "ton";
    const payments: PaymentResult[] = [];
    let totalScore = 0;

    if (winType === "ron") {
      const multiplier = isParent ? 6 : 4;
      const amount = Math.ceil((basePoints * multiplier) / 100) * 100 + honba * 300;
      payments.push({
        from: "child",
        amount,
      });
      totalScore = amount + kyoutaku * 1000;
    } else {
      if (isParent) {
        const eachChildPay = Math.ceil((basePoints * 2) / 100) * 100 + honba * 100;
        payments.push(
          { from: "child", amount: eachChildPay },
          { from: "child", amount: eachChildPay },
          { from: "child", amount: eachChildPay }
        );
        totalScore = eachChildPay * 3 + kyoutaku * 1000;
      } else {
        const parentPay = Math.ceil((basePoints * 2) / 100) * 100 + honba * 100;
        const childPay = Math.ceil((basePoints * 1) / 100) * 100 + honba * 100;
        payments.push(
          { from: "parent", amount: parentPay },
          { from: "child", amount: childPay },
          { from: "child", amount: childPay }
        );
        totalScore = parentPay + childPay * 2 + kyoutaku * 1000;
      }
    }

    return {
      total: totalScore,
      payments,
    };
  },

  selectHighScoreOption(
    decompositions: readonly HandDecomposition[],
    ctx: YakuContext,
    honba = 0,
    kyoutaku = 0
  ): EvaluationOption | null {
    const options: EvaluationOption[] = [];

    for (const decomp of decompositions) {
      const yakuList = Yaku.evaluate(decomp, ctx);
      if (yakuList.length === 0) continue;

      const hasYakuman = yakuList.some((y) => y.han >= 13);
      const totalHan = yakuList.reduce((sum, y) => sum + y.han, 0);
      const fu = Score.calculateFu(decomp, ctx);
      const basePoints = Score.calculateBasePoints(totalHan, fu, hasYakuman);

      const score = Score.calculateScorePayments(
        basePoints,
        decomp.winType,
        ctx.seatWind,
        honba,
        kyoutaku
      );

      options.push({
        decomposition: decomp,
        yaku: yakuList,
        han: totalHan,
        fu,
        basePoints,
        score,
      });
    }

    if (options.length === 0) return null;

    options.sort((a, b) => {
      if (a.score.total !== b.score.total) {
        return b.score.total - a.score.total;
      }
      if (a.han !== b.han) {
        return b.han - a.han;
      }
      return b.fu - a.fu;
    });

    return options[0];
  },
} as const;
