import type { Tile } from "@/src/domains/tile";
import { Hand } from "@/src/domains/hand";
import { Meld } from "@/src/domains/meld";
import { Wall } from "@/src/domains/wall";
import type { DrawResult, GameState } from "@/src/domains/game";
import {
  PLAYER_COUNT,
  clearAllIppatsu,
  handOf,
  refreshWaits,
  sameKind,
  syncFuriten,
  updatePlayer,
  withWall,
} from "./state";

/** ノーテン罰符は場3,000点 */
const NOTEN_PENALTY_TOTAL = 3000;

/** seat が山から1枚ツモり手番となる。同巡内フリテンは自分のツモで解消する */
export const drawFor = (state: GameState, seat: number): GameState => {
  const drawn = Wall.draw(state.wall);
  if (drawn === null) {
    return state;
  }
  const player = state.players[seat];
  const next = updatePlayer(
    withWall(state, drawn.wall),
    seat,
    syncFuriten({ ...player, drawn: drawn.tile, temporaryFuriten: false }),
  );
  return {
    ...next,
    turnCount: state.turnCount + 1,
    rinshan: false,
    phase: { type: "turn", actor: seat },
  };
};

/** seat が嶺上牌をツモり手番となる(新ドラ表示牌も1枚めくれる) */
export const drawRinshanFor = (state: GameState, seat: number): GameState => {
  const drawn = Wall.drawRinshan(state.wall);
  if (drawn === null) {
    return state;
  }
  const player = state.players[seat];
  const next = updatePlayer(
    withWall(state, drawn.wall),
    seat,
    syncFuriten({ ...player, drawn: drawn.tile, temporaryFuriten: false }),
  );
  return { ...next, rinshan: true, phase: { type: "turn", actor: seat } };
};

/**
 * 見逃し処理: 待ち牌が通過した席に同巡内フリテンを付け、
 * リーチ者は以降永続フリテンとする
 */
export const markPassedWaits = (
  state: GameState,
  tile: Tile,
  exclude: readonly number[],
): GameState => ({
  ...state,
  players: state.players.map((player, seat) => {
    if (exclude.includes(seat)) {
      return player;
    }
    if (!player.waits.some((wait) => sameKind(wait, tile))) {
      return player;
    }
    return syncFuriten({
      ...player,
      temporaryFuriten: true,
      riichiFuriten: player.riichiFuriten || player.riichi !== "none",
    });
  }),
});

/** 荒牌流局。ノーテン罰符(場3,000点)を pointDeltas として結果に載せる */
export const exhaustiveDraw = (state: GameState): GameState => {
  const tenpai = state.players.map((player) => Hand.isTenpai(handOf(player)));
  const tenpaiCount = tenpai.filter(Boolean).length;
  const deltas = state.players.map((_, seat) => {
    if (tenpaiCount === 0 || tenpaiCount === PLAYER_COUNT) {
      return 0;
    }
    return tenpai[seat]
      ? NOTEN_PENALTY_TOTAL / tenpaiCount
      : -NOTEN_PENALTY_TOTAL / (PLAYER_COUNT - tenpaiCount);
  });
  const result: DrawResult = {
    type: "draw",
    tenpai,
    pointDeltas: deltas,
    dealerKeeps: tenpai[state.dealer],
  };
  return { ...state, phase: { type: "roundEnd", result } };
};

/** 打牌が誰にも鳴かれなかった後の進行(見逃し処理 → 流局判定 → 下家のツモ) */
export const advanceAfterDiscard = (
  state: GameState,
  from: number,
  tile: Tile,
): GameState => {
  const marked = markPassedWaits(state, tile, [from]);
  if (marked.wallCount === 0) {
    return exhaustiveDraw(marked);
  }
  return drawFor(marked, (from + 1) % PLAYER_COUNT);
};

/**
 * 加槓を完成させる(槍槓が成立しなかった後)。
 * ポンをカンへ差し替え、一発を消し、嶺上牌をツモる
 */
export const completeKakan = (
  state: GameState,
  seat: number,
  tile: Tile,
): GameState => {
  const player = state.players[seat];
  const meldIndex = player.melds.findIndex(
    (gameMeld) =>
      gameMeld.meld.type === "pon" && sameKind(gameMeld.meld.tiles[0], tile),
  );
  if (meldIndex === -1) {
    return state;
  }
  const target = player.melds[meldIndex];
  const upgradedMeld: Meld = {
    type: "kan",
    tiles: [...target.meld.tiles, tile],
  };
  const melds = player.melds.map((gameMeld, index) =>
    index === meldIndex ? { meld: upgradedMeld, from: target.from } : gameMeld,
  );
  const withMeld = updatePlayer(
    state,
    seat,
    refreshWaits({ ...player, melds }),
  );
  const interrupted = clearAllIppatsu({ ...withMeld, interrupted: true });
  return drawRinshanFor(interrupted, seat);
};
