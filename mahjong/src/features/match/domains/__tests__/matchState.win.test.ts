import { test, expect } from "vitest";

import { MatchSetup, MatchState } from "../index";

const startedMatch = (): MatchState => MatchState.start(MatchSetup.createDefault());

test("対戦開始時は東一局・0本場・供託0本で全員が持ち点25,000点になる", () => {
  const state = startedMatch();
  expect(state.round).toStrictEqual({ wind: "east", count: 1 });
  expect(state.honba).toBe(0);
  expect(state.kyotaku).toBe(0);
  expect(state.dealerSeat).toBe(0);
  expect(state.players.map((player) => player.score)).toStrictEqual([
    25000, 25000, 25000, 25000,
  ]);
});

test("持ち点30,000点開始の設定で対戦を開始すると全員30,000点になる", () => {
  const setup = MatchSetup.updateRules(MatchSetup.createDefault(), { startingPoints: 30000 });
  const state = MatchState.start(setup);
  expect(state.players.map((player) => player.score)).toStrictEqual([
    30000, 30000, 30000, 30000,
  ]);
});

test("親が40符2翻でロン和了すると放銃者から3,900点が移動する", () => {
  const state = startedMatch();
  const next = MatchState.applyWin(state, {
    winnerSeat: 0,
    loserSeat: 1,
    winType: "ron",
    han: 2,
    fu: 40,
  });
  expect(next.players.map((player) => player.score)).toStrictEqual([
    28900, 21100, 25000, 25000,
  ]);
});

test("子が30符3翻でツモ和了すると親から2,000点・他の子から1,000点ずつ移動する", () => {
  const state = startedMatch();
  const next = MatchState.applyWin(state, {
    winnerSeat: 1,
    loserSeat: null,
    winType: "tsumo",
    han: 3,
    fu: 30,
  });
  expect(next.players.map((player) => player.score)).toStrictEqual([
    23000, 29000, 24000, 24000,
  ]);
});

test("親が30符1翻でツモ和了すると子全員から500点ずつ移動する", () => {
  const state = startedMatch();
  const next = MatchState.applyWin(state, {
    winnerSeat: 0,
    loserSeat: null,
    winType: "tsumo",
    han: 1,
    fu: 30,
  });
  expect(next.players.map((player) => player.score)).toStrictEqual([
    26500, 24500, 24500, 24500,
  ]);
});

test("供託がある場合は和了者へ供託点が加算され供託が0本に戻る", () => {
  const state: MatchState = { ...startedMatch(), kyotaku: 2 };
  const next = MatchState.applyWin(state, {
    winnerSeat: 1,
    loserSeat: 2,
    winType: "ron",
    han: 1,
    fu: 30,
  });
  expect(next.players[1].score).toBe(28000);
  expect(next.players[2].score).toBe(24000);
  expect(next.kyotaku).toBe(0);
});

test("本場分の点数が放銃者の支払いに加算される", () => {
  const state: MatchState = { ...startedMatch(), honba: 2 };
  const next = MatchState.applyWin(state, {
    winnerSeat: 1,
    loserSeat: 2,
    winType: "ron",
    han: 1,
    fu: 30,
  });
  expect(next.players[1].score).toBe(26600);
  expect(next.players[2].score).toBe(23400);
});

test("親が和了すると親が継続し本場が1増える", () => {
  const state = startedMatch();
  const next = MatchState.applyWin(state, {
    winnerSeat: 0,
    loserSeat: 1,
    winType: "ron",
    han: 1,
    fu: 30,
  });
  expect(next.dealerSeat).toBe(0);
  expect(next.honba).toBe(1);
  expect(next.round).toStrictEqual({ wind: "east", count: 1 });
});

test("子が和了すると本場が0に戻る", () => {
  const state: MatchState = { ...startedMatch(), honba: 3 };
  const next = MatchState.applyWin(state, {
    winnerSeat: 1,
    loserSeat: null,
    winType: "tsumo",
    han: 1,
    fu: 30,
  });
  expect(next.honba).toBe(0);
});
