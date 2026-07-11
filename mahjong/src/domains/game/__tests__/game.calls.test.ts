import { test, expect } from "vitest";

import { Game } from "../index.ts";
import {
  JUNK_A,
  JUNK_B,
  JUNK_C,
  n,
  startWithOrder,
  t,
  tsumogiriTimes,
} from "./helpers.ts";

/** JUNK_A の複製から 5p を除いた捨て牌用の手(5p を使うテストと同居できる) */
const JUNK_D = ["1m", "4m", "7m", "2p", "9p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];

test("ポン: 打牌に対して手中2枚でポンでき手番が鳴いた席へ移る", () => {
  const seat2 = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "5p", "5p", "chun"];
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, seat2, JUNK_D],
    draws: ["5p"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });
  expect(responding.phase).toBe("response");
  expect(responding.pendingResponders).toEqual([2]);

  const after = Game.apply(responding, 2, {
    type: "pon",
    tiles: [t("5p"), t("5p")],
  });

  expect(after.phase).toBe("action");
  expect(after.turn).toBe(2);
  expect(after.players[2].drawn).toBeNull();
  expect(after.players[2].hand).toHaveLength(11);
  expect(after.players[2].melds).toHaveLength(1);
  expect(after.players[2].melds[0].meld.type).toBe("pon");
  expect(after.players[2].melds[0].calledFrom).toBe(0);
  expect(n(after.players[2].melds[0].calledTile!)).toBe("5p");
  expect(after.players[0].discards.at(-1)?.calledBy).toBe(2);
});

test("チー: 下家は打牌と手中2枚で順子を作れる", () => {
  const seat1 = ["2m", "5m", "8m", "3p", "4p", "9p", "1s", "4s", "7s", "haku", "hatsu", "chun", "ton"];
  const state = startWithOrder({
    hands: [JUNK_A, seat1, JUNK_C, JUNK_D],
    draws: ["5p"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });
  expect(responding.pendingResponders).toEqual([1]);
  const chi = Game.legalActions(responding, 1).find(
    (action) => action.type === "chi",
  );
  expect(chi).toBeDefined();

  const after = Game.apply(responding, 1, chi!);

  expect(after.turn).toBe(1);
  expect(after.players[1].melds[0].meld.type).toBe("chi");
  expect(after.players[1].melds[0].meld.tiles.map(n)).toEqual(["3p", "4p", "5p"]);
  expect(after.players[1].melds[0].calledFrom).toBe(0);
});

test("チーは下家以外には許されない", () => {
  const seat3 = ["1m", "4m", "7m", "3p", "4p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, JUNK_C, seat3],
    draws: ["5p"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });

  // seat3(対面でも上家でもなく打牌者の対面)は宣言できず、応答フェーズ自体が開かれない
  expect(responding.phase).toBe("action");
  expect(responding.turn).toBe(1);
  expect(Game.legalActions(responding, 3)).toEqual([]);
});

test("明カン: 打牌に対して手中3枚でカンでき嶺上ツモと新ドラ公開が起きる", () => {
  const seat2 = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "5p", "5p", "5p"];
  const state = startWithOrder({
    hands: [JUNK_D, JUNK_B, seat2, JUNK_C],
    draws: ["5p"],
    rinshan: ["1m"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });
  const after = Game.apply(responding, 2, {
    type: "kan",
    tile: t("5p"),
    kind: "minkan",
  });

  expect(after.turn).toBe(2);
  expect(after.phase).toBe("action");
  expect(after.players[2].melds[0].meld.type).toBe("kan");
  expect(after.players[2].melds[0].meld.tiles).toHaveLength(4);
  expect(after.players[2].melds[0].calledFrom).toBe(0);
  expect(n(after.players[2].drawn!)).toBe("1m");
  expect(after.wall.doraIndicators).toHaveLength(2);
  expect(Game.viewFor(after, 2).wallRemaining).toBe(68);
});

test("暗槓: 手中4枚でカンでき面前扱いのまま嶺上ツモする", () => {
  const dealer = ["1m", "4m", "7m", "2p", "5p", "8p", "3s", "6s", "9s", "haku", "haku", "haku", "pei"];
  const seat1 = ["2m", "5m", "8m", "3p", "6p", "9p", "1s", "4s", "7s", "pei", "hatsu", "chun", "ton"];
  const seat2 = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "sha", "hatsu", "chun"];
  const state = startWithOrder({
    hands: [dealer, seat1, seat2, JUNK_D],
    draws: ["haku"],
    rinshan: ["9p"],
  });

  const kan = Game.legalActions(state, 0).find(
    (action) => action.type === "kan",
  );
  expect(kan).toMatchObject({ kind: "ankan" });

  const after = Game.apply(state, 0, kan!);

  expect(after.turn).toBe(0);
  expect(after.players[0].melds[0].meld.type).toBe("ankan");
  expect(after.players[0].melds[0].calledFrom).toBeNull();
  expect(after.players[0].hand).toHaveLength(10);
  expect(n(after.players[0].drawn!)).toBe("9p");
  expect(after.wall.doraIndicators).toHaveLength(2);
});

