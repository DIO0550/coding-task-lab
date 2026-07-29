import { Hand } from "../hand/index.ts";
import type { Meld } from "../meld/index.ts";
import { River } from "../river/index.ts";
import type { RoundResult } from "../round-result/index.ts";
import { Tile } from "../tile/index.ts";
import { Wall } from "../wall/index.ts";
import type { Wind } from "../wind/index.ts";
import { SeatState } from "./seat/index.ts";

/** 局の進行フェーズ。 */
export type RoundPhase = "draw" | "action" | "claim" | "finished";

/** 打牌・加槓に対する応答。 */
export type ClaimResponse =
  | Readonly<{ kind: "pass" }>
  | Readonly<{ kind: "ron" }>
  | Readonly<{ kind: "pon"; tiles: readonly Tile[] }>
  | Readonly<{ kind: "kan"; tiles: readonly Tile[] }>
  | Readonly<{ kind: "chi"; tiles: readonly Tile[] }>;

/** 応答待ちの打牌(または加槓)。 */
export type PendingClaim = Readonly<{
  /** 打牌した席。 */
  from: number;
  tile: Tile;
  /** 加槓に対する槍槓待ちか。 */
  chankan: boolean;
  /** 席ごとの応答。未応答は null。 */
  responses: readonly (ClaimResponse | null)[];
}>;

/** 局の状態。 */
export type RoundState = Readonly<{
  roundWind: Wind;
  roundNumber: number;
  /** 親の席。 */
  dealer: number;
  honba: number;
  /** 供託リーチ棒(持ち越し分 + 当局の宣言分)。 */
  riichiSticks: number;
  wall: Wall;
  seats: readonly SeatState[];
  /** 現在の手番。 */
  turn: number;
  /** 手番プレイヤーがツモった牌(打牌前のみ)。 */
  drawn: Tile | null;
  /** 直前のツモが嶺上牌だったか。 */
  afterKan: boolean;
  phase: RoundPhase;
  pending: PendingClaim | null;
  /** 打牌された総数。 */
  discardCount: number;
  /** 副露が一度でも行われたか。 */
  called: boolean;
  result: RoundResult | null;
}>;

export type RoundStartParams = Readonly<{
  roundWind: Wind;
  roundNumber: number;
  dealer: number;
  honba: number;
  riichiSticks: number;
  wall: Wall;
}>;

const SEAT_COUNT = 4;
const HAND_SIZE = 13;

const NO_RESPONSES: readonly (ClaimResponse | null)[] = [null, null, null, null];

const replaceSeat = (
  seats: readonly SeatState[],
  index: number,
  next: SeatState,
): readonly SeatState[] =>
  seats.map((seat, current) => (current === index ? next : seat));

const clearAllIppatsu = (seats: readonly SeatState[]): readonly SeatState[] =>
  seats.map((seat) => SeatState.clearIppatsu(seat));

