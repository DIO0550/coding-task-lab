import { test, expect } from "vitest";

import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

test("子ロン満貫(5翻)は放銃者-8300・和了者+9300(本場1・供託1込み)、供託は0に戻る", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    honba: 1,
    kyotaku: 1,
    scores: [25000, 25000, 24000, 25000],
    hands: [
      t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "5s"),
      t("3p", "4p", "5p", "3p", "4p", "5p", "2m", "3m", "4m", "4s", "4s", "6s", "7s"),
      t("2m", "8m", "6m", "7m", "2p", "8p", "9p", "ton", "nan", "sha", "pei", "chun", "haku"),
      t("1m", "9m", "2p", "8p", "9p", "1p", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
    ],
    doraIndicators: t("3p"),
  });

  const fiveS = t("5s")[0];
  const afterDiscard = GameEngine.apply(state, { type: "discard", seat: 0, tile: fiveS, riichi: false });
  expect(afterDiscard.phase.type).toBe("claims");

  const afterRon = GameEngine.apply(afterDiscard, { type: "ron", seat: 1 });
  expect(afterRon.phase.type).toBe("round_end");
  if (afterRon.phase.type !== "round_end" || afterRon.phase.result.type !== "win") {
    throw new Error("和了として確定していない");
  }

  const result = afterRon.phase.result;
  expect(result.winner).toBe(1);
  expect(result.winType).toBe("ron");
  expect(result.discarder).toBe(0);
  expect(result.han).toBe(5);
  expect(result.scoreTotal).toBe(9300);
  expect(result.payments).toEqual([
    { seat: 1, amount: 9300 },
    { seat: 0, amount: -8300 },
  ]);
  expect(result.scores).toEqual([16700, 34300, 24000, 25000]);

  expect(afterRon.players[0].score).toBe(16700);
  expect(afterRon.players[1].score).toBe(34300);
  expect(afterRon.players[2].score).toBe(24000);
  expect(afterRon.players[3].score).toBe(25000);
  expect(afterRon.kyotaku).toBe(0);

  const totalScore = afterRon.players.reduce((sum, p) => sum + p.score, 0);
  expect(totalScore + afterRon.kyotaku * 1000).toBe(100000);
});
