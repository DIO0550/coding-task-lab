import { test, expect } from "vitest";

import { LIVE_WALL_SIZE } from "../../../domains/game/index.ts";
import { GameEngine } from "../index.ts";
import { createTestMatch, t } from "./support.ts";

const withHakuPon = (riichiSeatOne = false) => {
  const base = createTestMatch({
    dealerSeat: 2,
    hands: [[], [], [], []],
    draws: t("haku"),
  });
  return {
    ...base,
    players: base.players.map((player, seat) => {
      if (seat === 1 && riichiSeatOne) {
        return {
          ...player,
          hand: t("2m", "3m", "4m", "5p", "6p", "7p", "2s", "3s", "4s", "6s", "7s", "8s", "haku"),
          riichi: "riichi" as const,
        };
      }
      if (seat !== 2) {
        return player;
      }
      return {
        ...player,
        hand: t("1m", "2m", "4m", "5m", "7m", "8m", "1p", "4p", "7p", "1s", "ton"),
        melds: [{ type: "pon" as const, tiles: t("haku", "haku", "haku") }],
        drawnTile: t("haku")[0],
      };
    }) as unknown as typeof base.players,
    phase: { type: "turn" as const, actor: 2 as const, drawSource: "wall" as const },
  };
};

test("槍槓できる他家がいない加槓は停止せず即成立して嶺上ツモへ進む", () => {
  const state = withHakuPon();
  const after = GameEngine.apply(state, { type: "kan", seat: 2, tile: t("haku")[0] });

  expect(after.phase).toMatchObject({ type: "turn", actor: 2, drawSource: "rinshan" });
  expect(after.kanCount).toBe(1);
  expect(after.players[2].melds[0]?.type).toBe("kan");
  expect(GameEngine.viewFor(after, 2).doraIndicators).toHaveLength(2);
});

test("リーチ後の席にはロンとパス以外のチー・ポン・大明槓を提示しない", () => {
  const base = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("5m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu"),
      t("5m", "5m", "4m", "6m", "1p", "2p", "4p", "7p", "8p", "2s", "3s", "6s", "9s"),
      [],
      [],
    ],
  });
  const state = {
    ...base,
    players: base.players.map((player, seat) =>
      seat === 1 ? { ...player, riichi: "riichi" as const } : player,
    ) as unknown as typeof base.players,
  };

  const afterDiscard = GameEngine.apply(state, {
    type: "discard",
    seat: 0,
    tile: t("5m")[0],
    riichi: false,
  });
  const actions = GameEngine.legalActions(afterDiscard).filter((action) => action.seat === 1);

  expect(actions.some((action) => ["chi", "pon", "kan"].includes(action.type))).toBe(false);
});

test("河底牌ではロン以外の鳴きを提示せず、ロンがなければ荒牌流局になる", () => {
  const base = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("5m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu"),
      t("5m", "5m", "4m", "6m", "1p", "2p", "4p", "7p", "8p", "2s", "3s", "6s", "9s"),
      [],
      [],
    ],
  });
  const state = { ...base, drawIndex: LIVE_WALL_SIZE };

  const after = GameEngine.apply(state, {
    type: "discard",
    seat: 0,
    tile: t("5m")[0],
    riichi: false,
  });

  expect(after.phase.type).toBe("round_end");
  expect(after.phase.type === "round_end" && after.phase.result.type).toBe("ryuukyoku");
});

test("親の第一打リーチはダブルリーチになる", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "nan", "nan"),
      [],
      [],
      [],
    ],
    draws: t("9m"),
  });

  const after = GameEngine.apply(state, {
    type: "discard",
    seat: 0,
    tile: t("9m")[0],
    riichi: true,
  });

  expect(after.players[0].riichi).toBe("double");
});

test("親の配牌直後の第一ツモ和了は天和になる", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"),
      [],
      [],
      [],
    ],
    draws: t("5m"),
  });

  const after = GameEngine.apply(state, { type: "tsumo", seat: 0 });
  expect(after.phase.type).toBe("round_end");
  if (after.phase.type !== "round_end" || after.phase.result.type !== "win") {
    throw new Error("天和が成立していない");
  }
  expect(after.phase.result.yaku).toContainEqual({ name: "tenhou", han: 13 });
});

test("第一巡の暗槓は第一巡役を中断したことを状態に記録する", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("haku", "haku", "haku", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei"),
      [],
      [],
      [],
    ],
    draws: t("haku"),
  });

  const after = GameEngine.apply(state, { type: "kan", seat: 0, tile: t("haku")[0] });
  expect(after.anyCallHappened).toBe(true);
});

test("槍槓ロンを見逃した非リーチ者には一時フリテンを課して加槓を成立させる", () => {
  const state = withHakuPon();
  const winningHand = t("2m", "3m", "4m", "5p", "6p", "7p", "2s", "3s", "4s", "6s", "7s", "8s", "haku");
  const canChankan = {
    ...state,
    players: state.players.map((player, seat) =>
      seat === 1 ? { ...player, hand: winningHand } : player,
    ) as unknown as typeof state.players,
  };

  const claims = GameEngine.apply(canChankan, { type: "kan", seat: 2, tile: t("haku")[0] });
  expect(claims.phase.type).toBe("claims");
  const afterPass = GameEngine.apply(claims, { type: "pass", seat: 1 });

  expect(afterPass.players[1].temporaryFuriten).toBe(true);
  expect(afterPass.phase).toMatchObject({ type: "turn", actor: 2, drawSource: "rinshan" });
});

test("CPU向けGameViewは現在の鳴き対象とルールを公開し、牌山・他家手牌は公開しない", () => {
  const state = createTestMatch({
    dealerSeat: 0,
    hands: [
      t("5m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu"),
      t("5m", "5m", "4m", "6m", "1p", "2p", "4p", "7p", "8p", "2s", "3s", "6s", "9s"),
      [],
      [],
    ],
  });
  const claims = GameEngine.apply(state, {
    type: "discard",
    seat: 0,
    tile: t("5m")[0],
    riichi: false,
  });
  const view = GameEngine.viewFor(claims, 1);

  expect(view.claimTarget).toMatchObject({ kind: "discard", sourceSeat: 0, tile: t("5m")[0] });
  expect(view.rules).toEqual(state.config.rules);
  expect("wall" in view).toBe(false);
  expect("hand" in view.players[0]).toBe(false);
});
