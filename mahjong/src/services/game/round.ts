import { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import type {
  GameConfig,
  GameEndResult,
  GameState,
  Kyoku,
  PlayerState,
  RoundInfo,
} from "@/src/domains/game";
import type { Rng } from "@/src/types/random";
import { PLAYER_COUNT, refreshWaits, withWall } from "./state";
import { drawFor } from "./flow";

const NEXT_KYOKU: Readonly<Record<Kyoku, Kyoku>> = { 1: 2, 2: 3, 3: 4, 4: 1 };

const emptyWall: Wall = { live: [], dead: [], rinshanDrawn: 0, doraCount: 0 };

/** 局を開始する: 洗牌・配牌し、親がツモって手番となる */
const startRound = (state: GameState, rng: Rng): GameState => {
  const wall = Wall.create(rng, { akaDora: state.config.rules.akaDora });
  const dealt = Wall.deal(wall);
  if (dealt === null) {
    return state;
  }
  const players = state.players.map((player, seat) =>
    refreshWaits({
      ...player,
      hand: Tile.sort(
        dealt.hands[(seat - state.dealer + PLAYER_COUNT) % PLAYER_COUNT],
      ),
      drawn: null,
      melds: [],
      discards: [],
      riichi: "none",
      riichiTileIndex: null,
      ippatsu: false,
      temporaryFuriten: false,
      riichiFuriten: false,
    }),
  );
  const dealtState = withWall(
    {
      ...state,
      players,
      turnCount: 0,
      interrupted: false,
      rinshan: false,
      phase: { type: "turn", actor: state.dealer },
    },
    dealt.wall,
  );
  return drawFor(dealtState, state.dealer);
};

/** 対局を生成する。席0が起家(東家)で東1局0本場から始まる */
export const createGame = (config: GameConfig, rng: Rng): GameState => {
  const players: readonly PlayerState[] = config.players.map(() => ({
    hand: [],
    drawn: null,
    melds: [],
    discards: [],
    riichi: "none",
    riichiTileIndex: null,
    ippatsu: false,
    points: config.rules.startingPoints,
    furiten: false,
    waits: [],
    temporaryFuriten: false,
    riichiFuriten: false,
  }));
  const base: GameState = {
    config,
    players,
    dealer: 0,
    round: { wind: "ton", kyoku: 1, honba: 0, kyotaku: 0 },
    wallCount: 0,
    doraIndicators: [],
    turnCount: 0,
    phase: { type: "turn", actor: 0 },
    wall: emptyWall,
    interrupted: false,
    rinshan: false,
  };
  return startRound(base, rng);
};

/** 終局: 順位決定(同点は起家に近い方が上位)、残り供託は1位が回収 */
const finishGame = (state: GameState): GameState => {
  const order = Array.from({ length: PLAYER_COUNT }, (_, seat) => seat).sort(
    (a, b) => state.players[b].points - state.players[a].points || a - b,
  );
  const leftoverKyotaku = state.round.kyotaku;
  const players = state.players.map((player, seat) =>
    seat === order[0] && leftoverKyotaku > 0
      ? { ...player, points: player.points + leftoverKyotaku * 1000 }
      : player,
  );
  const returnPoints = state.config.rules.returnPoints;
  const result: GameEndResult = {
    ranking: order.map((seat, index) => ({
      player: seat,
      rank: index + 1,
      points: players[seat].points,
      settled:
        returnPoints === null
          ? null
          : (players[seat].points - returnPoints) / 1000,
    })),
  };
  return {
    ...state,
    players,
    round: { ...state.round, kyotaku: 0 },
    phase: { type: "gameEnd", result },
  };
};

/**
 * 局結果を確定する: 点数反映 → トビ判定 → 連荘/輪荘 → 終了判定 → 次局開始。
 * 東風戦は東4局・半荘戦は南4局の輪荘で終局(連荘中は継続)
 */
export const confirmRoundEnd = (state: GameState, rng: Rng): GameState => {
  if (state.phase.type !== "roundEnd") {
    return state;
  }
  const result = state.phase.result;
  const players = state.players.map((player, seat) => ({
    ...player,
    points: player.points + result.pointDeltas[seat],
  }));
  const kyotaku = result.type === "win" ? 0 : state.round.kyotaku;
  const settledState: GameState = {
    ...state,
    players,
    round: { ...state.round, kyotaku },
  };

  const tobi = players.some((player) => player.points < 0);
  const finalWind = state.config.rules.gameType === "tonpuu" ? "ton" : "nan";
  const isFinalKyoku =
    state.round.wind === finalWind && state.round.kyoku === 4;
  if (tobi || (!result.dealerKeeps && isFinalKyoku)) {
    return finishGame(settledState);
  }

  if (result.dealerKeeps) {
    // 連荘: 親継続・本場+1
    const round: RoundInfo = {
      ...settledState.round,
      honba: state.round.honba + 1,
    };
    return startRound({ ...settledState, round }, rng);
  }

  // 輪荘: 親を下家へ。本場は子の和了で0、流局で+1
  const round: RoundInfo = {
    wind: state.round.kyoku === 4 ? "nan" : state.round.wind,
    kyoku: NEXT_KYOKU[state.round.kyoku],
    honba: result.type === "draw" ? state.round.honba + 1 : 0,
    kyotaku,
  };
  return startRound(
    {
      ...settledState,
      round,
      dealer: (state.dealer + 1) % PLAYER_COUNT,
    },
    rng,
  );
};
