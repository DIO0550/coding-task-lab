import { test, expect } from "vitest";

import { MatchSetup, MatchState, type MatchLength } from "../index";

const startedMatch = (matchLength: MatchLength = "hanchan"): MatchState =>
  MatchState.start(MatchSetup.updateRules(MatchSetup.createDefault(), { matchLength }));

const childTsumo = (state: MatchState): MatchState =>
  MatchState.applyWin(state, {
    winnerSeat: state.dealerSeat === 1 ? 2 : 1,
    loserSeat: null,
    winType: "tsumo",
    han: 1,
    fu: 30,
  });

test("子が和了すると次局へ進み親が次の席へ移る", () => {
  const state = startedMatch();
  const next = childTsumo(state);
  expect(next.round).toStrictEqual({ wind: "east", count: 2 });
  expect(next.dealerSeat).toBe(1);
});

test("親が和了しても局と親は変わらない", () => {
  const state = startedMatch();
  const next = MatchState.applyWin(state, {
    winnerSeat: 0,
    loserSeat: 1,
    winType: "ron",
    han: 1,
    fu: 30,
  });
  expect(next.round).toStrictEqual({ wind: "east", count: 1 });
  expect(next.dealerSeat).toBe(0);
});

test("半荘戦では東四局で子が和了すると南一局へ進む", () => {
  const state: MatchState = {
    ...startedMatch("hanchan"),
    round: { wind: "east", count: 4 },
    dealerSeat: 3,
  };
  const next = childTsumo(state);
  expect(next.round).toStrictEqual({ wind: "south", count: 1 });
  expect(next.dealerSeat).toBe(0);
});

test("東風戦では東四局で子が和了しても局は進まない", () => {
  const state: MatchState = {
    ...startedMatch("tonpuusen"),
    round: { wind: "east", count: 4 },
    dealerSeat: 3,
  };
  const next = childTsumo(state);
  expect(next.round).toStrictEqual({ wind: "east", count: 4 });
});

test("半荘戦では南四局で子が和了しても局は進まない", () => {
  const state: MatchState = {
    ...startedMatch("hanchan"),
    round: { wind: "south", count: 4 },
    dealerSeat: 3,
  };
  const next = childTsumo(state);
  expect(next.round).toStrictEqual({ wind: "south", count: 4 });
});

test("親が移ると新しい親を東として各席の風が振り直される", () => {
  const state = startedMatch();
  const next = childTsumo(state);
  expect(MatchState.windOf(next, 1)).toBe("east");
  expect(MatchState.windOf(next, 2)).toBe("south");
  expect(MatchState.windOf(next, 3)).toBe("west");
  expect(MatchState.windOf(next, 0)).toBe("north");
});
