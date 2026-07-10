import { test, expect } from "vitest";

import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

test("親の和了は連荘し、本場が+1になる", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    honba: 2,
    kyotaku: 1,
    hands: [
      t("3p", "4p", "5p", "3p", "4p", "5p", "2m", "3m", "4m", "4s", "4s", "6s", "7s"),
      t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("2m", "8m", "2p", "8p", "2s", "8s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("5m", "6m", "7m", "4p", "6p", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "1s"),
    ],
    draws: t("5s"),
  });

  const drawn = state.players[0].drawnTile;
  if (drawn === null) {
    throw new Error("親のツモ牌が無い");
  }
  const afterTsumo = GameEngine.apply(state, { type: "tsumo", seat: 0 });

  expect(afterTsumo.phase.type).toBe("round_end");
  if (afterTsumo.phase.type !== "round_end" || afterTsumo.phase.result.type !== "win") {
    throw new Error("和了として確定していない");
  }
  expect(afterTsumo.phase.result.isDealerWin).toBe(true);
  expect(afterTsumo.phase.nextKyoku).toEqual({
    type: "continue",
    roundWind: "ton",
    kyokuNumber: 1,
    honba: 3,
    kyotaku: 0,
    dealerSeat: 0,
  });
});

test("子の和了は親を下家へ移し、本場を0に戻す", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    honba: 2,
    kyotaku: 1,
    hands: [
      t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("3p", "4p", "5p", "3p", "4p", "5p", "2m", "3m", "4m", "4s", "4s", "6s", "7s"),
      t("2m", "8m", "2p", "8p", "2s", "8s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("5m", "6m", "7m", "4p", "6p", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "1s"),
    ],
    draws: t("2s", "5s"),
  });

  // seat0(親)はseat1が絶対に鳴けない字牌(chun)を切り、seat1が5sをツモ和了する
  const afterDealerDiscard = GameEngine.apply(state, {
    type: "discard",
    seat: 0,
    tile: t("chun")[0],
    riichi: false,
  });
  expect(afterDealerDiscard.phase.type === "turn" && afterDealerDiscard.phase.actor).toBe(1);
  const drawn = afterDealerDiscard.players[1].drawnTile;
  expect(drawn).toEqual(t("5s")[0]);

  const afterTsumo = GameEngine.apply(afterDealerDiscard, { type: "tsumo", seat: 1 });

  expect(afterTsumo.phase.type).toBe("round_end");
  if (afterTsumo.phase.type !== "round_end" || afterTsumo.phase.result.type !== "win") {
    throw new Error("和了として確定していない");
  }
  expect(afterTsumo.phase.result.isDealerWin).toBe(false);
  expect(afterTsumo.phase.nextKyoku).toEqual({
    type: "continue",
    roundWind: "ton",
    kyokuNumber: 2,
    honba: 0,
    kyotaku: 0,
    dealerSeat: 1,
  });
});
