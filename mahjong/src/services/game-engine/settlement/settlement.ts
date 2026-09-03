import { GameState } from "@/src/domains/game-state";
import { RoundState, type CallPhase, type RoundResult, type ValidScoring } from "@/src/domains/round-state";
import { RuleConfig } from "@/src/domains/rule-config";
import { Seat, type SeatIndex } from "@/src/domains/seat";
import { SeatState } from "@/src/domains/seat-state";
import type { ScoringInput } from "@/src/domains/scoring-input";
import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import { Wind } from "@/src/domains/wind";
import { ScoreCalculator } from "@/src/services/score-calculator";
import type { Payment, ScoringResult, SituationalFlag, WinType } from "@/src/types/scoring";

/**
 * 和了・流局の精算と次局への進行。点数計算は Part 1 の ScoreCalculator に委譲する。
 */
const RIICHI_STICK = 1000;
const NOTEN_BAPPU_TOTAL = 3000;

const payerOf = (
  payment: Payment,
  nonDealerIndex: number,
  context: { winner: SeatIndex; loser: SeatIndex | null; dealer: SeatIndex },
): SeatIndex | null => {
  const nonDealers = Seat.all().filter((seat) => seat !== context.winner && seat !== context.dealer);
  switch (payment.from) {
    case "dealer":
      return context.dealer;
    case "discarder":
      return context.loser;
    case "non_dealer":
      return nonDealers[nonDealerIndex] ?? null;
    case "kyotaku":
      return null;
  }
};

/** 支払い内訳を席ごとの点数増減に変換する */
const winDeltas = (
  payments: readonly Payment[],
  context: { winner: SeatIndex; loser: SeatIndex | null; dealer: SeatIndex },
): readonly number[] => {
  const initial = { deltas: [0, 0, 0, 0] as readonly number[], nonDealerIndex: 0 };
  return payments.reduce((acc, payment) => {
    const payer = payerOf(payment, acc.nonDealerIndex, context);
    const deltas = acc.deltas.map(
      (delta, seat) =>
        delta + (seat === context.winner ? payment.amount : 0) - (seat === payer ? payment.amount : 0),
    );
    const nonDealerIndex = payment.from === "non_dealer" ? acc.nonDealerIndex + 1 : acc.nonDealerIndex;
    return { deltas, nonDealerIndex };
  }, initial).deltas;
};

const drawDeltas = (tenpaiSeats: readonly SeatIndex[]): readonly number[] => {
  const tenpai = tenpaiSeats.length;
  if (tenpai === 0 || tenpai === 4) return [0, 0, 0, 0];
  const gain = NOTEN_BAPPU_TOTAL / tenpai;
  const loss = NOTEN_BAPPU_TOTAL / (4 - tenpai);
  return Seat.all().map((seat) => (tenpaiSeats.includes(seat) ? gain : -loss));
};

const isFirstTurn = (round: RoundState, seat: SeatIndex): boolean =>
  !round.seats[seat].hasDiscarded && !round.callOccurred;

/** 終局。和了で供託が回収されていれば供託本数も 0 に揃える */
const finish = (game: GameState, result: RoundResult): GameState => ({
  ...game,
  status: "finished",
  round: { ...game.round, kyotaku: result.type === "win" ? 0 : game.round.kyotaku },
});

const nextRound = (game: GameState, result: RoundResult, rng: () => number): RoundState => {
  const round = game.round;
  const rotates = !result.dealerContinues;
  const honba = result.type === "draw" || result.dealerContinues ? round.honba + 1 : 0;
  const wrapsWind = rotates && round.roundNumber >= 4;
  return RoundState.create({
    roundWind: wrapsWind ? Wind.next(round.roundWind) : round.roundWind,
    roundNumber: rotates ? (wrapsWind ? 1 : round.roundNumber + 1) : round.roundNumber,
    honba,
    kyotaku: result.type === "win" ? 0 : round.kyotaku,
    dealer: rotates ? Seat.next(round.dealer) : round.dealer,
    wall: Wall.create(rng, game.rules.akaDora),
  });
};

