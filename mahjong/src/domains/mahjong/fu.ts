import { Tile } from "./tile";
import { HandPartition, Meld, NormalPartition } from "./hand";
import { YakuContext, Wind, RoundWind } from "./yaku";

export const Fu = {
  calculate(part: HandPartition, context: YakuContext, isPinfu: boolean): number {
    if (part.type === "chiitoitsu") {
      return 25; // fixed 25 fu for Seven Pairs
    }
    if (part.type === "kokushi") {
      return 20; // 20 fu for Thirteen Orphans
    }

    // Normal hand
    if (isPinfu && context.winType === "tsumo") {
      return 20; // Pinfu Tsumo is flat 20 fu
    }

    let fu = 20; // Base fu

    // Win type fu
    if (context.winType === "tsumo") {
      fu += 2;
    } else {
      // Ron
      fu += 10;
    }

    // Wait fu
    if (part.machi === "tanki" || part.machi === "kanchan" || part.machi === "penchan") {
      fu += 2;
    }

    // Pair fu
    const pairTile = part.pair[0];
    if (pairTile.suit === "z") {
      if (pairTile.value === 5 || pairTile.value === 6 || pairTile.value === 7) {
        fu += 2; // Dragon
      } else {
        const windValues: Record<Wind | RoundWind, number> = { ton: 1, nan: 2, sha: 3, pei: 4 };
        let windFu = 0;
        if (pairTile.value === windValues[context.seatWind]) windFu += 2;
        if (pairTile.value === windValues[context.roundWind]) windFu += 2;
        fu += windFu;
      }
    }

    // Melds fu
    // Closed melds
    for (let i = 0; i < part.closedMelds.length; i++) {
      const m = part.closedMelds[i];
      if (m.type === "pon") {
        const isTerminal = Tile.isTerminalOrHonor(m.tiles[0]);
        const isCompletedByRon =
          context.winType === "ron" &&
          part.completedComponent.type === "meld" &&
          part.completedComponent.index === i;
        const closed = !isCompletedByRon; // completed by Ron counts as open
        if (isTerminal) {
          fu += closed ? 8 : 4;
        } else {
          fu += closed ? 4 : 2;
        }
      } else if (m.type === "ankan") {
        const isTerminal = Tile.isTerminalOrHonor(m.tiles[0]);
        fu += isTerminal ? 32 : 16;
      }
    }

    // Open melds
    for (const m of part.openMelds) {
      if (m.type === "pon") {
        const isTerminal = Tile.isTerminalOrHonor(m.tiles[0]);
        fu += isTerminal ? 4 : 2;
      } else if (m.type === "kan") {
        const isTerminal = Tile.isTerminalOrHonor(m.tiles[0]);
        fu += isTerminal ? 16 : 8;
      }
    }

    // Round up to nearest 10
    return Math.ceil(fu / 10) * 10;
  }
} as const;
