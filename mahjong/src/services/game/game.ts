import { Hand } from "../../domains/hand/index.ts";
import { Match } from "../../domains/match/index.ts";
import type { Ranking } from "../../domains/match/index.ts";
import { Meld } from "../../domains/meld/index.ts";
import { Participant } from "../../domains/participant/index.ts";
import { Round, SeatState } from "../../domains/round/index.ts";
import type { ClaimResponse, RoundState } from "../../domains/round/index.ts";
import type { RoundResult } from "../../domains/round-result/index.ts";
import { Rule } from "../../domains/rule/index.ts";
import { Score } from "../../domains/score/index.ts";
import type { Payment } from "../../domains/score/index.ts";
import { Tile } from "../../domains/tile/index.ts";
import { Wall } from "../../domains/wall/index.ts";
import { WinContext } from "../../domains/win-context/index.ts";
import type { SituationalYaku, WinType } from "../../domains/win-context/index.ts";
import { Wind } from "../../domains/wind/index.ts";
import type { Rng } from "../../types/rng.ts";
import { ScoreCalculation } from "../score-calculation/index.ts";
import type { ScoreOutcome, ScoreResult } from "../score-calculation/index.ts";
import { GameAction } from "./action/index.ts";
import { Cpu } from "./cpu/index.ts";
import { PlayerView } from "./view/index.ts";

/** 対戦の進行状況。 */
export type GameStatus = "playing" | "round_end" | "match_end";

/** 対戦セッション。画面はこの1つの値だけを持てばよい。 */
export type GameSession = Readonly<{
  match: Match;
  round: RoundState;
  status: GameStatus;
  ranking: readonly Ranking[] | null;
  /** 牌山生成に使う乱数。制御不能な入力の注入口。 */
  rng: Rng;
}>;

const SEAT_COUNT = 4;
const RIICHI_COST = 1000;
const MIN_TILES_FOR_RIICHI = 4;
const SEATS: readonly number[] = [0, 1, 2, 3];

const shuffle = (tiles: readonly Tile[], rng: Rng): readonly Tile[] => {
  const shuffled = [...tiles];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    const swapped = shuffled[index];
    shuffled[index] = shuffled[target];
    shuffled[target] = swapped;
  }
  return shuffled;
};

const createRound = (match: Match, rng: Rng): RoundState =>
  Round.start({
    roundWind: match.roundWind,
    roundNumber: match.roundNumber,
    dealer: match.dealer,
    honba: match.honba,
    riichiSticks: match.riichiSticks,
    wall: Wall.create(shuffle(Wall.buildTiles(match.rule.redDora), rng)),
  });

const scoreOptions = (rule: Rule) => ({
  kuitan: rule.kuitan,
  atozuke: rule.atozuke,
});

const situationalOf = (
  round: RoundState,
  seat: number,
  winType: WinType,
): readonly SituationalYaku[] => {
  const isTsumo = winType === "tsumo";
  const last = Round.remaining(round) === 0;
  const first = Round.isFirstDraw(round, seat);
  return [
    ...(isTsumo && last ? (["haitei"] as const) : []),
    ...(!isTsumo && last ? (["houtei"] as const) : []),
    ...(isTsumo && round.afterKan ? (["rinshan"] as const) : []),
    ...(!isTsumo && round.pending?.chankan === true
      ? (["chankan"] as const)
      : []),
    ...(isTsumo && first && seat === round.dealer
      ? (["tenhou"] as const)
      : []),
    ...(isTsumo && first && seat !== round.dealer ? (["chihou"] as const) : []),
  ];
};

const winContextOf = (
  round: RoundState,
  seat: number,
  winTile: Tile,
  winType: WinType,
): WinContext => {
  const seatState = round.seats[seat];
  return WinContext.create({
    winTile,
    winType,
    seatWind: Wind.ofSeat(seat, round.dealer),
    roundWind: round.roundWind,
    dora: Wall.dora(round.wall),
    uraDora: seatState.riichi ? Wall.uraDora(round.wall) : [],
    riichi: seatState.doubleRiichi
      ? "double"
      : seatState.riichi
        ? "riichi"
        : "none",
    ippatsu: seatState.ippatsu,
    situational: situationalOf(round, seat, winType),
    honba: round.honba,
    riichiSticks: round.riichiSticks,
  });
};

