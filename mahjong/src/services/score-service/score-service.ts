import { Tile } from "../../domains/tile/index.ts";
import { Hand } from "../../domains/hand/index.ts";
import { Score } from "../../domains/score/index.ts";
import type { InputJson } from "../../types/input.ts";
import type { OutputJson, InvalidReason } from "../../types/output.ts";

export const ScoreService = {
  calculate(input: InputJson): OutputJson {
    const validationError = ScoreService.validateInput(input);
    if (validationError) {
      return { valid: false, reason: validationError };
    }

    try {
      const handTiles = [...input.hand];
      const meldTileCount = input.melds.length * 3;

      if (handTiles.length + meldTileCount === 13) {
        handTiles.push(input.winTile);
      }

      if (handTiles.length + meldTileCount !== 14) {
        return { valid: false, reason: "invalid_input" };
      }

      const allTileStrings = [
        ...handTiles,
        ...input.melds.flatMap((m) => m.tiles),
      ];
      if (!ScoreService.validateTileCounts(allTileStrings)) {
        return { valid: false, reason: "invalid_input" };
      }

      const hand = Hand.create(
        handTiles,
        input.melds,
        input.winTile,
        input.winType
      );

      const decompositions = Hand.decompose(hand);
      if (decompositions.length === 0) {
        return { valid: false, reason: "not_winning_hand" };
      }

      const doraTiles = input.dora.map((t) => Tile.parse(t));
      const uraDoraTiles = input.uraDora.map((t) => Tile.parse(t));

      const ctx = {
        seatWind: input.seatWind,
        roundWind: input.roundWind,
        dora: doraTiles,
        uraDora: uraDoraTiles,
        riichi: input.riichi,
        ippatsu: input.ippatsu,
        situational: input.situational,
      };

      const bestOption = Score.selectHighScoreOption(decompositions, ctx, 0, 0);
      if (!bestOption || bestOption.yaku.length === 0) {
        return { valid: false, reason: "no_yaku" };
      }

      return {
        valid: true,
        yaku: bestOption.yaku,
        han: bestOption.han,
        fu: bestOption.fu,
        score: bestOption.score,
      };
    } catch {
      return { valid: false, reason: "invalid_input" };
    }
  },

  calculateFromRawInput(raw: string): OutputJson {
    if (!raw || raw.trim().length === 0) {
      return { valid: false, reason: "invalid_input" };
    }
    try {
      const parsed = JSON.parse(raw);
      return ScoreService.calculate(parsed as InputJson);
    } catch {
      return { valid: false, reason: "invalid_input" };
    }
  },

  validateInput(input: InputJson): InvalidReason | null {
    if (
      !input ||
      !Array.isArray(input.hand) ||
      !Array.isArray(input.melds) ||
      !input.winTile ||
      !input.winType ||
      !input.seatWind ||
      !input.roundWind ||
      !Array.isArray(input.dora) ||
      !Array.isArray(input.uraDora) ||
      input.riichi === undefined ||
      input.ippatsu === undefined ||
      !Array.isArray(input.situational)
    ) {
      return "invalid_input";
    }
    return null;
  },

  validateTileCounts(tileStrings: readonly string[]): boolean {
    const counts = new Map<string, number>();
    for (const str of tileStrings) {
      try {
        const tile = Tile.parse(str);
        const key = `${tile.suit}${tile.value}`;
        const curr = (counts.get(key) ?? 0) + 1;
        if (curr > 4) return false;
        counts.set(key, curr);
      } catch {
        return false;
      }
    }
    return true;
  },
} as const;
