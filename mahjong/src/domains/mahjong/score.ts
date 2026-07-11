import { Tile, TileSuit } from "./tile";
import { Meld, Hand, HandPartition, NormalPartition } from "./hand";
import { Yaku, YakuContext, YakuResult, WinType, Wind, RoundWind, RiichiType } from "./yaku";
import { Fu } from "./fu";

export type CalcInput = Readonly<{
  hand: readonly string[];
  melds: readonly Readonly<{ type: string; tiles: readonly string[] }>[];
  winTile: string;
  winType: WinType;
  seatWind: Wind;
  roundWind: RoundWind;
  dora: readonly string[];
  uraDora: readonly string[];
  riichi: RiichiType;
  ippatsu: boolean;
  situational: readonly string[];
  honba?: number;
  kyoutaku?: number;
}>;

export type ScorePayment = Readonly<{
  seat?: Wind;
  amount: number;
}>;

export type ValidScoreResult = Readonly<{
  valid: true;
  yaku: readonly YakuResult[];
  han: number;
  fu: number;
  score: Readonly<{
    total: number;
    payments: readonly ScorePayment[];
  }>;
}>;

export type InvalidScoreResult = Readonly<{
  valid: false;
  reason: "no_yaku" | "not_winning_hand" | "invalid_input";
}>;

export type ScoreResult = ValidScoreResult | InvalidScoreResult;

