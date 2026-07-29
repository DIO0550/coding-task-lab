import { expect, test } from "vitest";

import { Rule } from "../../../domains/rule/index.ts";
import { Game, GameAction } from "../index.ts";
import { sessionOf } from "./game-fixture.ts";

const IDLE_HAND = "ton ton nan nan sha sha pei pei haku haku hatsu hatsu chun";
const TENPAI_HAND = "2m 3m 4m 6m 7m 8m 2s 3s 4s 6p 7p 9m 9m";
const DISCARDER_HAND = "1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 1p 1p 5p";

/** 子(南家)がロン和了した直後のセッションを作る。 */
const childWin = (overrides = {}) => {
  const session = sessionOf({
    seats: [
      { hand: DISCARDER_HAND },
      { hand: TENPAI_HAND },
      { hand: IDLE_HAND },
      { hand: IDLE_HAND },
    ],
    turn: 0,
    phase: "action",
    drawn: "5p",
    ...overrides,
  });
  const discarded = Game.apply(session, 0, GameAction.discard(13));
  return Game.apply(discarded, 1, GameAction.ron());
};

test("東風戦は東四局の子の和了で終局する", () => {
  const finished = Game.confirmResult(
    childWin({
      rule: Rule.with(Rule.default(), { length: "tonpuu" }),
      roundWind: "ton",
      roundNumber: 4,
      dealer: 3,
    }),
  );
  expect(finished.status).toBe("match_end");
});

test("東風戦は東三局では終局しない", () => {
  const next = Game.confirmResult(
    childWin({
      rule: Rule.with(Rule.default(), { length: "tonpuu" }),
      roundWind: "ton",
      roundNumber: 3,
      dealer: 2,
    }),
  );
  expect(next.status).toBe("playing");
});

test("半荘戦は東四局では終局しない", () => {
  const next = Game.confirmResult(
    childWin({ roundWind: "ton", roundNumber: 4, dealer: 3 }),
  );
  expect([next.status, next.match.roundWind]).toStrictEqual(["playing", "nan"]);
});

test("半荘戦は南四局の子の和了で終局する", () => {
  const finished = Game.confirmResult(
    childWin({ roundWind: "nan", roundNumber: 4, dealer: 3 }),
  );
  expect(finished.status).toBe("match_end");
});

test("持ち点が0点未満になると終局する", () => {
  const finished = Game.confirmResult(
    childWin({ scores: [300, 25000, 25000, 25000] }),
  );
  expect(finished.status).toBe("match_end");
});

test("終局すると持ち点順の順位が決まる", () => {
  const finished = Game.confirmResult(
    childWin({
      rule: Rule.with(Rule.default(), { length: "tonpuu" }),
      roundWind: "ton",
      roundNumber: 4,
      dealer: 3,
      scores: [20000, 30000, 25000, 25000],
    }),
  );
  expect(finished.ranking?.map((entry) => entry.seat)).toStrictEqual([
    1, 2, 3, 0,
  ]);
});

test("同点の場合は起家に近い席が上位になる", () => {
  const finished = Game.confirmResult(
    childWin({
      rule: Rule.with(Rule.default(), { length: "tonpuu" }),
      roundWind: "ton",
      roundNumber: 4,
      dealer: 3,
      scores: [26000, 24000, 25000, 25000],
    }),
  );
  expect(finished.ranking?.map((entry) => entry.seat)).toStrictEqual([
    0, 1, 2, 3,
  ]);
});

test("次局へ進むと新しい配牌が行われる", () => {
  const next = Game.confirmResult(childWin());
  expect(
    next.round.seats.map((seat) => seat.hand.concealed.length),
  ).toStrictEqual([13, 13, 13, 13]);
});

test("次局では前局の捨て牌が引き継がれない", () => {
  const next = Game.confirmResult(childWin());
  expect(
    next.round.seats.every((seat) => seat.river.discards.length === 0),
  ).toBe(true);
});
