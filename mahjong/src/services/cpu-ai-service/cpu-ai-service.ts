import { Tile } from "../../domains/tile/index.ts";
import { Hand } from "../../domains/hand/index.ts";
import type {
  PlayerState,
  TableState,
  ActionOption,
  RuleConfig,
} from "../../types/game.ts";

export const CpuAiService = {
  decideTurnAction(
    player: PlayerState,
    table: TableState,
    rules: RuleConfig,
    availableActions: readonly ActionOption[]
  ): ActionOption {
    // 1. Always Tsumo win if available
    const tsumoAction = availableActions.find((a) => a.type === "tsumo");
    if (tsumoAction) {
      return tsumoAction;
    }

    // 2. Declare Riichi if available
    const riichiAction = availableActions.find((a) => a.type === "riichi");
    if (riichiAction) {
      return riichiAction;
    }

    // 3. Otherwise choose best discard
    const discardActions = availableActions.filter((a) => a.type === "discard");
    if (discardActions.length > 0) {
      const chosenTile = CpuAiService.chooseDiscardTile(
        player
      );
      const matched = discardActions.find((a) => a.tile === chosenTile);
      if (matched) return matched;
      return discardActions[0];
    }

    return availableActions[0] ?? { type: "pass" };
  },

  decideResponseAction(
    player: PlayerState,
    _table: TableState,
    _rules: RuleConfig,
    availableActions: readonly ActionOption[]
  ): ActionOption {
    // 1. Ron if available
    const ronAction = availableActions.find((a) => a.type === "ron");
    if (ronAction) {
      return ronAction;
    }

    // 2. For beginner/standard/advanced, consider Pon or Chi if helpful
    if (player.cpuLevel !== "beginner") {
      const meldAction = availableActions.find(
        (a) => a.type === "pon" || a.type === "chi"
      );
      if (meldAction) {
        const handTiles = player.hand.map((t) => Tile.parse(t));
        const melds = player.melds.map((m) => ({
          type: m.type,
          tiles: m.tiles.map((t) => Tile.parse(t)),
        }));
        const currShanten = Hand.calculateShanten(
          handTiles,
          melds.map((m) => ({
            type: m.type,
            tiles: m.tiles,
            calledTile: undefined,
            fromPlayerIndex: undefined,
          }))
        );

        if (currShanten <= 1) {
          return meldAction;
        }
      }
    }

    const passAction = availableActions.find((a) => a.type === "pass");
    return passAction ?? { type: "pass" };
  },

  chooseDiscardTile(
    player: PlayerState
  ): string {
    const handTiles = player.hand.map((t) => Tile.parse(t));

    const candidateStrings = Array.from(new Set(player.hand));
    let bestTile = candidateStrings[0];
    let minShanten = 99;
    let maxAcceptance = -1;

    for (const candidateStr of candidateStrings) {
      const candidateTile = Tile.parse(candidateStr);
      const remainingHand = Hand.removeTiles(handTiles, [candidateTile]);

      const shanten = Hand.calculateShanten(
        remainingHand,
        player.melds.map((m) => ({
          type: m.type,
          tiles: m.tiles.map((t) => Tile.parse(t)),
          calledTile: undefined,
          fromPlayerIndex: undefined,
        }))
      );

      const acceptance = CpuAiService.calculateTileAcceptance(remainingHand);

      if (
        shanten < minShanten ||
        (shanten === minShanten && acceptance > maxAcceptance)
      ) {
        minShanten = shanten;
        maxAcceptance = acceptance;
        bestTile = candidateStr;
      }
    }

    return bestTile;
  },

  calculateTileAcceptance(tiles: readonly Tile[]): number {
    let acceptance = 0;
    const suitChars: ("m" | "p" | "s" | "z")[] = ["m", "p", "s", "z"];
    for (const suit of suitChars) {
      const maxVal = suit === "z" ? 7 : 9;
      for (let v = 1; v <= maxVal; v++) {
        const testTile = { suit, value: v, isRed: false };
        const testHand = [...tiles, testTile];
        const newShanten = Hand.calculateShanten(testHand, []);
        if (newShanten < Hand.calculateShanten(tiles, [])) {
          acceptance += 4;
        }
      }
    }
    return acceptance;
  },
} as const;