export const Score = {
  calculate(input: CalcInput): ScoreResult {
    // 1. Validate basic inputs
    const validationError = Score.validateInput(input);
    if (validationError) {
      return { valid: false, reason: validationError };
    }

    try {
      const parsedWinTile = Tile.fromString(input.winTile);
      const parsedDora = input.dora.map(Tile.fromString);
      const parsedUraDora = input.uraDora.map(Tile.fromString);

      const parsedMelds = input.melds.map(m =>
        Meld.create(
          m.type as Meld["type"],
          m.tiles.map(Tile.fromString)
        )
      );

      // Determine the hand tiles.
      // If hand length + 3 * melds.length === 13, winTile is not in hand. We add it.
      // If hand length + 3 * melds.length === 14, winTile is already in hand.
      const rawHandTiles = input.hand.map(Tile.fromString);
      const totalTilesCount = rawHandTiles.length + 3 * parsedMelds.length;
      let handTiles: readonly Tile[];
      if (totalTilesCount === 13) {
        handTiles = [...rawHandTiles, parsedWinTile];
      } else if (totalTilesCount === 14) {
        handTiles = rawHandTiles;
      } else {
        return { valid: false, reason: "invalid_input" };
      }

      // 2. Generate all partitions
      const partitions = Hand.getPartitions(handTiles, parsedMelds, parsedWinTile);
      if (partitions.length === 0) {
        return { valid: false, reason: "not_winning_hand" };
      }

      // 3. Find the best scoring partition
      let bestResult: ValidScoreResult | null = null;
      let hasWinningShapeButNoYaku = false;

      const isClosed = parsedMelds.every(m => m.type === "ankan");

      for (const part of partitions) {
        const yakuContext: YakuContext = {
          winTile: parsedWinTile,
          winType: input.winType,
          seatWind: input.seatWind,
          roundWind: input.roundWind,
          riichi: input.riichi,
          ippatsu: input.ippatsu,
          situational: input.situational,
          isClosed
        };

        const yakuList = Yaku.check(part, yakuContext);
        if (yakuList.length === 0) {
          hasWinningShapeButNoYaku = true;
          continue;
        }

        // Add Dora and Red Dora if not Yakuman
        const isYakuman = yakuList.some(y => y.han >= 13);
        const finalYaku = [...yakuList];
        let totalHan = yakuList.reduce((sum, y) => sum + y.han, 0);

        if (!isYakuman) {
          // Count Dora
          let doraCount = 0;
          let uraDoraCount = 0;
          let redDoraCount = 0;

          const allTiles = Score.getAllTiles(part);
          for (const t of allTiles) {
            // Match dora
            doraCount += parsedDora.filter(d => Tile.equals(d, t)).length;
            // Match uradora if riichi
            if (input.riichi !== "none") {
              uraDoraCount += parsedUraDora.filter(u => Tile.equals(u, t)).length;
            }
            // Red dora
            if (t.isRed) {
              redDoraCount++;
            }
          }

          if (doraCount > 0) {
            finalYaku.push({ name: "dora", han: doraCount });
            totalHan += doraCount;
          }
          if (uraDoraCount > 0) {
            finalYaku.push({ name: "ura_dora", han: uraDoraCount });
            totalHan += uraDoraCount;
          }
          if (redDoraCount > 0) {
            finalYaku.push({ name: "aka_dora", han: redDoraCount });
            totalHan += redDoraCount;
          }
        }

        // Calculate Fu
        const isPinfu = yakuList.some(y => y.name === "pinfu");
        const fuVal = Fu.calculate(part, yakuContext, isPinfu);

        // Compute points
        const scoreData = Score.calculatePoints({
          han: totalHan,
          fu: fuVal,
          winType: input.winType,
          seatWind: input.seatWind,
          isYakuman,
          honba: input.honba ?? 0,
          kyoutaku: input.kyoutaku ?? 0
        });

        const currentResult: ValidScoreResult = {
          valid: true,
          yaku: finalYaku,
          han: totalHan,
          fu: fuVal,
          score: scoreData
        };

        if (!bestResult || currentResult.score.total > bestResult.score.total) {
          bestResult = currentResult;
        }
      }

      if (bestResult) {
        return bestResult;
      }

      if (hasWinningShapeButNoYaku) {
        return { valid: false, reason: "no_yaku" };
      }

      return { valid: false, reason: "not_winning_hand" };
    } catch (e) {
      return { valid: false, reason: "invalid_input" };
    }
  },

  validateInput(input: CalcInput): "invalid_input" | null {
    if (!input.hand || !Array.isArray(input.hand)) return "invalid_input";
    if (!input.winTile || typeof input.winTile !== "string") return "invalid_input";
    if (input.winType !== "tsumo" && input.winType !== "ron") return "invalid_input";
    if (!["ton", "nan", "sha", "pei"].includes(input.seatWind)) return "invalid_input";
    if (!["ton", "nan"].includes(input.roundWind)) return "invalid_input";
    if (!input.dora || !Array.isArray(input.dora)) return "invalid_input";
    if (!input.uraDora || !Array.isArray(input.uraDora)) return "invalid_input";
    if (!["none", "riichi", "double"].includes(input.riichi)) return "invalid_input";
    if (typeof input.ippatsu !== "boolean") return "invalid_input";
    if (!input.situational || !Array.isArray(input.situational)) return "invalid_input";
    if (!input.melds || !Array.isArray(input.melds)) return "invalid_input";

    // Validate tile counts
    let totalCount = input.hand.length;
    for (const m of input.melds) {
      if (!m.tiles || !Array.isArray(m.tiles)) return "invalid_input";
      if (!["chi", "pon", "kan", "ankan"].includes(m.type)) return "invalid_input";
      // Kan is 4 tiles, but in size logic it counts as 3 in hand.
      // In the array representation it should have 4 tiles.
      if (m.type === "kan" || m.type === "ankan") {
        if (m.tiles.length !== 4) return "invalid_input";
      } else {
        if (m.tiles.length !== 3) return "invalid_input";
      }
      totalCount += 3; // for size validation
    }

    if (totalCount !== 13 && totalCount !== 14) {
      return "invalid_input";
    }

    return null;
  },

  getAllTiles(part: HandPartition): readonly Tile[] {
    if (part.type === "kokushi") {
      return part.tiles;
    }
    if (part.type === "chiitoitsu") {
      return part.pairs.flat();
    }
    return [
      ...part.pair,
      ...part.closedMelds.flatMap(m => m.tiles),
      ...part.openMelds.flatMap(m => m.tiles)
    ];
  },

  calculatePoints(params: {
    han: number;
    fu: number;
    winType: WinType;
    seatWind: Wind;
    isYakuman: boolean;
    honba: number;
    kyoutaku: number;
  }): ValidScoreResult["score"] {
    const { han, fu, winType, seatWind, isYakuman, honba, kyoutaku } = params;

    let A = 0; // Base points

    if (isYakuman) {
      // Yakuman
      // han is 13 for single Yakuman, 26 for Double Yakuman
      const factor = Math.floor(han / 13);
      A = 8000 * Math.min(2, factor); // capped at double yakuman (16000 base points)
    } else if (han >= 13) {
      // Kazoe Yakuman
      A = 8000;
    } else if (han >= 11) {
      // Sanbaimangan
      A = 6000;
    } else if (han >= 8) {
      // Baimangan
      A = 4000;
    } else if (han >= 6) {
      // Hanmangan
      A = 3000;
    } else if (han === 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
      // Mangan
      A = 2000;
    } else {
      // Normal hands
      A = fu * Math.pow(2, han + 2);
      if (A > 2000) {
        A = 2000; // Cap at Mangan
      }
    }

    const isParent = seatWind === "ton";
    const seats: Wind[] = ["ton", "nan", "sha", "pei"];

    if (winType === "tsumo") {
      if (isParent) {
        // Each child pays: 2 * A (rounded up to 100) + 100 * honba
        const childBase = Math.ceil((2 * A) / 100) * 100;
        const childPay = childBase + 100 * honba;
        const payments = seats
          .filter(s => s !== "ton")
          .map(s => ({ seat: s, amount: childPay }));
        const total = childPay * 3 + kyoutaku * 1000;

        return { total, payments };
      } else {
        // Parent pays: 2 * A (rounded up to 100) + 100 * honba
        // Other children pay: 1 * A (rounded up to 100) + 100 * honba
        const parentBase = Math.ceil((2 * A) / 100) * 100;
        const parentPay = parentBase + 100 * honba;

        const childBase = Math.ceil((1 * A) / 100) * 100;
        const childPay = childBase + 100 * honba;

        const payments = seats
          .filter(s => s !== seatWind)
          .map(s => ({
            seat: s,
            amount: s === "ton" ? parentPay : childPay
          }));
        const total = parentPay + childPay * 2 + kyoutaku * 1000;

        return { total, payments };
      }
    } else {
      // Ron
      const basePay = isParent ? 6 * A : 4 * A;
      const ronPay = Math.ceil(basePay / 100) * 100 + 300 * honba;
      const total = ronPay + kyoutaku * 1000;

      // We don't know the loser seat wind from the Part 1 input schema,
      // so we don't specify the seat in payment.
      const payments = [{ amount: ronPay }];

      return { total, payments };
    }
  }
} as const;
