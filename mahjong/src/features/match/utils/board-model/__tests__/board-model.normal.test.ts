import { test, expect } from "vitest";

import { PlayerConfig } from "@/src/domains/player-config";
import { RuleConfig } from "@/src/domains/rule-config";

import { BoardModel } from "..";

test("対戦前のプレビューは東一局0本場供託0本で、各家が設定した持ち点を持つ", () => {
  const model = BoardModel.preview(PlayerConfig.defaults(), RuleConfig.with(RuleConfig.default(), { startingPoints: 30000 }));
  expect(model).toMatchObject({ roundWind: "ton", roundNumber: 1, honba: 0, kyotaku: 0, remaining: null, turnSeat: null });
  expect(model.seats.map((seat) => seat.score)).toStrictEqual([30000, 30000, 30000, 30000]);
  expect(model.seats.map((seat) => seat.wind)).toStrictEqual(["ton", "nan", "sha", "pei"]);
  expect(model.seats.map((seat) => seat.isDealer)).toStrictEqual([true, false, false, false]);
});