export const Settlement = {
  /** ツモ和了時の状況役フラグ */
  tsumoFlags(round: RoundState, seat: SeatIndex, afterKan: boolean): readonly SituationalFlag[] {
    if (afterKan) return ["rinshan"];
    if (isFirstTurn(round, seat)) return [round.dealer === seat ? "tenhou" : "chihou"];
    return RoundState.remaining(round) === 0 ? ["haitei"] : [];
  },

  /** ロン和了時の状況役フラグ */
  ronFlags(phase: CallPhase): readonly SituationalFlag[] {
    if (phase.isChankan) return ["chankan"];
    return phase.isHoutei ? ["houtei"] : [];
  },

  buildScoringInput(
    game: GameState,
    seat: SeatIndex,
    winTile: Tile,
    winType: WinType,
    situational: readonly SituationalFlag[],
  ): ScoringInput {
    const round = game.round;
    const state = round.seats[seat];
    const riichi = state.riichi;
    return {
      hand: winType === "tsumo" ? SeatState.concealed(state) : [...state.hand, winTile],
      melds: state.melds,
      winTile,
      winType,
      seatWind: RoundState.seatWind(round, seat),
      roundWind: round.roundWind,
      dora: Wall.doraIndicators(round.wall).map((indicator) => Tile.next(indicator)),
      uraDora: riichi === "none" ? [] : Wall.uraDoraIndicators(round.wall).map((indicator) => Tile.next(indicator)),
      riichi,
      ippatsu: state.ippatsu,
      situational,
      honba: round.honba,
      kyotaku: round.kyotaku,
    };
  },

  scoreWin(
    game: GameState,
    seat: SeatIndex,
    winTile: Tile,
    winType: WinType,
    situational: readonly SituationalFlag[],
  ): ScoringResult {
    const input = Settlement.buildScoringInput(game, seat, winTile, winType, situational);
    return ScoreCalculator.calculate(input, RuleConfig.toScoringRules(game.rules));
  },

  /** 和了を確定して局を終える。点数計算が成立しなければ状態を変えない */
  win(
    game: GameState,
    winner: SeatIndex,
    loser: SeatIndex | null,
    winTile: Tile,
    winType: WinType,
    situational: readonly SituationalFlag[],
  ): GameState {
    const round = game.round;
    const scoring = Settlement.scoreWin(game, winner, winTile, winType, situational);
    if (!scoring.valid) return game;
    const state = round.seats[winner];
    const valid: ValidScoring = scoring;
    const result: RoundResult = {
      type: "win",
      winner,
      loser,
      winType,
      winTile,
      hand: winType === "tsumo" ? SeatState.concealed(state) : [...state.hand, winTile],
      melds: state.melds,
      scoring: valid,
      deltas: winDeltas(valid.score.payments, { winner, loser, dealer: round.dealer }),
      dealerContinues: winner === round.dealer,
      doraIndicators: Wall.doraIndicators(round.wall),
      uraDoraIndicators: state.riichi === "none" ? [] : Wall.uraDoraIndicators(round.wall),
    };
    return GameState.withRound(game, RoundState.withPhase(round, { type: "ended", result }));
  },

  /** 荒牌流局。テンパイ/ノーテンを判定してノーテン罰符を精算する */
  exhaustiveDraw(game: GameState): GameState {
    const round = game.round;
    const tenpaiSeats = Seat.all().filter((seat) => SeatState.isTenpai(round.seats[seat]));
    const result: RoundResult = {
      type: "draw",
      tenpaiSeats,
      deltas: drawDeltas(tenpaiSeats),
      dealerContinues: tenpaiSeats.includes(round.dealer),
    };
    return GameState.withRound(game, RoundState.withPhase(round, { type: "ended", result }));
  },

  /** 結果を確定し、点数を反映して次局へ進む(終了条件を満たせば終局) */
  confirm(game: GameState, rng: () => number): GameState {
    const phase = game.round.phase;
    if (phase.type !== "ended") return game;
    const result = phase.result;
    const settled = GameState.recordRound(GameState.applyDeltas(game, result.deltas), result);
    if (GameState.isTobi(settled)) return finish(settled, result);
    if (!result.dealerContinues && GameState.isLastRound(settled)) return finish(settled, result);
    return GameState.withRound(settled, nextRound(settled, result, rng));
  },

  riichiStick(): number {
    return RIICHI_STICK;
  },
} as const;
