import { test, expect } from "vitest";

import { CpuAi } from "../index.ts";
import { buildView, river, t } from "./support.ts";

test("シャンテン数が進む打牌を優先する(孤立牌を切ってシャンテンを維持し、塔子を崩さない)", () => {
  // 1m2m3m/1p2p3p/9s9s(雀頭)/4p6p(嵌張) が確定ブロック、残り haku・hatsu が孤立牌。
  // haku を切れば1シャンテン維持、6p(嵌張の一部)を切ると2シャンテンに悪化する。
  const hand = t("1m", "2m", "3m", "1p", "2p", "3p", "9s", "9s", "4p", "6p", "chun", "hatsu", "haku");
  const drawnTile = t("haku")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    legalActions: [{ type: "discard", seat: 0, tiles: t("chun", "6p") }],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("chun")[0], riichi: false });
});

test("同じシャンテン数なら受け入れ枚数(残り枚数)が多い牌を残す打牌を選ぶ", () => {
  // 4s6s(嵌張、受け入れ5sのみ)と7p8p(両面、受け入れ6p/9p)のどちらを崩すか。
  // どちらを切っても1シャンテンのままだが、両面(7p8p)を残す方が受け入れ枚数が多いので
  // 嵌張側の4sを切る。
  const hand = t("1m", "2m", "3m", "1p", "2p", "3p", "9s", "9s", "4s", "6s", "7p", "8p", "9m");
  const drawnTile = t("9m")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    legalActions: [{ type: "discard", seat: 0, tiles: t("4s", "7p") }],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("4s")[0], riichi: false });
});

test("他家リーチ時は効率より現物を優先して切る", () => {
  const hand = t("1m", "2m", "3m", "1p", "2p", "3p", "9s", "9s", "4p", "6p", "chun", "hatsu", "haku");
  const drawnTile = t("haku")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    players: { 2: { riichi: "riichi", river: river("6p") } },
    legalActions: [{ type: "discard", seat: 0, tiles: t("chun", "6p") }],
  });

  // リーチが無ければ chun (効率優先) を切るはずだが、対面がリーチしており 6p が現物なのでそちらを切る。
  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("6p")[0], riichi: false });
});

test("他家リーチ時でも現物が無ければ通常通り効率で打牌する", () => {
  const hand = t("1m", "2m", "3m", "1p", "2p", "3p", "9s", "9s", "4p", "6p", "chun", "hatsu", "haku");
  const drawnTile = t("haku")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    // 対面のリーチ後の河には chun/6p のどちらも無い。
    players: { 2: { riichi: "riichi", river: river("sha") } },
    legalActions: [{ type: "discard", seat: 0, tiles: t("chun", "6p") }],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("chun")[0], riichi: false });
});

test("役牌のポンは鳴く(入門と同様)", () => {
  const view = buildView({
    seat: 0,
    hand: t("haku", "haku", "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "2s", "3s"),
    phase: "claims",
    players: { 2: { river: river("haku") } },
    legalActions: [{ type: "pon", seat: 0 }, { type: "pass", seat: 0 }],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "pon", seat: 0 });
});

test("役牌でなくても鳴くとタンヤオが確定しシャンテンが進むポンは行う", () => {
  const view = buildView({
    seat: 0,
    hand: t(
      "5m", "5m", "2p", "3p", "4p", "5p", "6p", "7p", "3s", "4s", "6s", "6s", "8s",
    ),
    phase: "claims",
    players: { 2: { river: river("5m") } },
    legalActions: [{ type: "pon", seat: 0 }, { type: "pass", seat: 0 }],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "pon", seat: 0 });
});

test("鳴いてもシャンテンが進まないなら役が確保できてもポンしない", () => {
  const view = buildView({
    seat: 0,
    hand: t(
      "5m", "5m", "2p", "3p", "4p", "5p", "6p", "7p", "3s", "4s", "5s", "6s", "7s",
    ),
    phase: "claims",
    players: { 2: { river: river("5m") } },
    legalActions: [{ type: "pon", seat: 0 }, { type: "pass", seat: 0 }],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "pass", seat: 0 });
});

test("役が確保できシャンテンが進むならチーも行う", () => {
  const view = buildView({
    seat: 1,
    hand: t(
      "4m", "6m", "2p", "3p", "4p", "5p", "6p", "7p", "3s", "4s", "6s", "6s", "8s",
    ),
    phase: "claims",
    players: { 0: { river: river("5m") } },
    legalActions: [
      { type: "chi", seat: 1, options: [[t("4m")[0], t("6m")[0]]] },
      { type: "pass", seat: 1 },
    ],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "chi", seat: 1, tiles: [t("4m")[0], t("6m")[0]] });
});

test("待ち枚数が2枚以上あるテンパイはリーチを宣言する", () => {
  // 4s5s の両面待ち(3s/6sの2種、残り枚数8)でテンパイ。
  const hand = t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "4s", "5s");
  const drawnTile = t("haku")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    legalActions: [
      { type: "riichi", seat: 0, tiles: t("haku") },
      { type: "discard", seat: 0, tiles: t("haku") },
    ],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("haku")[0], riichi: true });
});

test("愚形1枚待ちで打点も無ければリーチせずダマにする", () => {
  // ton暗刻+単騎5s待ちだが、5sは既に2枚(他家の河)見えており残り1枚しかない。ドラも無い。
  const hand = t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5s");
  const drawnTile = t("haku")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    players: { 1: { river: river("5s", "5s") } },
    legalActions: [
      { type: "riichi", seat: 0, tiles: t("haku") },
      { type: "discard", seat: 0, tiles: t("haku") },
    ],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("haku")[0], riichi: false });
});

test("愚形1枚待ちでもドラを持っていれば打点向上が見込めるためリーチする", () => {
  const hand = t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5s");
  const drawnTile = t("haku")[0];
  const view = buildView({
    seat: 0,
    hand,
    drawnTile,
    // ドラ表示牌が4sなのでドラは5s。手牌に残る5s(待ち牌自身)がドラになる。
    doraIndicators: t("4s"),
    players: { 1: { river: river("5s", "5s") } },
    legalActions: [
      { type: "riichi", seat: 0, tiles: t("haku") },
      { type: "discard", seat: 0, tiles: t("haku") },
    ],
  });

  const action = CpuAi.decide(view, "standard", () => 0.5);
  expect(action).toEqual({ type: "discard", seat: 0, tile: t("haku")[0], riichi: true });
});
