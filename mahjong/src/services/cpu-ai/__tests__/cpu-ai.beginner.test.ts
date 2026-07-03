import { test, expect } from "vitest";

import { CpuAi } from "../index.ts";
import { buildView, river, t } from "./support.ts";

test("シャンテン数が同じ打牌候補の中では孤立字牌を最優先で切る", () => {
  // 123m/456p/999s(暗刻)/78s(両面) が確定ブロック、残り孤立牌が haku(字牌)・1s(老頭牌)・6m(中張牌)。
  // どれを切っても1シャンテンのまま(同シャンテン)なので、孤立字牌である haku を切る。
  const hand = t("1m", "2m", "3m", "4p", "5p", "6p", "9s", "9s", "7s", "8s", "1s", "haku", "6m");
  const drawnTile = t("9s")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    legalActions: [{ type: "discard", seat: 0, tiles: t("haku", "1s", "6m") }],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("haku")[0], riichi: false });
});

test("孤立字牌が無ければ孤立老頭牌(1・9)を孤立中張牌より優先して切る", () => {
  const hand = t("1m", "2m", "3m", "4p", "5p", "6p", "9s", "9s", "7s", "8s", "1s", "haku", "6m");
  const drawnTile = t("9s")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    legalActions: [{ type: "discard", seat: 0, tiles: t("1s", "6m") }],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("1s")[0], riichi: false });
});

test("シャンテン数を悪化させる牌は孤立牌であっても切らない", () => {
  // chun を切ればテンパイ(シャンポン待ち)を維持できるが、ton/nan を切ると崩れる。
  // 字牌の優先度だけで見れば ton/nan (対子・非孤立) より孤立字牌の chun を切りたくなるが、
  // シャンテン数を悪化させないことが最優先されるべきなので、結局 chun を切る。
  const hand = t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "nan", "nan");
  const drawnTile = t("chun")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    legalActions: [{ type: "discard", seat: 0, tiles: t("nan", "ton", "chun") }],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("chun")[0], riichi: false });
});

test("役牌(三元牌)のポンが可能なら鳴く", () => {
  const view = buildView({
    seat: 0,
    hand: t("haku", "haku", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "2s", "3s"),
    phase: "claims",
    players: { 2: { river: river("haku") } },
    legalActions: [{ type: "pon", seat: 0 }, { type: "pass", seat: 0 }],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action).toEqual({ type: "pon", seat: 0 });
});

test("自風・場風のポンが可能なら鳴く", () => {
  // dealerSeat=0, 自席=1 なので自風は "nan"。
  const view = buildView({
    seat: 1,
    dealerSeat: 0,
    hand: t("nan", "nan", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "2s", "3s"),
    phase: "claims",
    players: { 2: { river: river("nan") } },
    legalActions: [{ type: "pon", seat: 1 }, { type: "pass", seat: 1 }],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action).toEqual({ type: "pon", seat: 1 });
});

test("役牌でないポンは鳴かずにパスする", () => {
  const view = buildView({
    seat: 0,
    hand: t("5m", "5m", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "2s", "3s"),
    phase: "claims",
    players: { 2: { river: river("5m") } },
    legalActions: [{ type: "pon", seat: 0 }, { type: "pass", seat: 0 }],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action).toEqual({ type: "pass", seat: 0 });
});

test("チーは合法手にあっても行わない", () => {
  const view = buildView({
    seat: 1,
    hand: t("4m", "6m", "1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s", "2s", "3s"),
    phase: "claims",
    players: { 0: { river: river("5m") } },
    legalActions: [{ type: "chi", seat: 1, options: [[t("4m")[0], t("6m")[0]]] }, { type: "pass", seat: 1 }],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.5);
  expect(action).toEqual({ type: "pass", seat: 1 });
});

test("テンパイしたら待ちの良し悪しに関わらず常にリーチを宣言する", () => {
  // 1s単騎(愚形1枚待ち)のテンパイでも、入門は必ずリーチする。
  const hand = t("2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "1s");
  const drawnTile = t("nan")[0];
  const view = buildView({
    seat: 1,
    hand,
    drawnTile,
    legalActions: [
      { type: "riichi", seat: 1, tiles: t("nan") },
      { type: "discard", seat: 1, tiles: t("nan") },
    ],
  });

  const action = CpuAi.decide(view, "beginner", () => 0.1);
  expect(action).toEqual({ type: "discard", seat: 1, tile: t("nan")[0], riichi: true });
});
