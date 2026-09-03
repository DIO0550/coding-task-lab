import { test, expect } from "vitest";

import { PlayerAction } from "@/src/domains/player-action";

import { GameEngine } from "..";

import { JUNK_HANDS, actionTypes, apply, discard, startGame } from "./fixtures";

test("親がツモ→打牌すると手番が下家へ移り、下家がツモる", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m", "9p"] });
  const next = discard(game, 0, "pei");
  expect(next.round.phase).toMatchObject({ type: "action", seat: 1 });
  expect(next.round.seats[1].drawnTile).toBe("9p");
  expect(next.round.seats[0].drawnTile).toBeNull();
  expect(GameEngine.viewFor(next, 1).remaining).toBe(68);
});

test("打牌した牌は河に並び、手牌は13枚に戻る", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m"] });
  const next = discard(game, 0, "9m");
  expect(next.round.seats[0].river).toStrictEqual([{ tile: "9m", isRiichi: false, calledBy: null }]);
  expect(next.round.seats[0].hand).toHaveLength(13);
});

test("手番は東家→南家→西家→北家→東家の順に一周する", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m", "9p", "9s", "9m", "9p"] });
  const afterRound = [0, 1, 2, 3].reduce((current, seat) => discard(current, seat as 0 | 1 | 2 | 3, "ton"), game);
  expect(afterRound.round.phase).toMatchObject({ type: "action", seat: 0 });
  expect(afterRound.round.seats[0].drawnTile).toBe("9p");
});

test("手番でないプレイヤーの打牌は無視される", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m"] });
  expect(discard(game, 1, "pei")).toBe(game);
});

test("手牌にない牌の打牌は無視される", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m"] });
  expect(discard(game, 0, "chun")).toBe(game);
});

test("手番のプレイヤーには打牌が選択肢として提示され、和了形でなければツモ和了は提示されない", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m"] });
  const actions = GameEngine.availableActions(game, 0);
  expect(actions.filter((action) => action.type === "discard")).toHaveLength(14);
  expect(actionTypes(game, 0)).not.toContain("tsumo");
  expect(GameEngine.availableActions(game, 1)).toStrictEqual([]);
});

test("判断待ちの席は手番のプレイヤーだけになる", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m"] });
  expect(GameEngine.pendingSeats(game)).toStrictEqual([0]);
  expect(GameEngine.nextActor(game)).toBe(0);
  expect(GameEngine.isWaitingForHuman(game)).toBe(true);
  expect(GameEngine.hasPendingCpu(game)).toBe(false);
});

test("結果確定以外の行動は局が終わっていないときに確定として扱われない", () => {
  const game = startGame({ hands: JUNK_HANDS, draws: ["9m"] });
  expect(apply(game, 0, PlayerAction.confirmResult())).toBe(game);
});
