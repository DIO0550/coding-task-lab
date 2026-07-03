import type { Meld } from "../meld/index.ts";
import type { Tile } from "../tile/index.ts";

export type SeatIndex = 0 | 1 | 2 | 3;
export type CpuLevel = "beginner" | "standard" | "advanced";

export type PlayerConfig = Readonly<{
  kind: "human" | "cpu";
  name: string;
  cpuLevel: CpuLevel | null;
}>;

export type RuleSet = Readonly<{
  matchType: "tonpuu" | "hanchan";
  startingPoints: 25000 | 30000;
  returnPoints: 30000 | null;
  kuitan: boolean;
  atozuke: boolean;
  redDora: boolean;
  cpuAutoWin: boolean;
}>;

export type MatchConfig = Readonly<{
  players: readonly [PlayerConfig, PlayerConfig, PlayerConfig, PlayerConfig];
  rules: RuleSet;
}>;

/** 河の1枚。リーチ宣言牌かどうかを表示のため保持する。 */
export type RiverTile = Readonly<{
  tile: Tile;
  riichiDeclare: boolean;
}>;

export type RiichiState = "none" | "riichi" | "double";

export type PlayerState = Readonly<{
  hand: readonly Tile[];
  drawnTile: Tile | null;
  melds: readonly Meld[];
  river: readonly RiverTile[];
  score: number;
  riichi: RiichiState;
  ippatsuEligible: boolean;
  temporaryFuriten: boolean;
  permanentFuriten: boolean;
  hasDrawnThisKyoku: boolean;
}>;

export type ClaimDeclaration =
  | Readonly<{ type: "pass" }>
  | Readonly<{ type: "ron" }>
  | Readonly<{ type: "pon" }>
  | Readonly<{ type: "kan" }>
  | Readonly<{ type: "chi"; tiles: readonly [Tile, Tile] }>;

export type ClaimsPhase = Readonly<{
  type: "claims";
  kind: "discard" | "chankan";
  sourceSeat: SeatIndex;
  tile: Tile;
  eligible: readonly SeatIndex[];
  responses: readonly Readonly<{ seat: SeatIndex; declaration: ClaimDeclaration }>[];
}>;

export type RankingEntry = Readonly<{ seat: SeatIndex; score: number; rank: 1 | 2 | 3 | 4 }>;

export type WinRoundEndResult = Readonly<{
  type: "win";
  winner: SeatIndex;
  winType: "tsumo" | "ron";
  discarder: SeatIndex | null;
  isDealerWin: boolean;
  han: number;
  fu: number;
  yaku: readonly Readonly<{ name: string; han: number }>[];
  scoreTotal: number;
  doraIndicators: readonly Tile[];
  uraDoraIndicators: readonly Tile[];
  payments: readonly Readonly<{ seat: SeatIndex; amount: number }>[];
  scores: readonly [number, number, number, number];
}>;

export type RyuukyokuRoundEndResult = Readonly<{
  type: "ryuukyoku";
  tenpaiSeats: readonly SeatIndex[];
  payments: readonly Readonly<{ seat: SeatIndex; amount: number }>[];
  scores: readonly [number, number, number, number];
}>;

export type RoundEndResult = WinRoundEndResult | RyuukyokuRoundEndResult;

export type NextKyokuPlan =
  | Readonly<{
      type: "continue";
      roundWind: "ton" | "nan";
      kyokuNumber: 1 | 2 | 3 | 4;
      honba: number;
      kyotaku: number;
      dealerSeat: SeatIndex;
    }>
  | Readonly<{ type: "end"; ranking: readonly RankingEntry[] }>;

export type Phase =
  | Readonly<{ type: "turn"; actor: SeatIndex; drawSource: "wall" | "rinshan" }>
  | ClaimsPhase
  | Readonly<{ type: "round_end"; result: RoundEndResult; nextKyoku: NextKyokuPlan }>
  | Readonly<{ type: "match_end"; ranking: readonly RankingEntry[] }>;

export type MatchState = Readonly<{
  config: MatchConfig;
  roundWind: "ton" | "nan";
  kyokuNumber: 1 | 2 | 3 | 4;
  honba: number;
  kyotaku: number;
  dealerSeat: SeatIndex;
  players: readonly [PlayerState, PlayerState, PlayerState, PlayerState];
  wall: readonly Tile[];
  drawIndex: number;
  kanCount: number;
  anyCallHappened: boolean;
  rngSeed: number;
  phase: Phase;
}>;

/** 新しい局を組み立てるための情報(Deal.deal の引数)。 */
export type KyokuInfo = Readonly<{
  roundWind: "ton" | "nan";
  kyokuNumber: 1 | 2 | 3 | 4;
  honba: number;
  kyotaku: number;
  dealerSeat: SeatIndex;
  scores: readonly [number, number, number, number];
  rngSeed: number;
}>;

export type GameViewPlayer = Readonly<{
  seat: SeatIndex;
  river: readonly RiverTile[];
  melds: readonly Meld[];
  score: number;
  riichi: RiichiState;
  handCount: number;
}>;

export type GameView = Readonly<{
  seat: SeatIndex;
  hand: readonly Tile[];
  drawnTile: Tile | null;
  players: readonly [GameViewPlayer, GameViewPlayer, GameViewPlayer, GameViewPlayer];
  doraIndicators: readonly Tile[];
  remainingWallCount: number;
  roundWind: "ton" | "nan";
  kyokuNumber: 1 | 2 | 3 | 4;
  honba: number;
  kyotaku: number;
  dealerSeat: SeatIndex;
  phase: "turn" | "claims" | "round_end" | "match_end";
  legalActions: readonly LegalAction[];
  roundEndResult: RoundEndResult | null;
  ranking: readonly RankingEntry[] | null;
}>;

export type GameAction =
  | Readonly<{ type: "discard"; seat: SeatIndex; tile: Tile; riichi: boolean }>
  | Readonly<{ type: "tsumo"; seat: SeatIndex }>
  | Readonly<{ type: "ron"; seat: SeatIndex }>
  | Readonly<{ type: "pon"; seat: SeatIndex }>
  | Readonly<{ type: "chi"; seat: SeatIndex; tiles: readonly [Tile, Tile] }>
  | Readonly<{ type: "kan"; seat: SeatIndex; tile: Tile }>
  | Readonly<{ type: "pass"; seat: SeatIndex }>
  | Readonly<{ type: "confirm" }>;

export type LegalAction =
  | Readonly<{ type: "discard"; seat: SeatIndex; tiles: readonly Tile[] }>
  | Readonly<{ type: "riichi"; seat: SeatIndex; tiles: readonly Tile[] }>
  | Readonly<{ type: "tsumo"; seat: SeatIndex }>
  | Readonly<{ type: "ron"; seat: SeatIndex }>
  | Readonly<{ type: "pon"; seat: SeatIndex }>
  | Readonly<{ type: "chi"; seat: SeatIndex; options: readonly (readonly [Tile, Tile])[] }>
  | Readonly<{ type: "kan"; seat: SeatIndex; tiles: readonly Tile[] }>
  | Readonly<{ type: "pass"; seat: SeatIndex }>;
