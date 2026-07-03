import { Tile } from "@/src/domains/tile";
import type { Interpretation, StandardInterpretation } from "@/src/domains/hand";
import type { WinContext } from "@/src/domains/yaku";

const setFu = (set: StandardInterpretation["sets"][number]): number => {
  if (set.kind === "sequence") {
    return 0;
  }
  const yaochuu = Tile.indexIsTerminalOrHonor(set.tile);
  const base = set.kind === "quad" ? 8 : 2;
  return base * (yaochuu ? 2 : 1) * (set.concealed ? 2 : 1);
};

const pairFu = (interp: StandardInterpretation, ctx: WinContext): number => {
  const dragonFu = Tile.indexIsDragon(interp.pair) ? 2 : 0;
  const seatFu = interp.pair === ctx.seatWind ? 2 : 0;
  const roundFu = interp.pair === ctx.roundWind ? 2 : 0;
  return dragonFu + seatFu + roundFu;
};

const waitFu = (interp: StandardInterpretation): number =>
  interp.wait === "kanchan" ||
  interp.wait === "penchan" ||
  interp.wait === "tanki"
    ? 2
    : 0;

const isPinfuShape = (
  interp: StandardInterpretation,
  ctx: WinContext,
): boolean =>
  ctx.menzen &&
  interp.sets.every((set) => set.kind === "sequence") &&
  interp.wait === "ryanmen" &&
  pairFu(interp, ctx) === 0;

const calculateStandardFu = (
  interp: StandardInterpretation,
  ctx: WinContext,
): number => {
  if (isPinfuShape(interp, ctx)) {
    return ctx.winType === "tsumo" ? 20 : 30;
  }

  const raw =
    20 +
    interp.sets.reduce((sum, set) => sum + setFu(set), 0) +
    pairFu(interp, ctx) +
    waitFu(interp) +
    (ctx.winType === "tsumo" ? 2 : 0) +
    (ctx.menzen && ctx.winType === "ron" ? 10 : 0);

  // 喰い平和形のロンは30符として扱う
  if (raw === 20 && ctx.winType === "ron") {
    return 30;
  }

  return Math.ceil(raw / 10) * 10;
};

export type Fu = number;

export const Fu = {
  /** 1つの解釈に対する符を計算する(七対子25符固定・国士無双は0) */
  calculate(interp: Interpretation, ctx: WinContext): Fu {
    switch (interp.form) {
      case "chiitoitsu":
        return 25;
      case "kokushi":
        return 0;
      case "standard":
        return calculateStandardFu(interp, ctx);
    }
  },
} as const;
