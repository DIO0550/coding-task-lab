import { test, expect } from "vitest";

import { PlayerAction } from "@/src/domains/player-action";
import type { Tile } from "@/src/domains/tile";

import { GameEngine } from "..";

import { actionTypes, apply, discard, passTurn, startGame } from "./fixtures";

/** 断么九の 3p/6p 待ち */
const WAITING: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];

test("自分の河に待ち牌があるとロンできない(フリテン)", () => {
  // 北家が 6p をツモ切りした後、東家が 3p を切る
  const game = startGame({ hands: [null, null, null, WAITING], draws: ["haku", "haku", "haku", "6p", "3p"] });
  const afterFirstRound = [0, 1, 2].reduce((current, seat) => discard(current, seat as 0 | 1 | 2, "haku"), game);
  const northDiscarded = discard(afterFirstRound, 3, "6p");
  expect(GameEngine.viewFor(northDiscarded, 3).isFuriten).toBe(true);
  const eastDiscarded = discard(northDiscarded, 0, "3p");
  expect(eastDiscarded.round.phase).toMatchObject({ type: "action", seat: 1 });
});

test("フリテンでもツモ和了はできる", () => {
  const game = startGame({ hands: [null, null, null, WAITING], draws: ["haku", "haku", "haku", "6p", "chun", "chun", "chun", "3p"] });
  const afterFirst = discard([0, 1, 2].reduce((current, seat) => discard(current, seat as 0 | 1 | 2, "haku"), game), 3, "6p");
  const secondTurn = [0, 1, 2].reduce((current, seat) => discard(current, seat as 0 | 1 | 2, "chun"), afterFirst);
  expect(secondTurn.round.seats[3].drawnTile).toBe("3p");
  expect(actionTypes(secondTurn, 3)).toContain("tsumo");
});

test("ロンを見逃すと同巡はロンできず、自分が打牌すると解除される", () => {
  const game = startGame({ hands: [null, null, null, WAITING], draws: ["3p", "6p", "haku", "chun", "3p"] });
  const first = discard(game, 0, "3p");
  expect(first.round.phase).toMatchObject({ type: "call", ronCandidates: [3] });
  const missed = apply(first, 3, PlayerAction.pass());
  expect(missed.round.seats[3].temporaryFuriten).toBe(true);
  // 南家が 6p を切っても同巡フリテンでロンできない
  const second = discard(missed, 1, "6p");
  expect(second.round.phase).toMatchObject({ type: "action", seat: 2 });
  // 北家が自分の手番でツモ切りすると解除され、次に東家が切った 3p をロンできる
  const cleared = discard(discard(second, 2, "haku"), 3, "chun");
  expect(cleared.round.seats[3].temporaryFuriten).toBe(false);
  const again = discard(cleared, 0, "3p");
  expect(again.round.phase).toMatchObject({ type: "call", ronCandidates: [3] });
});

test("リーチ後にロンを見逃すと、その局はロンできなくなる", () => {
  const game = startGame({ hands: [WAITING, null, null, null], draws: ["haku", "3p", "6p", "haku", "haku", "3p"] });
  const riichi = discard(game, 0, "haku", true);
  const missed = apply(discard(riichi, 1, "3p"), 0, PlayerAction.pass());
  expect(missed.round.seats[0].permanentFuriten).toBe(true);
  const second = discard(missed, 2, "6p");
  expect(second.round.phase).toMatchObject({ type: "action", seat: 3 });
  const ownTurn = discard(passTurn(second, 3), 0, "haku");
  expect(ownTurn.round.seats[0].permanentFuriten).toBe(true);
  const later = discard(ownTurn, 1, "3p");
  expect(later.round.phase).toMatchObject({ type: "action", seat: 2 });
});
