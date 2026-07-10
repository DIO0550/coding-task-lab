import type { WinContext } from "../win-context/index.ts";
import type { YakuHit } from "./types.ts";

/**
 * 手牌の形に依存しない状況役(立直・一発・門前ツモ・海底/河底/嶺上/槍槓)を判定する。
 * ドラ・天和・地和は含めない(天和・地和は役満、ドラは scoring 層の責務)。
 */
export const detectSituationalYaku = (ctx: WinContext): readonly YakuHit[] => {
  const hits: YakuHit[] = [];

  if (ctx.riichi === "double") {
    hits.push({ name: "double_riichi", han: 2 });
  } else if (ctx.riichi === "riichi") {
    hits.push({ name: "riichi", han: 1 });
  }

  if (ctx.ippatsu) {
    hits.push({ name: "ippatsu", han: 1 });
  }

  if (ctx.winType === "tsumo" && ctx.isMenzen) {
    hits.push({ name: "menzen_tsumo", han: 1 });
  }

  if (ctx.winType === "tsumo" && ctx.situational.includes("haitei")) {
    hits.push({ name: "haitei", han: 1 });
  }

  if (ctx.winType === "ron" && ctx.situational.includes("houtei")) {
    hits.push({ name: "houtei", han: 1 });
  }

  if (ctx.winType === "tsumo" && ctx.situational.includes("rinshan")) {
    hits.push({ name: "rinshan", han: 1 });
  }

  if (ctx.winType === "ron" && ctx.situational.includes("chankan")) {
    hits.push({ name: "chankan", han: 1 });
  }

  return hits;
};