const winOutcome = (
  session: GameSession,
  seat: number,
  winTile: Tile,
  winType: WinType,
): ScoreOutcome => {
  const { round } = session;
  const base = round.seats[seat].hand;
  const hand = winType === "tsumo" ? base : Hand.add(base, winTile);
  return ScoreCalculation.calculate(
    hand,
    winContextOf(round, seat, winTile, winType),
    scoreOptions(session.match.rule),
  );
};

const isCpuSeat = (session: GameSession, seat: number): boolean =>
  Participant.isCpu(session.match.participants[seat]);

/** リーチ後の暗槓は、待ちが変わらない場合のみ認める。 */
const keepsSameWaits = (hand: Hand, tile: Tile): boolean => {
  const before = Hand.waits(hand).map((wait) => Tile.toCode(wait));
  const kanTiles = hand.concealed.filter((member) =>
    Tile.isSameKind(member, tile),
  );
  const after = Hand.waits(
    Hand.create(
      hand.concealed.filter((member) => !Tile.isSameKind(member, tile)),
      [...hand.melds, Meld.ankan(kanTiles)],
    ),
  ).map((wait) => Tile.toCode(wait));
  return (
    before.length === after.length &&
    before.every((code, index) => code === after[index])
  );
};

const kanActions = (
  session: GameSession,
  seat: number,
): readonly GameAction[] => {
  const { round } = session;
  const seatState = round.seats[seat];
  if (round.wall.kanCount >= 4 || Round.remaining(round) === 0) {
    return [];
  }
  const ankan = Hand.ankanTiles(seatState.hand)
    .filter(
      (tile) =>
        !seatState.riichi ||
        (round.drawn !== null &&
          Tile.isSameKind(round.drawn, tile) &&
          keepsSameWaits(seatState.hand, tile)),
    )
    .map((tile) => GameAction.ankan(tile));
  const kakan = seatState.riichi
    ? []
    : Hand.kakanTiles(seatState.hand).map((tile) => GameAction.kakan(tile));
  return [...ankan, ...kakan];
};

const discardActions = (
  round: RoundState,
  seat: number,
): readonly GameAction[] => {
  const seatState = round.seats[seat];
  if (!seatState.riichi || round.drawn === null) {
    return seatState.hand.concealed.map((_, index) =>
      GameAction.discard(index),
    );
  }
  const drawn = round.drawn;
  const index = seatState.hand.concealed.findIndex(
    (tile) => Tile.isSameKind(tile, drawn) && tile.red === drawn.red,
  );
  return index < 0 ? [] : [GameAction.discard(index)];
};

const riichiActions = (
  session: GameSession,
  seat: number,
): readonly GameAction[] => {
  const { round, match } = session;
  const seatState = round.seats[seat];
  const eligible =
    !seatState.riichi &&
    Hand.isMenzen(seatState.hand) &&
    match.scores[seat] >= RIICHI_COST &&
    Round.remaining(round) >= MIN_TILES_FOR_RIICHI &&
    seatState.hand.concealed.length % 3 === 2;
  if (!eligible) {
    return [];
  }
  return seatState.hand.concealed.flatMap((_, index) =>
    Hand.isTenpai(Hand.removeAt(seatState.hand, index))
      ? [GameAction.riichi(index)]
      : [],
  );
};

const turnActions = (
  session: GameSession,
  seat: number,
): readonly GameAction[] => {
  const { round } = session;
  const canTsumo =
    round.drawn !== null &&
    winOutcome(session, seat, round.drawn, "tsumo").type === "scored";
  return [
    ...(canTsumo ? [GameAction.tsumo()] : []),
    ...kanActions(session, seat),
    ...riichiActions(session, seat),
    ...discardActions(round, seat),
  ];
};

