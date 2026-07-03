import { test, expect } from "vitest";

import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

test("ツモ→打牌で手番が下家(seat1)へ移る", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "nan", "sha", "pei"),
      t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "haku", "hatsu", "chun", "2m"),
      t("3m", "4m", "7m", "8m", "3p", "4p", "7p", "8p", "3s", "4s", "7s", "8s", "sha"),
      t("5m", "6m", "5p", "6p", "5s", "6s", "ton", "nan", "haku", "hatsu", "chun", "2p", "2s"),
    ],
  });

  const pei = t("pei")[0];
  const next = GameEngine.apply(state, { type: "discard", seat: 0, tile: pei, riichi: false });

  expect(next.phase.type).toBe("turn");
  expect(next.phase.type === "turn" && next.phase.actor).toBe(1);

  const view1 = GameEngine.viewFor(next, 1);
  expect(view1.drawnTile).not.toBeNull();
  expect(view1.players[0].river).toHaveLength(1);
});
