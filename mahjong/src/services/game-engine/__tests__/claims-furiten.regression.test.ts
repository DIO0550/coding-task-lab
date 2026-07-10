import { expect, test } from "vitest";

import type { MatchState } from "../../../domains/game/index.ts";
import type { Tile } from "../../../domains/tile/index.ts";
import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

const sourceHand = t(
  "haku",
  "4m", "4m",
  "5m", "5m",
  "6m", "6m",
  "7m", "7m",
  "8m", "8m",
  "9m", "9m",
);

const inertHandTwo = t(
  "1p", "1p",
  "2p", "2p",
  "3p", "3p",
  "7p", "7p",
  "8p", "8p",
  "9p", "9p",
  "pei",
);

const inertHandThree = t(
  "1s", "1s",
  "2s", "2s",
  "3s", "3s",
  "4s", "4s",
  "5s", "5s",
  "6s", "6s",
  "sha",
);

const createHakuClaimState = (callerHand: readonly Tile[], temporaryFuriten = false): MatchState => {
  const base = createTestMatch({
    dealerSeat: 0,
    hands: [sourceHand, callerHand, inertHandTwo, inertHandThree],
    draws: t("9p"),
  });
  return {
    ...base,
    players: base.players.map((player, seat) =>
      seat === 1 ? { ...player, temporaryFuriten } : player,
    ) as unknown as MatchState["players"],
  };
};

const discardHaku = (state: MatchState): MatchState =>
  GameEngine.apply(state, {
    type: "discard",
    seat: 0,
    tile: t("haku")[0],
    riichi: false,
  });

test("ロン可能牌をポンした席には次の自摸まで一時フリテンを課す", () => {
  const callerHand = t(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "ton", "ton",
    "haku", "haku",
  );
  const claims = discardHaku(createHakuClaimState(callerHand));
  const actionTypes = GameEngine.legalActions(claims)
    .filter((action) => action.seat === 1)
    .map((action) => action.type);

  expect(actionTypes).toEqual(expect.arrayContaining(["ron", "pon", "pass"]));

  const afterPon = GameEngine.apply(claims, { type: "pon", seat: 1 });
  expect(afterPon.phase).toMatchObject({ type: "turn", actor: 1 });
  expect(afterPon.players[1].temporaryFuriten).toBe(true);
});

test("一時フリテン中の大明槓は嶺上自摸時点で一時フリテンを解除する", () => {
  const callerHand = t(
    "haku", "haku", "haku",
    "1m", "2m", "4m", "5m", "7m", "8m",
    "1p", "4p", "7p",
    "1s",
  );
  const claims = discardHaku(createHakuClaimState(callerHand, true));

  expect(GameEngine.legalActions(claims)).toContainEqual({ type: "kan", seat: 1, tiles: t("haku") });

  const afterKan = GameEngine.apply(claims, { type: "kan", seat: 1, tile: t("haku")[0] });
  expect(afterKan.phase).toMatchObject({ type: "turn", actor: 1, drawSource: "rinshan" });
  expect(afterKan.players[1].drawnTile).not.toBeNull();
  expect(afterKan.players[1].temporaryFuriten).toBe(false);
});
