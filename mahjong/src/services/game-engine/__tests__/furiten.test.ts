import { test, expect } from "vitest";

import type { MatchState } from "../../../domains/game/index.ts";
import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

/** claimsフェーズに入っていたら、対象席全員パスして手番を進める(このテストでは誰も鳴かない想定)。 */
const passThroughClaimsIfAny = (state: MatchState): MatchState => {
  if (state.phase.type !== "claims") {
    return state;
  }
  return state.phase.eligible.reduce(
    (acc, seat) => GameEngine.apply(acc, { type: "pass", seat }),
    state,
  );
};

test("自河に待ち牌がある(かつて見逃した)ときはロンの合法手が出ない", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("1m", "9m", "2m", "8m", "1p", "9p", "2p", "8p", "ton", "nan", "sha", "pei", "haku"),
      t("3m", "7m", "4m", "6m", "3p", "7p", "4p", "6p", "ton", "nan", "sha", "7s", "9s"),
      t("5m", "1p", "9p", "2p", "8p", "3p", "7p", "4p", "6p", "pei", "haku", "hatsu", "chun"),
      t("2m", "3m", "4m", "4p", "4p", "5p", "6p", "7p", "2s", "3s", "4s", "6s", "7s"),
    ],
    draws: t("ton", "nan", "sha", "5s", "8s"),
  });

  // turn0: dealer(seat0) はツモった "ton" をそのまま切る
  let cursor = GameEngine.apply(state, { type: "discard", seat: 0, tile: t("ton")[0], riichi: false });
  cursor = passThroughClaimsIfAny(cursor);
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(1);

  // turn1: seat1 はツモった "nan" をそのまま切る
  cursor = GameEngine.apply(cursor, { type: "discard", seat: 1, tile: t("nan")[0], riichi: false });
  cursor = passThroughClaimsIfAny(cursor);
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(2);

  // turn2: seat2 はツモった "sha" をそのまま切る
  cursor = GameEngine.apply(cursor, { type: "discard", seat: 2, tile: t("sha")[0], riichi: false });
  cursor = passThroughClaimsIfAny(cursor);
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(3);

  // turn3: seat3 は待ち牌 "5s" をツモるが、ツモ和了せずそのまま見逃して切る(自河フリテンの原因を作る)
  const seat3View = GameEngine.viewFor(cursor, 3);
  expect(seat3View.legalActions.find((a) => a.type === "tsumo")).toBeDefined();
  cursor = GameEngine.apply(cursor, { type: "discard", seat: 3, tile: t("5s")[0], riichi: false });

  // 5s は誰も鳴けないのでそのままdealer(seat0)の手番へ進む
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(0);

  // turn4: dealer(seat0) が seat3 のもう一方の待ち牌 "8s" をツモって切る
  cursor = GameEngine.apply(cursor, { type: "discard", seat: 0, tile: t("8s")[0], riichi: false });

  const legalOnEightS = GameEngine.legalActions(cursor);
  expect(legalOnEightS.some((a) => a.seat === 3 && a.type === "ron")).toBe(false);
  expect(legalOnEightS.some((a) => a.seat === 3)).toBe(false);
});

test("自河に待ち牌があってもツモの合法手は出る", () => {
  const state = createTestMatch({
    dealerSeat: 3,
    hands: [
      t("1m", "9m", "2m", "8m", "1p", "9p", "2p", "8p", "ton", "nan", "sha", "pei", "haku"),
      t("3m", "7m", "4m", "6m", "3p", "7p", "4p", "6p", "hatsu", "chun", "ton", "nan", "sha"),
      t("5m", "1p", "9p", "2p", "8p", "3p", "7p", "4p", "6p", "pei", "haku", "hatsu", "chun"),
      t("2m", "3m", "4m", "4p", "4p", "5p", "6p", "7p", "2s", "3s", "4s", "6s", "7s"),
    ],
    draws: t("5s", "ton", "nan", "sha", "8s"),
  });

  // turn0: 親(seat3)は待ち牌 "5s" をツモるが見逃して切る
  const seat3ViewBefore = GameEngine.viewFor(state, 3);
  expect(seat3ViewBefore.legalActions.find((a) => a.type === "tsumo")).toBeDefined();
  let cursor = GameEngine.apply(state, { type: "discard", seat: 3, tile: t("5s")[0], riichi: false });
  cursor = passThroughClaimsIfAny(cursor);
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(0);

  cursor = GameEngine.apply(cursor, { type: "discard", seat: 0, tile: t("ton")[0], riichi: false });
  cursor = passThroughClaimsIfAny(cursor);
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(1);

  cursor = GameEngine.apply(cursor, { type: "discard", seat: 1, tile: t("nan")[0], riichi: false });
  cursor = passThroughClaimsIfAny(cursor);
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(2);

  cursor = GameEngine.apply(cursor, { type: "discard", seat: 2, tile: t("sha")[0], riichi: false });
  cursor = passThroughClaimsIfAny(cursor);
  expect(cursor.phase.type === "turn" && cursor.phase.actor).toBe(3);

  // turn4: 親(seat3)がもう一方の待ち牌 "8s" を自分でツモる。フリテンでもツモ和了は合法。
  const seat3ViewAfter = GameEngine.viewFor(cursor, 3);
  expect(seat3ViewAfter.drawnTile).toEqual(t("8s")[0]);
  expect(seat3ViewAfter.legalActions.find((a) => a.type === "tsumo")).toBeDefined();
  expect(seat3ViewAfter.legalActions.find((a) => a.type === "ron")).toBeUndefined();
});
