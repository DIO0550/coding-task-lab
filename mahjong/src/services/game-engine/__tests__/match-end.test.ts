import { test, expect } from "vitest";

import { GameEngine } from "../index.ts";
import { createTestMatch, defaultConfig, t } from "./support.ts";

test("東風戦は東4局で親以外が和了すると終局し、持ち点降順で順位が決まる", () => {
  const config = defaultConfig({ matchType: "tonpuu" });
  const state = createTestMatch({
    config,
    dealerSeat: 0,
    roundWind: "ton",
    kyokuNumber: 4,
    scores: [30000, 20000, 26000, 24000],
    hands: [
      t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("3p", "4p", "5p", "3p", "4p", "5p", "2m", "3m", "4m", "4s", "4s", "6s", "7s"),
      t("2m", "8m", "2p", "8p", "2s", "8s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("5m", "6m", "7m", "4p", "6p", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "1s"),
    ],
    draws: t("2s", "5s"),
  });

  const afterDealerDiscard = GameEngine.apply(state, { type: "discard", seat: 0, tile: t("chun")[0], riichi: false });
  expect(afterDealerDiscard.phase.type === "turn" && afterDealerDiscard.phase.actor).toBe(1);

  const afterTsumo = GameEngine.apply(afterDealerDiscard, { type: "tsumo", seat: 1 });
  expect(afterTsumo.phase.type).toBe("round_end");
  if (afterTsumo.phase.type !== "round_end") {
    throw new Error("round_endになっていない");
  }
  expect(afterTsumo.phase.nextKyoku.type).toBe("end");

  const afterConfirm = GameEngine.apply(afterTsumo, { type: "confirm" });
  expect(afterConfirm.phase.type).toBe("match_end");
  if (afterConfirm.phase.type !== "match_end") {
    throw new Error("match_endになっていない");
  }

  const bySeat = [...afterConfirm.phase.ranking].toSorted((a, b) => a.seat - b.seat);
  const scores = bySeat.map((r) => r.score);
  const ranks = bySeat.map((r) => r.rank);
  // seat1が和了して1位、他は着順のみ持ち点降順で決まる
  expect(ranks[1]).toBe(1);
  expect(scores.every((s) => typeof s === "number")).toBe(true);
  expect([...ranks].sort()).toEqual([1, 2, 3, 4]);
});

test("持ち点が0点未満になったら(トビ)即座に終局する", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    scores: [500, 25000, 25000, 49500],
    hands: [
      t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "5s"),
      t("3p", "4p", "5p", "3p", "4p", "5p", "2m", "3m", "4m", "4s", "4s", "6s", "7s"),
      t("2m", "8m", "6m", "7m", "2p", "8p", "9p", "ton", "nan", "sha", "pei", "chun", "haku"),
      t("1m", "9m", "2p", "8p", "9p", "1p", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
    ],
  });

  const afterDiscard = GameEngine.apply(state, { type: "discard", seat: 0, tile: t("5s")[0], riichi: false });
  expect(afterDiscard.phase.type).toBe("claims");
  const afterRon = GameEngine.apply(afterDiscard, { type: "ron", seat: 1 });

  expect(afterRon.phase.type).toBe("round_end");
  if (afterRon.phase.type !== "round_end") {
    throw new Error("round_endになっていない");
  }
  expect(afterRon.players[0].score).toBe(500);
  expect(afterRon.phase.result.scores[0]).toBeLessThan(0);
  expect(afterRon.phase.nextKyoku.type).toBe("end");
  expect(GameEngine.dealerContinues(afterRon)).toBeNull();

  const afterConfirm = GameEngine.apply(afterRon, { type: "confirm" });
  expect(afterConfirm.phase.type).toBe("match_end");
  expect(afterConfirm.players[0].score).toBeLessThan(0);
});