const canRon = (session: GameSession, seat: number, tile: Tile): boolean => {
  const seatState = session.round.seats[seat];
  if (seatState.hand.concealed.length % 3 !== 1) {
    return false;
  }
  if (!Hand.isWinningShape(Hand.add(seatState.hand, tile))) {
    return false;
  }
  if (SeatState.isFuriten(seatState)) {
    return false;
  }
  return winOutcome(session, seat, tile, "ron").type === "scored";
};

const claimActions = (
  session: GameSession,
  seat: number,
): readonly GameAction[] => {
  const { round } = session;
  const pending = round.pending;
  if (pending === null || pending.from === seat) {
    return [];
  }
  if (pending.responses[seat] !== null) {
    return [];
  }
  const seatState = round.seats[seat];
  const ron = canRon(session, seat, pending.tile) ? [GameAction.ron()] : [];
  if (pending.chankan) {
    return ron.length > 0 ? [...ron, GameAction.pass()] : [];
  }
  if (seatState.riichi || Round.remaining(round) === 0) {
    return ron.length > 0 ? [...ron, GameAction.pass()] : [];
  }

  const pon = Hand.ponTiles(seatState.hand, pending.tile);
  const minkan =
    round.wall.kanCount < 4
      ? Hand.minkanTiles(seatState.hand, pending.tile)
      : null;
  const chi =
    pending.from === (seat + SEAT_COUNT - 1) % SEAT_COUNT
      ? Hand.chiTiles(seatState.hand, pending.tile)
      : [];
  const options = [
    ...ron,
    ...(minkan === null ? [] : [GameAction.minkan(minkan)]),
    ...(pon === null ? [] : [GameAction.pon(pon)]),
    ...chi.map((tiles) => GameAction.chi(tiles)),
  ];
  return options.length > 0 ? [...options, GameAction.pass()] : [];
};

const pointChangesForWin = (
  round: RoundState,
  winner: number,
  loser: number | null,
  payments: readonly Payment[],
  total: number,
): readonly number[] => {
  const dealerPayment = payments.find((entry) => entry.from === "dealer");
  const otherPayment = payments.find((entry) => entry.from === "non_dealer");
  return SEATS.map((seat) => {
    if (seat === winner) {
      return total;
    }
    if (loser !== null) {
      return seat === loser ? -payments[0].amount : 0;
    }
    const payment = seat === round.dealer ? (dealerPayment ?? otherPayment) : otherPayment;
    return payment === undefined ? 0 : -payment.amount;
  });
};

const finishWithWin = (
  session: GameSession,
  winner: number,
  loser: number | null,
  winType: WinType,
  scored: ScoreResult,
): GameSession => {
  const { round } = session;
  const result: RoundResult = {
    type: "win",
    winner,
    loser,
    winType,
    yaku: scored.yaku,
    han: scored.han,
    fu: scored.fu,
    score: scored.score,
    pointChanges: pointChangesForWin(
      round,
      winner,
      loser,
      scored.score.payments,
      scored.score.total,
    ),
    dealerContinues: winner === round.dealer,
  };
  return {
    ...session,
    round: Round.finish(round, result),
    status: "round_end",
  };
};

const finishWithDraw = (session: GameSession): GameSession => {
  const { round } = session;
  const tenpai = Round.tenpaiFlags(round);
  const tenpaiCount = tenpai.filter(Boolean).length;
  const penalty = Score.notenPenalty(tenpaiCount);
  const result: RoundResult = {
    type: "exhaustive_draw",
    tenpai,
    pointChanges: tenpai.map((isTenpai) =>
      isTenpai ? penalty.receive : -penalty.pay,
    ),
    dealerContinues: tenpai[round.dealer],
  };
  return {
    ...session,
    round: Round.finish(round, result),
    status: "round_end",
  };
};

