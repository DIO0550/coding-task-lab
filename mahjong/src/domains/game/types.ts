import type { Tile } from "../tile/index.ts";
import type { Meld } from "../meld/index.ts";
import type { WinResult } from "../scoring/index.ts";
import type { Wall } from "../wall/index.ts";

/** 物理席。開局時 seat0=起家(東家)。席は固定で風だけが親位置に応じて回る */
export type Seat = 0 | 1 | 2 | 3;

export type CpuLevel = "beginner" | "standard" | "advanced";

export type OperatorKind = "human" | "cpu";

export type RuleConfig = Readonly<{
  /** 東風戦 / 半荘戦 */
  format: "tonpuu" | "hanchan";
  startingPoints: number;
  /** 返し点(なし=null)。順位は素点のみで決めるため表示用 */
  returnPoints: number | null;
  kuitan: boolean;
  atozuke: boolean;
  akaDora: boolean;
  cpuAutoWin: boolean;
}>;

export type PlayerConfig = Readonly<{
  kind: OperatorKind;
  name: string;
  /** CPU の場合のみ指定(人間は null) */
  level: CpuLevel | null;
}>;

/** 副露面子。ankan は calledFrom=null / calledTile=null */
export type CalledMeld = Readonly<{
  meld: Meld;
  calledFrom: Seat | null;
  calledTile: Tile | null;
}>;

/** 河の1枚 */
export type Discard = Readonly<{
  tile: Tile;
  tsumogiri: boolean;
  riichiDeclare: boolean;
  /** 鳴かれた場合の鳴いた席 */
  calledBy: Seat | null;
}>;

export type RiichiState = "none" | "riichi" | "double";

export type PlayerState = Readonly<{
  seat: Seat;
  config: PlayerConfig;
  points: number;
  /** 面前手牌(直前ツモ牌 drawn は含まない)。常に 13 - 3×副露数 枚 */
  hand: readonly Tile[];
  /** 直前ツモ牌(手番でツモ直後のみ非null) */
  drawn: Tile | null;
  melds: readonly CalledMeld[];
  discards: readonly Discard[];
  riichi: RiichiState;
  /** 一発権(リーチ宣言後、次の自分の打牌までに鳴きが入らなければ有効) */
  ippatsu: boolean;
  /** ダブルリーチ資格(第一巡・鳴きなし)。宣言時に参照する */
  doubleRiichiEligible?: boolean;
  /** リーチ後に和了牌を見逃した(以降ロン不可) */
  riichiFuriten: boolean;
}>;

export type Phase =
  | "action"
  | "response"
  | "result_win"
  | "result_draw"
  | "round_end"
  | "game_end";

export type SeatWind = "ton" | "nan" | "sha" | "pei";

/** 打牌/加槓への宣言(応答フェーズで収集し、全員分そろってから優先順位で解決する) */
export type Declaration = Readonly<{ seat: Seat; action: Action }>;

/** 加槓の保留(槍槓の機会を先に与え、全員パスなら成立させる) */
export type PendingKakan = Readonly<{ seat: Seat; tile: Tile }>;

export type GameState = Readonly<{
  rule: RuleConfig;
  /** index = seat */
  players: readonly PlayerState[];
  /** 現在の親 */
  dealer: Seat;
  roundWind: "ton" | "nan";
  /** 局番号 1..4 */
  roundNumber: number;
  honba: number;
  riichiSticks: number;
  wall: Wall;
  /** 現在手番(action 時) */
  turn: Seat;
  phase: Phase;
  lastDiscard: Readonly<{ seat: Seat; tile: Tile }> | null;
  /** response 時、まだ宣言/パスしていない席(打牌者からの回り順) */
  pendingResponders?: readonly Seat[];
  /** result_win / result_draw 時の局結果 */
  result?: RoundResult;
  /** 手番プレイヤーの直前ツモの種別(海底・嶺上判定用) */
  lastDrawKind: "wall" | "rinshan" | null;
  /** response 時に収集済みの宣言(パスは積まない) */
  declarations?: readonly Declaration[];
  /** response の対象("discard"=打牌、"kakan"=加槓への槍槓機会) */
  responseKind?: "discard" | "kakan";
  /** 槍槓応答中の加槓 */
  pendingKakan?: PendingKakan;
  /** 次局の牌山シャッフルに使う決定的 seed(confirmResult が消費・更新する) */
  wallSeed: number;
}>;

/** CPU/UI 共通の操作 */
export type Action =
  | Readonly<{ type: "discard"; tile: Tile }>
  | Readonly<{ type: "riichi"; tile: Tile }>
  | Readonly<{ type: "tsumo" }>
  | Readonly<{ type: "ron" }>
  | Readonly<{ type: "chi"; tiles: readonly [Tile, Tile] }>
  | Readonly<{ type: "pon"; tiles: readonly [Tile, Tile] }>
  | Readonly<{ type: "kan"; tile: Tile; kind: "ankan" | "minkan" | "kakan" }>
  | Readonly<{ type: "pass" }>;

/** 他家に公開される情報のみを持つプレイヤービュー */
export type PublicPlayer = Readonly<{
  seat: Seat;
  name: string;
  wind: SeatWind;
  points: number;
  isDealer: boolean;
  melds: readonly CalledMeld[];
  discards: readonly Discard[];
  riichi: RiichiState;
  /** 手牌枚数(ツモ牌含む) */
  handCount: number;
}>;

/** ある席から見た卓面(他家の手牌・山の中身は含まない) */
export type PlayerView = Readonly<{
  self: Seat;
  hand: readonly Tile[];
  drawn: Tile | null;
  melds: readonly CalledMeld[];
  players: readonly PublicPlayer[];
  doraIndicators: readonly Tile[];
  roundWind: "ton" | "nan";
  roundNumber: number;
  honba: number;
  riichiSticks: number;
  wallRemaining: number;
  phase: Phase;
  lastDiscard: Readonly<{ seat: Seat; tile: Tile }> | null;
  legalActions: readonly Action[];
}>;

export type RoundResult =
  | Readonly<{
      kind: "win";
      winner: Seat;
      /** ロン時の放銃者(ツモは null) */
      loser: Seat | null;
      winType: "tsumo" | "ron";
      score: WinResult;
      /** confirmResult で各席の持ち点に加算する増減(供託回収・本場込み) */
      pointDeltas: readonly number[];
      dealerContinues: boolean;
    }>
  | Readonly<{
      kind: "draw";
      tenpai: readonly boolean[];
      pointDeltas: readonly number[];
      dealerContinues: boolean;
    }>;

export const SEATS: readonly Seat[] = [0, 1, 2, 3];

export const SEAT_WINDS: readonly SeatWind[] = ["ton", "nan", "sha", "pei"];

/** 下家(次の席) */
export const nextSeat = (seat: Seat): Seat => (((seat + 1) % 4) as Seat);

/** base から見て steps 席先 */
export const seatAfter = (base: Seat, steps: number): Seat =>
  (((base + steps) % 4) as Seat);

/** 打牌者 from から見た回り順(from の下家→対面→上家) */
export const seatsAfter = (from: Seat): readonly Seat[] => [
  seatAfter(from, 1),
  seatAfter(from, 2),
  seatAfter(from, 3),
];

/** 親位置から自風を求める(親=東) */
export const windOfSeat = (dealer: Seat, seat: Seat): SeatWind =>
  SEAT_WINDS[(seat - dealer + 4) % 4];
