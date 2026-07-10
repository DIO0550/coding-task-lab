import { test, expect } from "vitest";

import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

test("同一の打牌にポンとチーが両方宣言されたらポンが成立する", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("5m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "2m"),
      t("4m", "6m", "1p", "2p", "3p", "7p", "8p", "9p", "1s", "2s", "3s", "7s", "8s"),
      t("5m", "5m", "1p", "2p", "4p", "7p", "8p", "2s", "3s", "5s", "6s", "haku", "hatsu"),
      t("1m", "9m", "2m", "8m", "3m", "7m", "ton", "nan", "sha", "pei", "2p", "3p", "4s"),
    ],
  });

  const fiveM = t("5m")[0];
  const afterDiscard = GameEngine.apply(state, { type: "discard", seat: 0, tile: fiveM, riichi: false });
  expect(afterDiscard.phase.type).toBe("claims");

  const afterChi = GameEngine.apply(afterDiscard, {
    type: "chi",
    seat: 1,
    tiles: [t("4m")[0], t("6m")[0]],
  });
  const afterPon = GameEngine.apply(afterChi, { type: "pon", seat: 2 });

  expect(afterPon.phase.type).toBe("turn");
  expect(afterPon.phase.type === "turn" && afterPon.phase.actor).toBe(2);
  expect(afterPon.players[2].melds).toHaveLength(1);
  expect(afterPon.players[2].melds[0]?.type).toBe("pon");
  expect(afterPon.players[1].melds).toHaveLength(0);
});

test("ロン宣言があればポン宣言より優先してロンが成立する", () => {
  // seat3 の手牌は 5m が来ると 456m 234p 567p 234s 66s の形(タンヤオ)で和了できる。
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("5m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "2m"),
      t("4m", "6m", "1p", "2p", "3p", "7p", "8p", "9p", "1s", "2s", "3s", "7s", "8s"),
      t("5m", "5m", "1p", "2p", "4p", "7p", "8p", "2s", "3s", "5s", "6s", "haku", "hatsu"),
      t("4m", "6m", "2p", "3p", "4p", "5p", "6p", "7p", "2s", "3s", "4s", "6s", "6s"),
    ],
  });

  const fiveM = t("5m")[0];
  const afterDiscard = GameEngine.apply(state, { type: "discard", seat: 0, tile: fiveM, riichi: false });
  expect(afterDiscard.phase.type).toBe("claims");
  expect(afterDiscard.phase.type === "claims" && afterDiscard.phase.eligible).toContain(3);

  const afterPass1 = GameEngine.apply(afterDiscard, { type: "pass", seat: 1 });
  const afterPon = GameEngine.apply(afterPass1, { type: "pon", seat: 2 });
  const afterRon = GameEngine.apply(afterPon, { type: "ron", seat: 3 });

  expect(afterRon.phase.type).toBe("round_end");
  expect(
    afterRon.phase.type === "round_end" && afterRon.phase.result.type === "win" && afterRon.phase.result.winner,
  ).toBe(3);
});
