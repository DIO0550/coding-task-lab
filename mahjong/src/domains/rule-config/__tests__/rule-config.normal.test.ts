import { test, expect } from "vitest";

import { RuleConfig } from "..";

test("ルール設定の初期値は半荘戦・25,000点持ち・返し点30,000点・喰いタンあり・後付けあり・赤ドラあり・CPU自動和了あり", () => {
  expect(RuleConfig.default()).toStrictEqual({
    gameLength: "hanchan",
    startingPoints: 25000,
    returnPoints: 30000,
    kuitan: true,
    atozuke: true,
    akaDora: true,
    cpuAutoWin: true,
  });
});

test("点数計算に渡すルールは喰いタンと後付けの設定だけを含む", () => {
  const config = RuleConfig.with(RuleConfig.default(), { kuitan: false, atozuke: false });
  expect(RuleConfig.toScoringRules(config)).toStrictEqual({ kuitan: false, atozuke: false });
});

test("東風戦の最終局は東場、半荘戦の最終局は南場になる", () => {
  expect(RuleConfig.lastRoundWind(RuleConfig.with(RuleConfig.default(), { gameLength: "tonpuu" }))).toBe("ton");
  expect(RuleConfig.lastRoundWind(RuleConfig.default())).toBe("nan");
});

test("返し点30,000・25,000点持ちのオカは20,000点、返し点なしなら0", () => {
  expect(RuleConfig.oka(RuleConfig.default())).toBe(20000);
  expect(RuleConfig.oka(RuleConfig.with(RuleConfig.default(), { returnPoints: null }))).toBe(0);
});
