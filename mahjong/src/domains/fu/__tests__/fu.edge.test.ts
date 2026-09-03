import { test, expect } from "vitest";

import { fuOf, pon } from "./setup";

test("符は10符単位に切り上げる(36符 → 40符)", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "5s", "5s", "5s", "9p", "9p"], winTile: "9p", winType: "ron" }),
  ).toBe(40);
});

test("平和の手はロンでも符の内訳に関わらず30符になる", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "2s", "3s", "4s", "9p", "9p"], winTile: "4s", winType: "ron", hasPinfu: true }),
  ).toBe(30);
});

test("副露した手のロンには門前加符が付かない", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [pon("5s")], winTile: "9p", winType: "ron" }),
  ).toBe(30);
});

test("副露した手のツモには2符が付く(20 + 2 + 単騎2 + 明刻2 = 26 → 30)", () => {
  expect(
    fuOf({ hand: ["2m", "3m", "4m", "4p", "5p", "6p", "6s", "7s", "8s", "9p", "9p"], melds: [pon("5s")], winTile: "9p", winType: "tsumo" }),
  ).toBe(30);
});

test("刻子・雀頭・待ちの符は合算される(20 + 么九暗刻8×2 + 么九明刻4×2 + 役牌雀頭2 + 単騎2 = 48 → 50)", () => {
  expect(
    fuOf({ hand: ["1s", "1s", "1s", "haku", "haku", "haku", "chun", "chun"], melds: [pon("9p"), pon("9m")], winTile: "chun", winType: "ron" }),
  ).toBe(50);
});