const applyWin = (
  session: GameSession,
  winner: number,
  loser: number | null,
  winType: WinType,
  winTile: Tile,
): GameSession => {
  const outcome = winOutcome(session, winner, winTile, winType);
  if (outcome.type !== "scored") {
    return session;
  }
  return finishWithWin(session, winner, loser, winType, outcome.result);
};

/** ロンできたのに見逃した席をフリテンにする。 */
const markMissedWins = (session: GameSession): GameSession => {
  const pending = session.round.pending;
  if (pending === null) {
    return session;
  }
  return SEATS.filter(
    (seat) => seat !== pending.from && canRon(session, seat, pending.tile),
  ).reduce(
    (current, seat) => ({
      ...current,
      round: Round.markMissedWin(current.round, seat),
    }),
    session,
  );
};

const meldFromResponse = (
  response: ClaimResponse,
  fromSeat: number,
  tile: Tile,
): Meld | null => {
  if (response.kind === "pon") {
    return Meld.pon([...response.tiles, tile], fromSeat);
  }
  if (response.kind === "kan") {
    return Meld.minkan([...response.tiles, tile], fromSeat);
  }
  if (response.kind === "chi") {
    return Meld.chi([...response.tiles, tile], fromSeat);
  }
  return null;
};

const continueAfterChankan = (session: GameSession): GameSession => {
  const drawn = Round.drawReplacement({ ...session.round, pending: null });
  return drawn === null ? finishWithDraw(session) : { ...session, round: drawn };
};

const resolveClaims = (session: GameSession): GameSession => {
  const { round } = session;
  const pending = round.pending;
  if (pending === null) {
    return session;
  }
  const order = SEATS.map(
    (offset) => (pending.from + 1 + offset) % SEAT_COUNT,
  ).filter((seat) => seat !== pending.from);

  const ronSeat = order.find(
    (seat) => pending.responses[seat]?.kind === "ron" && canRon(session, seat, pending.tile),
  );
  if (ronSeat !== undefined) {
    return applyWin(session, ronSeat, pending.from, "ron", pending.tile);
  }

  // 鳴きの優先順位は ロン > ポン/カン > チー。
  const callSeat =
    order.find((seat) => {
      const kind = pending.responses[seat]?.kind;
      return kind === "pon" || kind === "kan";
    }) ?? order.find((seat) => pending.responses[seat]?.kind === "chi");
  const marked = markMissedWins(session);
  if (callSeat === undefined) {
    return pending.chankan
      ? continueAfterChankan(marked)
      : { ...marked, round: Round.advanceTurn(marked.round) };
  }

  const response = pending.responses[callSeat];
  const meld =
    response === null ? null : meldFromResponse(response, pending.from, pending.tile);
  if (meld === null || response === null || response.kind === "pass" || response.kind === "ron") {
    return { ...marked, round: Round.advanceTurn(marked.round) };
  }
  const called = Round.applyCall(
    marked.round,
    callSeat,
    meld,
    response.tiles,
  );
  if (response.kind !== "kan") {
    return { ...marked, round: called };
  }
  const drawn = Round.drawReplacement(called);
  return drawn === null
    ? finishWithDraw({ ...marked, round: called })
    : { ...marked, round: drawn };
};

const responseOf = (action: GameAction): ClaimResponse | null => {
  if (action.type === "ron") {
    return { kind: "ron" };
  }
  if (action.type === "pon") {
    return { kind: "pon", tiles: action.tiles };
  }
  if (action.type === "minkan") {
    return { kind: "kan", tiles: action.tiles };
  }
  if (action.type === "chi") {
    return { kind: "chi", tiles: action.tiles };
  }
  if (action.type === "pass") {
    return { kind: "pass" };
  }
  return null;
};

const pendingSeats = (session: GameSession): readonly number[] =>
  SEATS.filter((seat) => claimActions(session, seat).length > 0);