export const Round = {
  /** 配牌して局を開始する。 */
  start(params: RoundStartParams): RoundState {
    const dealt = Array.from({ length: SEAT_COUNT }).reduce<
      Readonly<{ wall: Wall; hands: readonly Hand[] }>
    >(
      (current) => {
        const drawn = Wall.deal(current.wall, HAND_SIZE);
        return {
          wall: drawn.wall,
          hands: [...current.hands, Hand.create(drawn.tiles)],
        };
      },
      { wall: params.wall, hands: [] },
    );

    return {
      roundWind: params.roundWind,
      roundNumber: params.roundNumber,
      dealer: params.dealer,
      honba: params.honba,
      riichiSticks: params.riichiSticks,
      wall: dealt.wall,
      seats: dealt.hands.map((hand) => SeatState.create(hand)),
      turn: params.dealer,
      drawn: null,
      afterKan: false,
      phase: "draw",
      pending: null,
      discardCount: 0,
      called: false,
      result: null,
    };
  },

  /** 指定した席の状態。 */
  seat(round: RoundState, seat: number): SeatState {
    return round.seats[seat];
  },

  /** 手番プレイヤーの状態。 */
  currentSeat(round: RoundState): SeatState {
    return round.seats[round.turn];
  },

  /** 残りツモ可能枚数。 */
  remaining(round: RoundState): number {
    return Wall.remaining(round.wall);
  },

  /** 現在のドラ。 */
  dora(round: RoundState): readonly Tile[] {
    return Wall.dora(round.wall);
  },

  /** 現在の裏ドラ。 */
  uraDora(round: RoundState): readonly Tile[] {
    return Wall.uraDora(round.wall);
  },

  /** 天和・地和の対象となる第一ツモか。 */
  isFirstDraw(round: RoundState, seat: number): boolean {
    return !round.called && round.seats[seat].river.discards.length === 0;
  },

  /** ダブルリーチが成立する状況か。 */
  isDoubleRiichiChance(round: RoundState, seat: number): boolean {
    return !round.called && round.seats[seat].river.discards.length === 0;
  },

  /** 山からツモる。ツモれない場合は null。 */
  drawFromWall(round: RoundState): RoundState | null {
    const drawn = Wall.draw(round.wall);
    if (drawn === null) {
      return null;
    }
    const seat = SeatState.clearTemporaryFuriten(round.seats[round.turn]);
    return {
      ...round,
      wall: drawn.wall,
      seats: replaceSeat(
        round.seats,
        round.turn,
        SeatState.draw(seat, drawn.tile),
      ),
      drawn: drawn.tile,
      afterKan: false,
      phase: "action",
    };
  },

  /** 嶺上牌をツモる。 */
  drawReplacement(round: RoundState): RoundState | null {
    const drawn = Wall.drawReplacement(round.wall);
    if (drawn === null) {
      return null;
    }
    const seat = SeatState.clearTemporaryFuriten(round.seats[round.turn]);
    return {
      ...round,
      wall: drawn.wall,
      seats: replaceSeat(
        round.seats,
        round.turn,
        SeatState.draw(seat, drawn.tile),
      ),
      drawn: drawn.tile,
      afterKan: true,
      phase: "action",
    };
  },

  /** 打牌する。応答待ちフェーズへ移る。 */
  discard(
    round: RoundState,
    tile: Tile,
    options: Readonly<{ riichi: boolean }> = { riichi: false },
  ): RoundState {
    const current = round.seats[round.turn];
    const tsumogiri =
      round.drawn !== null &&
      Tile.isSameKind(round.drawn, tile) &&
      round.drawn.red === tile.red;
    const discarded = SeatState.discard(current, tile, {
      tile,
      riichi: options.riichi,
      called: false,
      tsumogiri,
    });
    const next = options.riichi
      ? SeatState.declareRiichi(
          discarded,
          Round.isDoubleRiichiChance(round, round.turn),
        )
      : SeatState.clearIppatsu(discarded);

    return {
      ...round,
      seats: replaceSeat(round.seats, round.turn, next),
      riichiSticks: round.riichiSticks + (options.riichi ? 1 : 0),
      drawn: null,
      afterKan: false,
      phase: "claim",
      pending: {
        from: round.turn,
        tile,
        chankan: false,
        responses: NO_RESPONSES,
      },
      discardCount: round.discardCount + 1,
    };
  },

  /** 加槓に対する槍槓の応答待ちにする。 */
  awaitChankan(round: RoundState, tile: Tile): RoundState {
    return {
      ...round,
      phase: "claim",
      pending: {
        from: round.turn,
        tile,
        chankan: true,
        responses: NO_RESPONSES,
      },
    };
  },

  /** 応答を記録する。 */
  respond(
    round: RoundState,
    seat: number,
    response: ClaimResponse,
  ): RoundState {
    if (round.pending === null) {
      return round;
    }
    return {
      ...round,
      pending: {
        ...round.pending,
        responses: round.pending.responses.map((current, index) =>
          index === seat ? response : current,
        ),
      },
    };
  },

  /** 応答待ちを解除して手番を次へ進める。 */
  advanceTurn(round: RoundState): RoundState {
    return {
      ...round,
      turn: (round.turn + 1) % SEAT_COUNT,
      drawn: null,
      afterKan: false,
      phase: "draw",
      pending: null,
    };
  },

  /** 同巡内フリテンを記録する(和了牌を見逃した場合)。 */
  markMissedWin(round: RoundState, seat: number): RoundState {
    const current = round.seats[seat];
    const next = current.riichi
      ? SeatState.markPermanentFuriten(current)
      : SeatState.markTemporaryFuriten(current);
    return { ...round, seats: replaceSeat(round.seats, seat, next) };
  },

  /** 副露を成立させ、鳴いた席の手番にする。 */
  applyCall(
    round: RoundState,
    seat: number,
    meld: Meld,
    usedTiles: readonly Tile[],
  ): RoundState {
    const discarder = meld.fromSeat;
    const withCalledRiver =
      discarder === null
        ? round.seats
        : replaceSeat(round.seats, discarder, {
            ...round.seats[discarder],
            river: River.markLastAsCalled(round.seats[discarder].river),
          });
    const called = SeatState.addMeld(withCalledRiver[seat], meld, usedTiles);
    return {
      ...round,
      seats: clearAllIppatsu(replaceSeat(withCalledRiver, seat, called)),
      turn: seat,
      drawn: null,
      afterKan: false,
      phase: "action",
      pending: null,
      called: true,
    };
  },

  /** 暗槓・加槓を成立させる(手番は変わらない)。 */
  applySelfKan(
    round: RoundState,
    melds: readonly Meld[],
    concealed: readonly Tile[],
  ): RoundState {
    const current = round.seats[round.turn];
    return {
      ...round,
      seats: clearAllIppatsu(
        replaceSeat(round.seats, round.turn, {
          ...current,
          hand: Hand.create(concealed, melds),
        }),
      ),
      drawn: null,
      phase: "action",
      pending: null,
      called: true,
    };
  },

  /** 局を終了させる。 */
  finish(round: RoundState, result: RoundResult): RoundState {
    return { ...round, phase: "finished", pending: null, result };
  },

  /** 局が終了しているか。 */
  isFinished(round: RoundState): boolean {
    return round.phase === "finished";
  },

  /** 各家のテンパイ状況。 */
  tenpaiFlags(round: RoundState): readonly boolean[] {
    return round.seats.map((seat) => SeatState.isTenpai(seat));
  },
} as const;
