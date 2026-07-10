import { test, expect } from "vitest";

import { GameEngine } from "../index.ts";
import { createTestMatch, defaultConfig, t } from "./support.ts";

const createAtozukeState = (atozuke: boolean) => {
  const base = createTestMatch({
    config: defaultConfig({ atozuke }),
    dealerSeat: 0,
    hands: [
      t("haku", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "hatsu", "chun"),
      [],
      [],
      [],
    ],
  });
  return {
    ...base,
    players: base.players.map((player, seat) =>
      seat === 1
        ? {
            ...player,
            hand: t("haku", "haku", "2p", "3p", "4p", "5p", "6p", "7p", "2s", "2s"),
            melds: [{ type: "chi" as const, tiles: t("1m", "2m", "3m") }],
          }
        : player,
    ) as unknown as typeof base.players,
  };
};

test("後付けありでは副露手がロン牌だけで役牌を完成して和了できる", () => {
  const state = createAtozukeState(true);
  const claims = GameEngine.apply(state, {
    type: "discard",
    seat: 0,
    tile: t("haku")[0],
    riichi: false,
  });

  expect(GameEngine.legalActions(claims)).toContainEqual({ type: "ron", seat: 1 });
});

test("後付けなしでは副露手がロン牌だけで役牌を完成する和了を認めない", () => {
  const state = createAtozukeState(false);
  const afterDiscard = GameEngine.apply(state, {
    type: "discard",
    seat: 0,
    tile: t("haku")[0],
    riichi: false,
  });

  expect(GameEngine.legalActions(afterDiscard).some((action) => action.type === "ron" && action.seat === 1)).toBe(false);
});
