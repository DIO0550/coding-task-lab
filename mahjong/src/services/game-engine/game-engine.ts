import { GameState, type RankingEntry } from "@/src/domains/game-state";
import { PlayerAction } from "@/src/domains/player-action";
import { PlayerConfig } from "@/src/domains/player-config";
import { RoundState, type CallResponse } from "@/src/domains/round-state";
import { RuleConfig } from "@/src/domains/rule-config";
import type { SeatIndex } from "@/src/domains/seat";
import { TableView } from "@/src/domains/table-view";
import type { Tile } from "@/src/domains/tile";
import { Wall } from "@/src/domains/wall";
import type { Wind } from "@/src/domains/wind";
import { CpuAi } from "@/src/services/cpu-ai";
import { Call } from "@/src/services/game-engine/call";
import { LegalActions } from "@/src/services/game-engine/legal-actions";
import { Settlement } from "@/src/services/game-engine/settlement";
import { Turn } from "@/src/services/game-engine/turn";

/**
 * ゲーム進行エンジンの公開API。
 *
 * 使い方:
 *   const game = GameEngine.start({ players, rules }, rng);
 *   while (!GameState.isFinished(game)) {
 *     if (GameEngine.hasPendingCpu(game)) game = GameEngine.advanceCpu(game, rng);
 *     else if (GameEngine.isWaitingForHuman(game)) game = GameEngine.apply(game, seat, chosenAction, rng);
 *     else if (game.round.phase.type === "ended") game = GameEngine.apply(game, seat, PlayerAction.confirmResult(), rng);
 *   }
 */
export type GameSetup = Readonly<{
  players: readonly PlayerConfig[];
  rules: RuleConfig;
  /** 並び順を指定した136枚(テスト用。指定時は最初の局のみ洗牌しない) */
  wallTiles?: readonly Tile[];
  /** 開始局の指定(テスト用) */
  initial?: Readonly<
    Partial<{
      roundWind: Wind;
      roundNumber: number;
      honba: number;
      kyotaku: number;
      dealer: SeatIndex;
      scores: readonly number[];
    }>
  >;
}>;

const toResponse = (action: PlayerAction): CallResponse | undefined => {
  switch (action.type) {
    case "ron":
      return { type: "ron" };
    case "pon":
      return { type: "pon", tiles: action.tiles };
    case "chi":
      return { type: "chi", tiles: action.tiles };
    case "pass":
      return { type: "pass" };
    case "kan":
      return action.kind === "daiminkan" ? { type: "kan" } : undefined;
    case "discard":
    case "tsumo":
    case "confirm_result":
      return undefined;
  }
};

const dispatch = (game: GameState, seat: SeatIndex, action: PlayerAction): GameState => {
  switch (action.type) {
    case "discard":
      return Turn.discard(game, seat, action.tile, action.riichi);
    case "tsumo":
      return Turn.tsumo(game, seat);
    case "kan":
      return action.kind === "daiminkan" ? Call.respond(game, seat, { type: "kan" }) : Turn.kan(game, seat, action.kind, action.tile);
    case "ron":
    case "pon":
    case "chi":
    case "pass": {
      const response = toResponse(action);
      return response === undefined ? game : Call.respond(game, seat, response);
    }
    case "confirm_result":
      return game;
  }
};

export const GameEngine = {
  /** 東一局0本場・供託0・各家の持ち点から対局を開始し、親の第一ツモまで進める */
  start(setup: GameSetup, rng: () => number): GameState {
    const initial = setup.initial ?? {};
    const wall = (setup.wallTiles === undefined ? undefined : Wall.fromTiles(setup.wallTiles)) ?? Wall.create(rng, setup.rules.akaDora);
    const round = RoundState.create({
      roundWind: initial.roundWind ?? "ton",
      roundNumber: initial.roundNumber ?? 1,
      honba: initial.honba ?? 0,
      kyotaku: initial.kyotaku ?? 0,
      dealer: initial.dealer ?? 0,
      wall,
    });
    return {
      players: setup.players,
      rules: setup.rules,
      scores: initial.scores ?? [0, 1, 2, 3].map(() => setup.rules.startingPoints),
      round,
      status: "playing",
      history: [],
    };
  },

  availableActions(game: GameState, seat: SeatIndex): readonly PlayerAction[] {
    return LegalActions.forSeat(game, seat);
  },

  pendingSeats(game: GameState): readonly SeatIndex[] {
    return GameState.pendingSeats(game);
  },

  /** 次に判断を求められている席(なければ null) */
  nextActor(game: GameState): SeatIndex | null {
    return GameState.pendingSeats(game)[0] ?? null;
  },

  hasPendingCpu(game: GameState): boolean {
    return GameState.pendingSeats(game).some((seat) => GameState.isCpu(game, seat));
  },

  /** 人間の入力待ち(CPU の判断はすべて済んでいる) */
  isWaitingForHuman(game: GameState): boolean {
    const pending = GameState.pendingSeats(game);
    return pending.length > 0 && pending.every((seat) => GameState.isHuman(game, seat));
  },

  /** 行動を適用する。合法でない行動は無視して同じ状態を返す */
  apply(game: GameState, seat: SeatIndex, action: PlayerAction, rng: () => number): GameState {
    if (GameState.isFinished(game)) return game;
    if (action.type === "confirm_result") return Settlement.confirm(game, rng);
    const legal = LegalActions.forSeat(game, seat).some((candidate) => PlayerAction.equals(candidate, action));
    return legal ? dispatch(game, seat, action) : game;
  },

  /** 判断待ちの CPU が1人いれば、その CPU の行動を1つ適用する */
  advanceCpu(game: GameState, rng: () => number): GameState {
    const seat = GameState.pendingSeats(game).find((candidate) => GameState.isCpu(game, candidate));
    if (seat === undefined) return game;
    const actions = LegalActions.forSeat(game, seat);
    if (actions.length === 0) return game;
    const action = CpuAi.decide(TableView.from(game, seat), actions, game.players[seat].level, game.rules, rng);
    return GameEngine.apply(game, seat, action, rng);
  },

  viewFor(game: GameState, seat: SeatIndex): TableView {
    return TableView.from(game, seat);
  },

  ranking(game: GameState): readonly RankingEntry[] {
    return GameState.ranking(game);
  },
} as const;