const applyClaimAction = (
  session: GameSession,
  seat: number,
  action: GameAction,
): GameSession => {
  const response = responseOf(action);
  if (response === null) {
    return session;
  }
  const responded: GameSession = {
    ...session,
    round: Round.respond(session.round, seat, response),
  };
  return pendingSeats(responded).length > 0
    ? responded
    : resolveClaims(responded);
};

const applyDiscard = (
  session: GameSession,
  seat: number,
  index: number,
  riichi: boolean,
): GameSession => {
  const { round } = session;
  const tile = round.seats[seat].hand.concealed[index];
  if (tile === undefined) {
    return session;
  }
  const next = Round.discard(round, tile, { riichi });
  const match = riichi
    ? Match.withRiichiSticks(
        Match.addPoints(session.match, seat, -RIICHI_COST),
        next.riichiSticks,
      )
    : session.match;
  const discarded: GameSession = { ...session, round: next, match };
  return pendingSeats(discarded).length > 0
    ? discarded
    : resolveClaims(discarded);
};

const applyAnkan = (session: GameSession, tile: Tile): GameSession => {
  const { round } = session;
  const hand = round.seats[round.turn].hand;
  const kanTiles = hand.concealed.filter((member) =>
    Tile.isSameKind(member, tile),
  );
  const kanned = Round.applySelfKan(
    round,
    [...hand.melds, Meld.ankan(kanTiles)],
    hand.concealed.filter((member) => !Tile.isSameKind(member, tile)),
  );
  const drawn = Round.drawReplacement(kanned);
  return drawn === null
    ? finishWithDraw({ ...session, round: kanned })
    : { ...session, round: drawn };
};

const applyKakan = (session: GameSession, tile: Tile): GameSession => {
  const { round } = session;
  const hand = round.seats[round.turn].hand;
  const melds = hand.melds.map((meld) =>
    meld.type === "pon" && Tile.isSameKind(Meld.head(meld), tile)
      ? Meld.toKakan(meld, tile)
      : meld,
  );
  const kanned = Round.applySelfKan(
    round,
    melds,
    Hand.remove(hand, tile).concealed,
  );
  const awaiting: GameSession = {
    ...session,
    round: Round.awaitChankan(kanned, tile),
  };
  return pendingSeats(awaiting).length > 0
    ? awaiting
    : resolveClaims(awaiting);
};

const nextRoundParams = (
  session: GameSession,
  result: RoundResult,
): Readonly<{ dealerContinues: boolean; honba: number; riichiSticks: number }> => {
  const { round } = session;
  if (result.type === "exhaustive_draw") {
    return {
      dealerContinues: result.dealerContinues,
      honba: round.honba + 1,
      riichiSticks: round.riichiSticks,
    };
  }
  return {
    dealerContinues: result.dealerContinues,
    honba: result.dealerContinues ? round.honba + 1 : 0,
    riichiSticks: 0,
  };
};

