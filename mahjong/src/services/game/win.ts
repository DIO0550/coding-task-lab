import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import { Scoring, type ScoringInput } from "@/src/domains/scoring";
import type { Situational } from "@/src/domains/yaku";
import type { GameState, WinResult } from "@/src/domains/game";
import { PLAYER_COUNT, sameKind, seatWindOf } from "./state";

export type ValidScoring = Extract<Scoring, Readonly<{ valid: true }>>;

export type ClaimSource = "discard" | "kakan" | null;

/** 翻数に数えるが役ではない名前(後付けなし判定で除外する) */
const NON_YAKU_NAMES: ReadonlySet<string> = new Set([
  "dora",
  "ura_dora",
  "aka_dora",
]);

/** 状況役(海底・河底・嶺上・槍槓・天和・地和)を状態から求める */
const situationalFor = (
  state: GameState,
  seat: number,
  winType: "tsumo" | "ron",
  source: ClaimSource,
): readonly Situational[] => {
  const player = state.players[seat];
  const list: Situational[] = [];
  if (winType === "tsumo") {
    if (state.rinshan) {
      list.push("rinshan");
    } else if (state.wallCount === 0) {
      list.push("haitei");
    }
    const firstUninterrupted =
      player.discards.length === 0 &&
      player.melds.length === 0 &&
      !state.interrupted;
    if (firstUninterrupted) {
      list.push(seat === state.dealer ? "tenhou" : "chihou");
    }
  } else {
    if (source === "kakan") {
      list.push("chankan");
    } else if (state.wallCount === 0) {
      list.push("houtei");
    }
  }
  return list;
};

export const buildScoringInput = (
  state: GameState,
  seat: number,
  winTile: Tile,
  winType: "tsumo" | "ron",
  source: ClaimSource,
): ScoringInput => {
  const player = state.players[seat];
  return {
    hand: [...player.hand, winTile],
    melds: player.melds.map((gameMeld) => gameMeld.meld),
    winTile,
    winType,
    seatWind: seatWindOf(state, seat),
    roundWind: state.round.wind,
    dora: state.doraIndicators.map(Tile.indicatedDora),
    uraDora:
      player.riichi !== "none"
        ? Wall.uraIndicators(state.wall).map(Tile.indicatedDora)
        : [],
    riichi: player.riichi,
    ippatsu: player.ippatsu,
    situational: situationalFor(state, seat, winType, source),
    honba: state.round.honba,
    kyotaku: state.round.kyotaku,
    kuitan: state.config.rules.kuitan,
  };
};

/**
 * 後付けなし(簡略ルール): 待ちのどの牌で和了しても成立する役(ドラ除く)が
 * 1つ以上あることを要求する。状況役は除いて判定する。
 */
const satisfiesAtozukeOff = (
  state: GameState,
  seat: number,
  input: ScoringInput,
): boolean => {
  const player = state.players[seat];
  const nameSets = player.waits.map((wait) => {
    const scoring = Scoring.calculate({
      ...input,
      hand: [...player.hand, wait],
      winTile: wait,
      situational: [],
    });
    if (!scoring.valid) {
      return new Set<string>();
    }
    return new Set(
      scoring.yaku
        .map((entry) => entry.name)
        .filter((name) => !NON_YAKU_NAMES.has(name)),
    );
  });
  if (nameSets.length === 0) {
    return false;
  }
  const [first, ...rest] = nameSets;
  return [...first].some((name) => rest.every((set) => set.has(name)));
};

/**
 * seat が winTile で和了できるか判定し、成立するなら点数計算結果を返す。
 * 和了形でない・役なし・後付けなし違反は null(フリテンは呼び出し側で判定する)
 */
export const evaluateWin = (
  state: GameState,
  seat: number,
  winTile: Tile,
  winType: "tsumo" | "ron",
  source: ClaimSource,
): ValidScoring | null => {
  const player = state.players[seat];
  if (!player.waits.some((wait) => sameKind(wait, winTile))) {
    return null;
  }
  const input = buildScoringInput(state, seat, winTile, winType, source);
  const scoring = Scoring.calculate(input);
  if (!scoring.valid) {
    return null;
  }
  if (!state.config.rules.atozuke && !satisfiesAtozukeOff(state, seat, input)) {
    return null;
  }
  return scoring;
};

/** 支払い内訳から席ごとの点数増減を組み立てる */
const buildPointDeltas = (
  state: GameState,
  winner: number,
  loser: number | null,
  winType: "tsumo" | "ron",
  scoring: ValidScoring,
): readonly number[] => {
  const deltas = Array.from({ length: PLAYER_COUNT }, () => 0);
  deltas[winner] += scoring.score.total;
  if (winType === "ron") {
    const payment = scoring.score.payments.find(
      (entry) => entry.from === "discarder",
    );
    if (loser !== null && payment) {
      deltas[loser] -= payment.amount;
    }
    return deltas;
  }
  const dealerPayment = scoring.score.payments.find(
    (entry) => entry.from === "dealer",
  );
  const nonDealerPayment = scoring.score.payments.find(
    (entry) => entry.from === "non_dealer",
  );
  for (let seat = 0; seat < PLAYER_COUNT; seat += 1) {
    if (seat === winner) {
      continue;
    }
    const payment = seat === state.dealer ? dealerPayment : nonDealerPayment;
    if (payment) {
      deltas[seat] -= payment.amount;
    }
  }
  return deltas;
};

/**
 * 和了を確定し roundEnd フェーズへ遷移する。
 * 点数移動(pointDeltas)は結果確定(confirmRoundEnd)時に反映される
 */
export const processWin = (
  state: GameState,
  winner: number,
  winType: "tsumo" | "ron",
  loser: number | null,
  scoring: ValidScoring,
): GameState => {
  const player = state.players[winner];
  const result: WinResult = {
    type: "win",
    winner,
    loser,
    winType,
    yaku: scoring.yaku,
    han: scoring.han,
    fu: scoring.fu,
    scoreTotal: scoring.score.total,
    pointDeltas: buildPointDeltas(state, winner, loser, winType, scoring),
    uraDora: player.riichi !== "none" ? Wall.uraIndicators(state.wall) : [],
    dealerKeeps: winner === state.dealer,
  };
  return { ...state, phase: { type: "roundEnd", result } };
};