test("加槓: ポンした面子に4枚目を足してカンにできる", () => {
  const dealer = ["1m", "4m", "7m", "2p", "9p", "8p", "3s", "6s", "9s", "ton", "nan", "sha", "pei"];
  const seat2 = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "5p", "5p", "chun"];
  const state = startWithOrder({
    hands: [dealer, JUNK_B, seat2, JUNK_D],
    draws: ["5p", "1s", "2s", "3p", "5p"],
    rinshan: ["6m"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });
  const ponned = Game.apply(responding, 2, {
    type: "pon",
    tiles: [t("5p"), t("5p")],
  });
  const discarded = Game.apply(ponned, 2, { type: "discard", tile: t("nan") });
  // 下家(3)→(0)→(1)がツモ切りし、seat2 が4枚目の5pをツモる
  const drawnAgain = tsumogiriTimes(discarded, 3);
  expect(drawnAgain.turn).toBe(2);
  expect(n(drawnAgain.players[2].drawn!)).toBe("5p");

  const kan = Game.legalActions(drawnAgain, 2).find(
    (action) => action.type === "kan",
  );
  expect(kan).toMatchObject({ kind: "kakan" });

  const after = Game.apply(drawnAgain, 2, kan!);

  expect(after.players[2].melds[0].meld.type).toBe("kan");
  expect(after.players[2].melds[0].meld.tiles).toHaveLength(4);
  expect(n(after.players[2].drawn!)).toBe("6m");
  expect(after.wall.doraIndicators).toHaveLength(2);
});

test("鳴きが入ると全員の一発とダブルリーチ資格が消える", () => {
  const seat2 = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "5p", "5p", "chun"];
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, seat2, JUNK_D],
    draws: ["5p", "1s"],
  });

  const responding = Game.apply(state, 0, { type: "discard", tile: t("5p") });
  const after = Game.apply(responding, 2, {
    type: "pon",
    tiles: [t("5p"), t("5p")],
  });

  for (const player of after.players) {
    expect(player.ippatsu).toBe(false);
    expect(player.doubleRiichiEligible).toBe(false);
  }
});

test("山が残っていない打牌には鳴きできずロン以外は宣言できない", () => {
  const seat2 = ["3m", "6m", "9m", "1p", "4p", "7p", "2s", "5s", "8s", "nan", "5p", "5p", "chun"];
  const state = startWithOrder({
    hands: [JUNK_A, JUNK_B, seat2, JUNK_D],
  });
  // 山を空にした状態で最後の打牌(河底)として5pを切らせる
  const drained = {
    ...state,
    wall: { ...state.wall, drawPile: [] as const },
    players: state.players.map((player) =>
      player.seat === 0 ? { ...player, drawn: t("5p") } : player,
    ),
  };

  const after = Game.apply(drained, 0, { type: "discard", tile: t("5p") });

  // seat2 はポンできず、宣言者がいないため荒牌流局へ進む
  expect(after.phase).toBe("result_draw");
});
