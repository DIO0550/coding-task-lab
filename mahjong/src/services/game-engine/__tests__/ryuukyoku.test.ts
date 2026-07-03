import { test, expect } from "vitest";

import { LIVE_WALL_SIZE } from "../../../domains/game/index.ts";
import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

test("荒牌流局: 親のみテンパイならノーテン罰符(3000/1000)が移動し、親継続で本場+1になる", () => {
  const dealt = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "nan", "nan"),
      t("1m", "9m", "2p", "8p", "3s", "7s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("2m", "8m", "3p", "7p", "4s", "6s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("4m", "6m", "4p", "6p", "5s", "1s", "9s", "1p", "9p", "2s", "8s", "3m", "7m"),
    ],
    draws: t("5m"),
  });
  // 山を使い切った状態を再現する(残り牌数0)。
  const state = { ...dealt, drawIndex: LIVE_WALL_SIZE };

  const drawn = state.players[0].drawnTile;
  if (drawn === null) {
    throw new Error("親のツモ牌が無い");
  }
  const afterDiscard = GameEngine.apply(state, { type: "discard", seat: 0, tile: drawn, riichi: false });

  expect(afterDiscard.phase.type).toBe("round_end");
  if (afterDiscard.phase.type !== "round_end" || afterDiscard.phase.result.type !== "ryuukyoku") {
    throw new Error("荒牌流局として確定していない");
  }
  const result = afterDiscard.phase.result;
  expect(result.tenpaiSeats).toEqual([0]);
  expect(result.payments).toEqual([
    { seat: 0, amount: 3000 },
    { seat: 1, amount: -1000 },
    { seat: 2, amount: -1000 },
    { seat: 3, amount: -1000 },
  ]);
  expect(result.scores).toEqual([28000, 24000, 24000, 24000]);
  expect(afterDiscard.phase.type === "round_end" && afterDiscard.phase.nextKyoku).toEqual({
    type: "continue",
    roundWind: "ton",
    kyokuNumber: 1,
    honba: 1,
    kyotaku: 0,
    dealerSeat: 0,
  });
});

test("荒牌流局: 親がノーテンなら輪荘(親交代)し、本場は+1になる", () => {
  const dealt = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("1m", "9m", "2p", "8p", "3s", "7s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "nan", "nan"),
      t("2m", "8m", "3p", "7p", "4s", "6s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("4m", "6m", "4p", "6p", "5s", "1s", "9s", "1p", "9p", "2s", "8s", "3m", "7m"),
    ],
    draws: t("5m"),
  });
  const state = { ...dealt, drawIndex: LIVE_WALL_SIZE };

  const drawn = state.players[0].drawnTile;
  if (drawn === null) {
    throw new Error("親のツモ牌が無い");
  }
  const afterDiscard = GameEngine.apply(state, { type: "discard", seat: 0, tile: drawn, riichi: false });

  expect(afterDiscard.phase.type).toBe("round_end");
  if (afterDiscard.phase.type !== "round_end" || afterDiscard.phase.result.type !== "ryuukyoku") {
    throw new Error("荒牌流局として確定していない");
  }
  const result = afterDiscard.phase.result;
  expect(result.tenpaiSeats).toEqual([1]);
  expect(result.scores).toEqual([24000, 28000, 24000, 24000]);
  expect(afterDiscard.phase.type === "round_end" && afterDiscard.phase.nextKyoku).toEqual({
    type: "continue",
    roundWind: "ton",
    kyokuNumber: 2,
    honba: 1,
    kyotaku: 0,
    dealerSeat: 1,
  });
});
