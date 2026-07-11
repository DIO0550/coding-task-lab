import { Tile, Meld, Wind, RoundWind } from "../mahjong";

export type PlayerId = "player" | "cpu1" | "cpu2" | "cpu3";

export type PlayerState = Readonly<{
  id: PlayerId;
  name: string;
  score: number;
  hand: readonly Tile[]; // 13 tiles, or 14 during playerDraw
  melds: readonly Meld[];
  river: readonly Tile[]; // Discards
  riichi: "none" | "riichi" | "double";
  isFuriten: boolean;
  isCpu: boolean;
  cpuLevel: "easy" | "normal" | "hard";
  seatWind: Wind;
}>;

export type GamePhase =
  | "setup"            // Initial setup or transition between rounds
  | "playerDraw"       // Active player drew, waiting for discard/riichi/tsumo/kan
  | "discardReaction"  // Player discarded, others deciding on ron/pon/kan/chi/pass
  | "roundEnd"         // Round finished, displaying result
  | "gameEnd";         // Game finished, displaying rankings

export type GameRule = Readonly<{
  length: "tonpuu" | "hanchan";
  startScore: number;
  returnScore: number;
  kuitan: boolean;
  atozuke: boolean;
  redDora: boolean;
  cpuAutoWin: boolean;
}>;

export type RoundEndResult = Readonly<{
  type: "win" | "draw";
  winnerId?: PlayerId;
  loserId?: PlayerId; // for ron
  winType?: "tsumo" | "ron";
  yakuNames?: readonly string[];
  han?: number;
  fu?: number;
  scoreDelta: Readonly<Record<PlayerId, number>>;
  reason: string; // "tsumo", "ron", "ryuukyoku"
  parentContinuous: boolean;
}>;

export type GameState = Readonly<{
  players: readonly PlayerState[];
  roundWind: RoundWind;
  kyoku: number; // 1 to 4
  honba: number;
  kyoutaku: number; // Number of 1,000 pt sticks
  wall: readonly Tile[];
  deadWall: readonly Tile[];
  doraIndicators: readonly Tile[];
  uraDoraIndicators: readonly Tile[];
  currentTurn: number; // Index of player whose turn it is (0 to 3)
  phase: GamePhase;
  activeDrawTile: Tile | null; // Tile drawn by active player (not yet discarded)
  activeDiscardTile: Tile | null; // Tile discarded, waiting for reaction
  activeDiscardPlayerIndex: number;
  reactionDecisions: Readonly<Record<PlayerId, GameAction | null>>;
  roundResult: RoundEndResult | null;
  rule: GameRule;
}>;

export type GameAction =
  | Readonly<{ type: "discard"; tile: Tile }>
  | Readonly<{ type: "riichi"; tile: Tile }>
  | Readonly<{ type: "tsumo" }>
  | Readonly<{ type: "ron" }>
  | Readonly<{ type: "pon"; targetTile: Tile }>
  | Readonly<{ type: "kan"; targetTile: Tile; isAnkan?: boolean; isKakan?: boolean }>
  | Readonly<{ type: "chi"; targetTile: Tile; tiles: readonly Tile[] }> // targetTile is the discarded tile, tiles is the two from hand
  | Readonly<{ type: "pass" }>;
