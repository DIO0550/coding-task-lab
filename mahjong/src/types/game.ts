import type { SeatWind, RoundWind, WinType, MeldInput } from "./input";

export type MatchLength = "tonpuu" | "hanchan";
export type InitialScore = 25000 | 30000;
export type ReturnScore = 30000 | 0;
export type CpuLevel = "beginner" | "standard" | "advanced";

export type RuleConfig = Readonly<{
  length: MatchLength;
  initialScore: InitialScore;
  returnScore: ReturnScore;
  kuiTan: boolean;
  atoZuke: boolean;
  akaDora: boolean;
  cpuAutoWin: boolean;
}>;

export type PlayerType = "human" | "cpu";

export type PlayerConfig = Readonly<{
  type: PlayerType;
  name: string;
  cpuLevel: CpuLevel;
}>;

export type GamePhase =
  | "setup"
  | "turn_draw"
  | "turn_discard"
  | "response_phase"
  | "round_end"
  | "match_end";

export type ActionType =
  | "discard"
  | "chi"
  | "pon"
  | "kan"
  | "ankan"
  | "kankan"
  | "riichi"
  | "tsumo"
  | "ron"
  | "pass";

export type ActionOption = Readonly<{
  type: ActionType;
  tile?: string;
  meldTiles?: readonly string[];
  targetPlayerIndex?: number;
}>;

export type PlayerState = Readonly<{
  index: number;
  seatWind: SeatWind;
  name: string;
  type: PlayerType;
  cpuLevel: CpuLevel;
  score: number;
  hand: readonly string[];
  melds: readonly MeldInput[];
  discards: readonly string[];
  riichiState: "none" | "riichi" | "double";
  isIppatsu: boolean;
  isFuriten: boolean;
  isTenpai: boolean;
}>;

export type TableState = Readonly<{
  roundWind: RoundWind;
  roundNumber: number;
  honba: number;
  kyoutaku: number;
  dealerIndex: number;
  currentTurnIndex: number;
  wall: readonly string[];
  deadWall: readonly string[];
  doraIndicators: readonly string[];
  uraDoraIndicators: readonly string[];
  lastDiscard?: Readonly<{
    tile: string;
    fromPlayerIndex: number;
  }>;
}>;

export type RoundEndResult = Readonly<{
  type: "win" | "draw";
  winners?: readonly Readonly<{
    playerIndex: number;
    winType: WinType;
    yaku: readonly { name: string; han: number }[];
    han: number;
    fu: number;
    totalScore: number;
    payments: readonly { from: number; amount: number }[];
    loserIndex?: number;
  }>[];
  tenpaiPlayerIndexes?: readonly number[];
  reason?: string;
}>;

export type FinalRanking = Readonly<{
  rank: number;
  playerIndex: number;
  name: string;
  score: number;
  point: number;
}>;

export type GameState = Readonly<{
  phase: GamePhase;
  rules: RuleConfig;
  players: readonly PlayerState[];
  table: TableState;
  availableActions: readonly ActionOption[];
  pendingResponses?: readonly Readonly<{
    playerIndex: number;
    actions: readonly ActionOption[];
  }>[];
  lastRoundResult?: RoundEndResult;
  finalRankings?: readonly FinalRanking[];
}>;
