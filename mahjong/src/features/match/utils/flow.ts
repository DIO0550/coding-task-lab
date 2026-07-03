import {
  Game,
  type GameAction,
  type GameState,
} from "@/src/services/game";
import { Cpu } from "@/src/services/cpu";

/** CPU が自動で行うべき次のアクション。なければ null(人間の入力待ちなど) */
export const nextAutoAction = (game: GameState): GameAction | null => {
  const phase = game.phase;

  if (phase.type === "turn") {
    const player = game.config.players[phase.actor];
    if (player.kind !== "cpu") {
      return null;
    }
    const actions = Game.availableTurnActions(game);
    if (actions === null) {
      return null;
    }
    return Cpu.decideTurn(
      Game.playerView(game, phase.actor),
      actions,
      player.cpuLevel,
    );
  }

  if (phase.type === "claims") {
    const pending = phase.options.find(
      (option) =>
        game.config.players[option.player].kind === "cpu" &&
        phase.responses[option.player] === null,
    );
    if (pending === undefined) {
      return null;
    }
    return Cpu.decideClaim(
      Game.playerView(game, pending.player),
      pending,
      phase.tile,
      game.config.players[pending.player].cpuLevel,
    );
  }

  return null;
};

/** 画面下辺の視点となる席。行動が必要な人間 > 最初の人間 > 東家 */
export const viewSeatOf = (game: GameState): number => {
  const humanSeats = game.config.players
    .map((player, seat) => ({ player, seat }))
    .filter(({ player }) => player.kind === "human")
    .map(({ seat }) => seat);

  const phase = game.phase;
  if (phase.type === "turn" && humanSeats.includes(phase.actor)) {
    return phase.actor;
  }
  if (phase.type === "claims") {
    const waiting = phase.options.find(
      (option) =>
        humanSeats.includes(option.player) &&
        phase.responses[option.player] === null,
    );
    if (waiting !== undefined) {
      return waiting.player;
    }
  }
  return humanSeats[0] ?? 0;
};
