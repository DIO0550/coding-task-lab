import { test, expect } from "vitest";

import { PlayerAction } from "..";

test("同じ内容の行動は等しいと判定される", () => {
  expect(PlayerAction.equals(PlayerAction.discard("1m", true), { type: "discard", tile: "1m", riichi: true })).toBe(true);
  expect(PlayerAction.equals(PlayerAction.discard("1m"), PlayerAction.discard("1m", true))).toBe(false);
  expect(PlayerAction.equals(PlayerAction.pon(["5m", "0m"]), PlayerAction.pon(["5m", "0m"]))).toBe(true);
  expect(PlayerAction.equals(PlayerAction.kan("ankan", "9s"), PlayerAction.kan("kakan", "9s"))).toBe(false);
});

test("ツモとロンは和了宣言として扱われる", () => {
  expect(PlayerAction.isWin(PlayerAction.tsumo())).toBe(true);
  expect(PlayerAction.isWin(PlayerAction.ron())).toBe(true);
  expect(PlayerAction.isWin(PlayerAction.pass())).toBe(false);
});

test("他家の打牌への応答は鳴き・ロン・パス・大明カン", () => {
  expect(PlayerAction.isCallResponse(PlayerAction.chi(["1m", "2m"]))).toBe(true);
  expect(PlayerAction.isCallResponse(PlayerAction.kan("daiminkan", "1m"))).toBe(true);
  expect(PlayerAction.isCallResponse(PlayerAction.kan("ankan", "1m"))).toBe(false);
  expect(PlayerAction.isCallResponse(PlayerAction.discard("1m"))).toBe(false);
});
