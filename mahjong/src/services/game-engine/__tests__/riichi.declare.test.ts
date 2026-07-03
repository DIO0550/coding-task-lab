import { test, expect } from "vitest";

import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

test("リーチ宣言で供託+1・持ち点-1000になり、リーチ後の打牌はツモ切りのみが合法手になる", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "nan", "nan"),
      t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "haku", "hatsu", "chun", "2m"),
      t("3m", "4m", "7m", "8m", "3p", "4p", "7p", "8p", "3s", "4s", "7s", "8s", "sha"),
      t("5m", "6m", "5p", "6p", "5s", "6s", "haku", "hatsu", "chun", "2p", "2s", "pei", "3p"),
    ],
    draws: t("9m"),
  });

  const drawnTile = t("9m")[0];
  const legalBefore = GameEngine.legalActions(state).filter((a) => a.seat === 0);
  const riichiOption = legalBefore.find((a) => a.type === "riichi");
  expect(riichiOption).toBeDefined();

  const afterRiichi = GameEngine.apply(state, { type: "discard", seat: 0, tile: drawnTile, riichi: true });

  expect(afterRiichi.kyotaku).toBe(1);
  expect(afterRiichi.players[0].score).toBe(24000);
  expect(afterRiichi.players[0].riichi).not.toBe("none");
  expect(afterRiichi.players[0].river).toHaveLength(1);
  expect(afterRiichi.players[0].river[0]?.riichiDeclare).toBe(true);

  // 手番が一周してdealerに戻ってくるまでツモ切りのみが合法な打牌候補になることを確認する。
  let cursor = afterRiichi;
  for (let i = 0; i < 3; i += 1) {
    expect(cursor.phase.type).toBe("turn");
    if (cursor.phase.type !== "turn") {
      throw new Error("unreachable");
    }
    const actor = cursor.phase.actor;
    const view = GameEngine.viewFor(cursor, actor);
    const discardAction = view.legalActions.find((a) => a.type === "discard");
    if (discardAction === undefined || discardAction.type !== "discard") {
      throw new Error("打牌の合法手が無い");
    }
    const tile = discardAction.tiles[0];
    if (tile === undefined) {
      throw new Error("打牌候補が空");
    }
    cursor = GameEngine.apply(cursor, { type: "discard", seat: actor, tile, riichi: false });
    if (cursor.phase.type === "claims") {
      // 誰も応答せず全員パスして手番を進める
      const claimsPhase = cursor.phase;
      for (const seat of claimsPhase.eligible) {
        cursor = GameEngine.apply(cursor, { type: "pass", seat });
      }
    }
  }

  expect(cursor.phase.type).toBe("turn");
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(0);
  const dealerView = GameEngine.viewFor(cursor, 0);
  const dealerDiscard = dealerView.legalActions.find((a) => a.type === "discard");
  expect(dealerDiscard?.type).toBe("discard");
  if (dealerDiscard?.type === "discard") {
    expect(dealerDiscard.tiles).toHaveLength(1);
    expect(dealerDiscard.tiles[0]).toEqual(dealerView.drawnTile);
  }
  expect(dealerView.legalActions.find((a) => a.type === "riichi")).toBeUndefined();
});