export const Game = {
  /** 対戦を開始し、東一局を配牌する。 */
  start(
    rule: Rule,
    participants: readonly Participant[],
    rng: Rng,
  ): GameSession {
    const match = Match.create(rule, participants);
    return {
      match,
      round: createRound(match, rng),
      status: "playing",
      ranking: null,
      rng,
    };
  },

  /** その席がいま選択できる行動。 */
  availableActions(session: GameSession, seat: number): readonly GameAction[] {
    if (session.status !== "playing") {
      return [];
    }
    const { round } = session;
    if (round.phase === "action") {
      return round.turn === seat ? turnActions(session, seat) : [];
    }
    if (round.phase === "claim") {
      return claimActions(session, seat);
    }
    return [];
  },

  /** 1人の視点から見た卓の状態。 */
  viewFor(session: GameSession, seat: number): PlayerView {
    const { round, match } = session;
    return {
      seat,
      hand: round.seats[seat].hand,
      drawn: round.turn === seat ? round.drawn : null,
      handSizes: round.seats.map((state) => state.hand.concealed.length),
      rivers: round.seats.map((state) => state.river),
      melds: round.seats.map((state) => state.hand.melds),
      riichi: round.seats.map((state) => state.riichi),
      scores: match.scores,
      participants: match.participants,
      seatWinds: SEATS.map((index) => Wind.ofSeat(index, round.dealer)),
      dealer: round.dealer,
      roundWind: round.roundWind,
      roundNumber: round.roundNumber,
      honba: round.honba,
      riichiSticks: round.riichiSticks,
      doraIndicators: Wall.doraIndicators(round.wall),
      remaining: Round.remaining(round),
      turn: round.turn,
      phase: round.phase,
      claim:
        round.pending === null
          ? null
          : {
              from: round.pending.from,
              tile: round.pending.tile,
              chankan: round.pending.chankan,
            },
      actions: Game.availableActions(session, seat),
    };
  },

  /** 行動を適用する。 */
  apply(
    session: GameSession,
    seat: number,
    action: GameAction,
  ): GameSession {
    if (session.status !== "playing") {
      return session;
    }
    if (GameAction.isClaim(action)) {
      return applyClaimAction(session, seat, action);
    }
    if (session.round.turn !== seat || session.round.phase !== "action") {
      return session;
    }
    if (action.type === "discard") {
      return applyDiscard(session, seat, action.index, false);
    }
    if (action.type === "riichi") {
      return applyDiscard(session, seat, action.index, true);
    }
    if (action.type === "tsumo") {
      const drawn = session.round.drawn;
      return drawn === null
        ? session
        : applyWin(session, seat, null, "tsumo", drawn);
    }
    if (action.type === "ankan") {
      return applyAnkan(session, action.tile);
    }
    if (action.type === "kakan") {
      return applyKakan(session, action.tile);
    }
    return session;
  },

  /**
   * 人間の入力を必要としない進行を1手だけ進める。
   * 人間の操作待ちなら null を返す。
   */
  autoStep(session: GameSession): GameSession | null {
    if (session.status !== "playing") {
      return null;
    }
    const { round } = session;
    if (round.phase === "draw") {
      const drawn = Round.drawFromWall(round);
      return drawn === null
        ? finishWithDraw(session)
        : { ...session, round: drawn };
    }
    if (round.phase === "action") {
      if (!isCpuSeat(session, round.turn)) {
        return null;
      }
      const action = Cpu.decide(
        Game.viewFor(session, round.turn),
        session.match.participants[round.turn].level,
      );
      return action === null ? null : Game.apply(session, round.turn, action);
    }
    if (round.phase === "claim") {
      const waiting = pendingSeats(session);
      const cpuSeat = waiting.find((seat) => isCpuSeat(session, seat));
      if (cpuSeat !== undefined) {
        const action = Cpu.decide(
          Game.viewFor(session, cpuSeat),
          session.match.participants[cpuSeat].level,
        );
        return Game.apply(session, cpuSeat, action ?? GameAction.pass());
      }
      return waiting.length > 0 ? null : resolveClaims(session);
    }
    return null;
  },

  /** 局の結果を確定し、点数を反映して次局へ進む。 */
  confirmResult(session: GameSession): GameSession {
    const result = session.round.result;
    if (session.status !== "round_end" || result === null) {
      return session;
    }
    const params = nextRoundParams(session, result);
    const settled = Match.applyPointChanges(
      session.match,
      result.pointChanges,
    );
    const advanced = Match.nextRound(settled, params);
    const isOver =
      Match.isBankrupt(advanced) || Match.isAfterFinalRound(advanced);
    if (isOver) {
      const finished = Match.finish(advanced);
      return {
        ...session,
        match: finished,
        status: "match_end",
        ranking: Match.ranking(finished),
      };
    }
    return {
      ...session,
      match: advanced,
      round: createRound(advanced, session.rng),
      status: "playing",
      ranking: null,
    };
  },

  /** 局の結果(表示用)。 */
  result(session: GameSession): RoundResult | null {
    return session.round.result;
  },
} as const;
