import { test, expect } from "vitest";

import { MatchSetup } from "../index";

test("既定ルールは半荘戦・25,000点持ち・返し30,000点・喰いタン/後付け/赤ドラ/CPU自動和了ありになる", () => {
  const setup = MatchSetup.createDefault();
  expect(setup.rules).toStrictEqual({
    matchLength: "hanchan",
    startingPoints: 25000,
    returnPoints: 30000,
    kuitan: true,
    atozuke: true,
    akaDora: true,
    cpuAutoWin: true,
  });
});

test("既定のプレイヤーは1席目が人間・残り3席がCPU(標準)になる", () => {
  const setup = MatchSetup.createDefault();
  expect(setup.players.map((player) => player.type)).toStrictEqual([
    "human",
    "cpu",
    "cpu",
    "cpu",
  ]);
  expect(setup.players[1].cpuLevel).toBe("standard");
});

test("プレイヤー設定の更新は指定した席だけに反映される", () => {
  const setup = MatchSetup.updatePlayer(MatchSetup.createDefault(), 0, {
    type: "cpu",
    cpuLevel: "advanced",
  });
  expect(setup.players[0].type).toBe("cpu");
  expect(setup.players[0].cpuLevel).toBe("advanced");
  expect(setup.players[1].type).toBe("cpu");
  expect(setup.players[1].cpuLevel).toBe("standard");
});
