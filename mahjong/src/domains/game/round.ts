import { Tile } from "../tile/index.ts";
import { Wall } from "../wall/index.ts";
import { Random } from "../../libs/random/index.ts";
import type { Rng } from "../../libs/random/index.ts";
import type {
  GameState,
  PlayerConfig,
  PlayerState,
  RuleConfig,
  Seat,
} from "./types.ts";
import { SEATS, nextSeat } from "./types.ts";

const RIICHI_STICK_POINTS = 1000;
const FINAL_ROUND_NUMBER = 4;

/** 起家に近い順(素点同点時の上位)で並べた順位 */
export const rankingOf = (
  state: GameState,
): readonly Readonly<{
  seat: Seat;
  name: string;
  points: number;
  rank: number;
}>[] => {
  const ordered = [...state.players].sort(
    (a, b) => b.points - a.points || a.seat - b.seat,
  );
  return ordered.map((player, index) => ({
    seat: player.seat,
    name: player.config.name,
    points: player.points,
    rank: index + 1,
  }));
};

/** 配牌済みの1局を開始する(親がツモして action へ) */
const dealRound = (
  state: GameState,
  wallOrder: readonly Tile[] | null,
  rng: Rng,
): GameState => {
  const built =
    wallOrder === null
      ? Wall.build(rng, state.rule.akaDora)
      : (Wall.buildFromOrder(wallOrder) ??
        Wall.build(rng, state.rule.akaDora));
  const players = state.players.map(
    (player): PlayerState => ({
      ...player,
      hand: built.hands[player.seat].toSorted(Tile.compare),
      drawn: null,
      melds: [],
      discards: [],
      riichi: "none",
      ippatsu: false,
      doubleRiichiEligible: true,
      riichiFuriten: false,
    }),
  );
  const firstDraw = Wall.drawTile(built.wall);
  if (firstDraw === null) {
    throw new Error("wall is empty at round start");
  }
  return {
    ...state,
    players: players.map((player) =>
      player.seat === state.dealer
        ? { ...player, drawn: firstDraw.tile }
        : player,
    ),
    wall: firstDraw.wall,
    turn: state.dealer,
    phase: "action",
    lastDiscard: null,
    lastDrawKind: "wall",
    pendingResponders: undefined,
    declarations: undefined,
    responseKind: undefined,
    pendingKakan: undefined,
    result: undefined,
  };
};

/**
 * 対局を開始する。親=seat0(起家)・東1局0本場から。
 * options.wallOrder で固定牌山(136枚の並び)を注入できる(決定的テスト用)
 */
export const startGame = (
  rule: RuleConfig,
  players: readonly PlayerConfig[],
  rng: Rng,
  options?: Readonly<{ wallOrder?: readonly Tile[] }>,
): GameState => {
  if (players.length !== 4) {
    throw new Error("exactly 4 players are required");
  }
  const initialPlayers: readonly PlayerState[] = SEATS.map((seat) => ({
    seat,
    config: players[seat],
    points: rule.startingPoints,
    hand: [],
    drawn: null,
    melds: [],
    discards: [],
    riichi: "none",
    ippatsu: false,
    doubleRiichiEligible: true,
    riichiFuriten: false,
  }));
  const base: GameState = {
    rule,
    players: initialPlayers,
    dealer: 0,
    roundWind: "ton",
    roundNumber: 1,
    honba: 0,
    riichiSticks: 0,
    wall: {
      drawPile: [],
      deadWall: [],
      doraIndicators: [],
      uraDoraIndicators: [],
      rinshanDrawn: 0,
    },
    turn: 0,
    phase: "round_end",
    lastDiscard: null,
    lastDrawKind: null,
    wallSeed: Random.nextSeed(rng),
  };
  return dealRound(base, options?.wallOrder ?? null, rng);
};

/** 今の局が規定の最終局(東風=東4、半荘=南4)か */
const isFinalRound = (state: GameState): boolean => {
  const finalWind = state.rule.format === "tonpuu" ? "ton" : "nan";
  return (
    state.roundWind === finalWind &&
    state.roundNumber === FINAL_ROUND_NUMBER
  );
};

/** 残っている供託をトップ(素点降順・同点は起家に近い席)へ渡して終局する */
const finishGame = (state: GameState): GameState => {
  if (state.riichiSticks === 0) {
    return { ...state, phase: "game_end" };
  }
  const top = rankingOf(state)[0];
  return {
    ...state,
    players: state.players.map((player) =>
      player.seat === top.seat
        ? {
            ...player,
            points:
              player.points + RIICHI_STICK_POINTS * state.riichiSticks,
          }
        : player,
    ),
    riichiSticks: 0,
    phase: "game_end",
  };
};

/**
 * 局結果を確定して点数を反映し、連荘・輪荘・終局を判定して
 * 次局を開始する(または終局する)。
 * 結果フェーズ以外では何もしない
 */
export const confirmRoundResult = (state: GameState): GameState => {
  const result = state.result;
  if (
    result === undefined ||
    (state.phase !== "result_win" && state.phase !== "result_draw")
  ) {
    return state;
  }
  const players = state.players.map((player) => ({
    ...player,
    points: player.points + result.pointDeltas[player.seat],
  }));
  const riichiSticks = result.kind === "win" ? 0 : state.riichiSticks;
  const honba =
    result.kind === "draw" || result.dealerContinues ? state.honba + 1 : 0;
  const settled: GameState = { ...state, players, riichiSticks, honba };

  const tobi = players.some((player) => player.points < 0);
  if (tobi || isFinalRound(settled)) {
    return finishGame(settled);
  }
  if (result.dealerContinues) {
    const nextSeed = Random.nextSeed(Random.seeded(settled.wallSeed));
    return dealRound(
      { ...settled, wallSeed: nextSeed },
      null,
      Random.seeded(settled.wallSeed),
    );
  }
  const advanced: GameState = {
    ...settled,
    dealer: nextSeat(settled.dealer),
    roundNumber: settled.roundNumber + 1,
  };
  const rolled: GameState =
    advanced.roundNumber > FINAL_ROUND_NUMBER
      ? { ...advanced, roundWind: "nan", roundNumber: 1 }
      : advanced;
  const nextSeed = Random.nextSeed(Random.seeded(rolled.wallSeed));
  return dealRound(
    { ...rolled, wallSeed: nextSeed },
    null,
    Random.seeded(rolled.wallSeed),
  );
};
