import type { Meld } from "@/src/domains/meld";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import { SeatState } from "@/src/domains/seat-state";
import type { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import type { Wind } from "@/src/domains/wind";
import type { ScoringResult, WinType } from "@/src/types/scoring";

/**
 * 1局の状態。配牌からツモ・打牌・鳴きを経て、和了または流局で `ended` に至る。
 *
 * - `action`: `seat` がツモ(または鳴き)直後で、ツモ和了・カン・リーチ・打牌のいずれかを選ぶ
 * - `call`: `discarder` の打牌(加槓なら槍槓対象牌)に対し `candidates` の応答を待っている
 * - `ended`: 局が終わり、結果の確定待ち
 */
export type CallResponse =
  | Readonly<{ type: "ron" }>
  | Readonly<{ type: "pon"; tiles: readonly [Tile, Tile] }>
  | Readonly<{ type: "kan" }>
  | Readonly<{ type: "chi"; tiles: readonly [Tile, Tile] }>
  | Readonly<{ type: "pass" }>;

export type ActionPhase = Readonly<{
  type: "action";
  seat: SeatIndex;
  /** 直前がカンで、嶺上牌をツモった状態 */
  afterKan: boolean;
  /** 鳴いた直後に打てない牌(現物の喰い替え禁止) */
  forbiddenDiscard: Tile | null;
}>;

export type CallPhase = Readonly<{
  type: "call";
  discarder: SeatIndex;
  tile: Tile;
  isChankan: boolean;
  /** 海底牌の後の打牌(河底)。ロン以外の鳴きはできない */
  isHoutei: boolean;
  candidates: readonly SeatIndex[];
  /** ロンできる席(見逃しフリテンの判定に使う) */
  ronCandidates: readonly SeatIndex[];
  /** 席番号で添字付けした応答。未応答は null */
  responses: readonly (CallResponse | null)[];
}>;

export type EndedPhase = Readonly<{
  type: "ended";
  result: RoundResult;
}>;

export type RoundPhase = ActionPhase | CallPhase | EndedPhase;

export type ValidScoring = Extract<ScoringResult, { valid: true }>;

export type WinResult = Readonly<{
  type: "win";
  winner: SeatIndex;
  /** ロンの放銃者。ツモなら null */
  loser: SeatIndex | null;
  winType: WinType;
  winTile: Tile;
  hand: readonly Tile[];
  melds: readonly Meld[];
  scoring: ValidScoring;
  /** 席ごとの点数増減 */
  deltas: readonly number[];
  dealerContinues: boolean;
  doraIndicators: readonly Tile[];
  uraDoraIndicators: readonly Tile[];
}>;

export type DrawResult = Readonly<{
  type: "draw";
  tenpaiSeats: readonly SeatIndex[];
  deltas: readonly number[];
  dealerContinues: boolean;
}>;

export type RoundResult = WinResult | DrawResult;

export type RoundState = Readonly<{
  roundWind: Wind;
  /** 1〜4 */
  roundNumber: number;
  honba: number;
  /** 供託リーチ棒の本数 */
  kyotaku: number;
  dealer: SeatIndex;
  wall: Wall;
  seats: readonly SeatState[];
  phase: RoundPhase;
  kanCount: number;
  /** この局で鳴き(暗槓含む)が発生したか(ダブルリーチ・地和・一発の判定に使う) */
  callOccurred: boolean;
}>;

export type RoundSetup = Readonly<{
  roundWind: Wind;
  roundNumber: number;
  honba: number;
  kyotaku: number;
  dealer: SeatIndex;
  wall: Wall;
}>;

export const RoundState = {
  /** 配牌して親の第一ツモまで済ませた局を作る */
  create(setup: RoundSetup): RoundState {
    const dealt = Wall.deal(setup.wall, setup.dealer);
    const drawn = Wall.draw(dealt.wall);
    const wall = drawn?.wall ?? dealt.wall;
    const seats = dealt.hands.map((hand, seat) =>
      seat === setup.dealer && drawn !== undefined ? SeatState.draw(SeatState.create(hand), drawn.tile) : SeatState.create(hand),
    );
    return {
      roundWind: setup.roundWind,
      roundNumber: setup.roundNumber,
      honba: setup.honba,
      kyotaku: setup.kyotaku,
      dealer: setup.dealer,
      wall,
      seats,
      phase: { type: "action", seat: setup.dealer, afterKan: false, forbiddenDiscard: null },
      kanCount: 0,
      callOccurred: false,
    };
  },

  seat(round: RoundState, seat: SeatIndex): SeatState {
    return round.seats[seat];
  },

  updateSeat(round: RoundState, seat: SeatIndex, updater: (state: SeatState) => SeatState): RoundState {
    return { ...round, seats: round.seats.map((state, index) => (index === seat ? updater(state) : state)) };
  },

  updateAllSeats(round: RoundState, updater: (state: SeatState) => SeatState): RoundState {
    return { ...round, seats: round.seats.map(updater) };
  },

  withPhase(round: RoundState, phase: RoundPhase): RoundState {
    return { ...round, phase };
  },

  withWall(round: RoundState, wall: Wall): RoundState {
    return { ...round, wall };
  },

  remaining(round: RoundState): number {
    return Wall.remaining(round.wall);
  },

  seatWind(round: RoundState, seat: SeatIndex): Wind {
    return Seat.windOf(seat, round.dealer);
  },

  isDealer(round: RoundState, seat: SeatIndex): boolean {
    return round.dealer === seat;
  },

  /** 鳴き(暗槓含む)が発生した: 全員の一発が消える */
  markCallOccurred(round: RoundState): RoundState {
    return { ...RoundState.updateAllSeats(round, SeatState.clearIppatsu), callOccurred: true };
  },

  /** 現在行動を求められている席 */
  pendingSeats(round: RoundState): readonly SeatIndex[] {
    switch (round.phase.type) {
      case "action":
        return [round.phase.seat];
      case "call": {
        const { candidates, responses } = round.phase;
        return candidates.filter((seat) => responses[seat] === null);
      }
      case "ended":
        return [];
    }
  },

  /** 直近の打牌(河に残っているもの) */
  lastDiscard(round: RoundState): Readonly<{ seat: SeatIndex; tile: Tile }> | null {
    if (round.phase.type === "call" && !round.phase.isChankan) {
      return { seat: round.phase.discarder, tile: round.phase.tile };
    }
    const previous = round.phase.type === "action" ? Seat.previous(round.phase.seat) : null;
    const river = previous === null ? [] : round.seats[previous].river;
    const last = river[river.length - 1];
    return previous !== null && last !== undefined && last.calledBy === null ? { seat: previous, tile: last.tile } : null;
  },
} as const;
