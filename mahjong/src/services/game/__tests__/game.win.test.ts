import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";
import { Game } from "../index";
import { discardEntry, junkHand, seededRng, setupState } from "./helpers";

const rng = seededRng(400);

/**
 * 234m 567m 345p 66p + 4s6s: 5s カンチャン待ち。
 * ロン: タンヤオのみ 1翻40符 = 1300 / ツモ: 門前清自摸和+タンヤオ 2翻30符 = 500/1000
 */
const tanyaoHand: readonly Tile[] = [
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "3p",
  "4p",
  "5p",
  "6p",
  "6p",
  "4s",
  "6s",
];

test("子のロン和了で放銃者から計算どおりの点数が移動する", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5s" },
      { hand: junkHand },
      { hand: tanyaoHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5s", riichi: false },
    rng,
  );
  const resolved = Game.apply(claims, { type: "ron", player: 2 }, rng);
  expect(resolved.phase.type).toBe("roundEnd");
  if (resolved.phase.type !== "roundEnd" || resolved.phase.result.type !== "win") {
    throw new Error("和了になっていない");
  }
  const result = resolved.phase.result;
  expect(result.yaku).toStrictEqual([{ name: "tanyao", han: 1 }]);
  expect(result.han).toBe(1);
  expect(result.fu).toBe(40);
  expect(result.scoreTotal).toBe(1300);
  expect(result.pointDeltas).toStrictEqual([-1300, 0, 1300, 0]);
  expect(result.dealerKeeps).toBe(false);
  expect(result.uraDora).toStrictEqual([]);
});

test("子のツモ和了は親が倍額を支払う内訳で点数が移動する", () => {
  const state = setupState({
    players: [
      { hand: junkHand },
      { hand: tanyaoHand, drawn: "5s", discards: [discardEntry("1s")] },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 1 },
  });
  const resolved = Game.apply(state, { type: "tsumo", player: 1 }, rng);
  expect(resolved.phase.type).toBe("roundEnd");
  if (resolved.phase.type !== "roundEnd" || resolved.phase.result.type !== "win") {
    throw new Error("和了になっていない");
  }
  const result = resolved.phase.result;
  expect(result.winType).toBe("tsumo");
  expect(result.han).toBe(2);
  expect(result.fu).toBe(30);
  // 30符2翻の子ツモ: 親1000 + 子500×2 = 2000
  expect(result.scoreTotal).toBe(2000);
  expect(result.pointDeltas).toStrictEqual([-1000, 2000, -500, -500]);
});

test("親のツモ和了は全員が同額を支払う", () => {
  const state = setupState({
    players: [
      { hand: tanyaoHand, drawn: "5s", discards: [discardEntry("1s")] },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const resolved = Game.apply(state, { type: "tsumo", player: 0 }, rng);
  if (resolved.phase.type !== "roundEnd" || resolved.phase.result.type !== "win") {
    throw new Error("和了になっていない");
  }
  const result = resolved.phase.result;
  // 30符2翻の親ツモ: 1000オール
  expect(result.scoreTotal).toBe(3000);
  expect(result.pointDeltas).toStrictEqual([3000, -1000, -1000, -1000]);
  expect(result.dealerKeeps).toBe(true);
});

test("本場と供託が和了点に加算される", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5s" },
      { hand: junkHand },
      { hand: tanyaoHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    round: { honba: 1, kyotaku: 1 },
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5s", riichi: false },
    rng,
  );
  const resolved = Game.apply(claims, { type: "ron", player: 2 }, rng);
  if (resolved.phase.type !== "roundEnd" || resolved.phase.result.type !== "win") {
    throw new Error("和了になっていない");
  }
  const result = resolved.phase.result;
  // 1300 + 本場300 + 供託1000
  expect(result.scoreTotal).toBe(2600);
  expect(result.pointDeltas).toStrictEqual([-1600, 0, 2600, 0]);
});

test("和了結果を確定すると点数が反映され供託が0になる", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5s" },
      { hand: junkHand },
      { hand: tanyaoHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    round: { kyotaku: 1 },
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5s", riichi: false },
    rng,
  );
  const roundEnd = Game.apply(claims, { type: "ron", player: 2 }, rng);
  const confirmed = Game.apply(roundEnd, { type: "confirmRoundEnd" }, rng);
  expect(confirmed.players[0].points).toBe(25000 - 1300);
  expect(confirmed.players[2].points).toBe(25000 + 2300);
  expect(confirmed.round.kyotaku).toBe(0);
});

test("子が和了すると親が下家へ移り本場が0に戻る", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5s" },
      { hand: junkHand },
      { hand: tanyaoHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    round: { honba: 2 },
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5s", riichi: false },
    rng,
  );
  const roundEnd = Game.apply(claims, { type: "ron", player: 2 }, rng);
  const confirmed = Game.apply(roundEnd, { type: "confirmRoundEnd" }, rng);
  expect(confirmed.dealer).toBe(1);
  expect(confirmed.round).toStrictEqual({
    wind: "ton",
    kyoku: 2,
    honba: 0,
    kyotaku: 0,
  });
  // 次局が開始され配牌・親のツモまで進む
  expect(confirmed.phase).toStrictEqual({ type: "turn", actor: 1 });
  expect(confirmed.players[1].drawn).not.toBeNull();
  expect(confirmed.players[0].hand).toHaveLength(13);
});

test("親が和了すると連荘で本場が1増える", () => {
  const state = setupState({
    players: [
      { hand: tanyaoHand, drawn: "5s", discards: [discardEntry("1s")] },
      { hand: junkHand },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const roundEnd = Game.apply(state, { type: "tsumo", player: 0 }, rng);
  const confirmed = Game.apply(roundEnd, { type: "confirmRoundEnd" }, rng);
  expect(confirmed.dealer).toBe(0);
  expect(confirmed.round.kyoku).toBe(1);
  expect(confirmed.round.honba).toBe(1);
});

test("役がない和了形はツモ宣言できない", () => {
  const state = setupState({
    players: [
      { hand: junkHand },
      {
        // 111m ポン済み + 345m678m66p45s: 役なしの和了形(3s/6s待ちのうち6sでもタンヤオ不成立)
        hand: ["3m", "4m", "5m", "6m", "7m", "8m", "6p", "6p", "4s", "5s"],
        melds: [{ meld: { type: "pon", tiles: ["1m", "1m", "1m"] }, from: 3 }],
        drawn: "6s",
        discards: [discardEntry("9p")],
      },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 1 },
  });
  const actions = Game.availableTurnActions(state);
  expect(actions?.canTsumo).toBe(false);
  const next = Game.apply(state, { type: "tsumo", player: 1 }, rng);
  expect(next).toBe(state);
});

test("リーチ者の和了では裏ドラ表示牌がめくられ結果に含まれる", () => {
  const state = setupState({
    players: [
      { hand: junkHand },
      {
        hand: tanyaoHand,
        drawn: "5s",
        riichi: "riichi",
        riichiTileIndex: 0,
        discards: [discardEntry("1s", { riichi: true })],
      },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 1 },
  });
  const resolved = Game.apply(state, { type: "tsumo", player: 1 }, rng);
  if (resolved.phase.type !== "roundEnd" || resolved.phase.result.type !== "win") {
    throw new Error("和了になっていない");
  }
  const result = resolved.phase.result;
  // 裏ドラ表示牌は王牌の10枚目(helpers の inertDeadWall では sha)
  expect(result.uraDora).toStrictEqual(["sha"]);
  expect(result.yaku.map((entry) => entry.name)).toContain("riichi");
});

test("後付けなしでは待ちによって役が消える手はロンできない", () => {
  // 234m 567m 234p + haku haku + 3s3s: シャンポン待ち(haku / 3s)。
  // haku なら役牌だが 3s では役がないため、後付けなしでは和了不可
  const shanponHand: readonly Tile[] = [
    "2m",
    "3m",
    "4m",
    "5m",
    "6m",
    "7m",
    "2p",
    "3p",
    "4p",
    "haku",
    "haku",
    "3s",
    "3s",
  ];
  const base = {
    players: [
      { hand: junkHand, drawn: "haku" as Tile },
      { hand: junkHand },
      { hand: shanponHand },
      { hand: junkHand },
    ] as const,
    live: ["3p", "6m"] as readonly Tile[],
    phase: { type: "turn", actor: 0 } as const,
  };
  const withAtozuke = Game.apply(
    setupState({ ...base, rules: { atozuke: true } }),
    { type: "discard", player: 0, tile: "haku", riichi: false },
    rng,
  );
  if (withAtozuke.phase.type !== "claims") {
    throw new Error("応答待ちになっていない");
  }
  expect(withAtozuke.phase.options[0]?.canRon).toBe(true);

  const withoutAtozuke = Game.apply(
    setupState({ ...base, rules: { atozuke: false } }),
    { type: "discard", player: 0, tile: "haku", riichi: false },
    rng,
  );
  // haku のポンは可能なため応答待ちにはなるが、ロンの選択肢は出ない
  if (withoutAtozuke.phase.type !== "claims") {
    throw new Error("応答待ちになっていない");
  }
  expect(withoutAtozuke.phase.options[0]?.canRon).toBe(false);
});

test("喰いタンなしでは副露したタンヤオ手で和了できない", () => {
  const openTanyao = {
    hand: ["5m", "6m", "7m", "3p", "4p", "5p", "6p", "6p", "4s", "6s"] as const,
    melds: [
      { meld: { type: "pon", tiles: ["2m", "2m", "2m"] } as const, from: 3 },
    ],
    drawn: "5s" as Tile,
    discards: [discardEntry("9p")],
  };
  const withKuitan = setupState({
    players: [{ hand: junkHand }, openTanyao, { hand: junkHand }, { hand: junkHand }],
    live: ["3p", "6m"],
    rules: { kuitan: true },
    phase: { type: "turn", actor: 1 },
  });
  expect(Game.availableTurnActions(withKuitan)?.canTsumo).toBe(true);

  const withoutKuitan = setupState({
    players: [{ hand: junkHand }, openTanyao, { hand: junkHand }, { hand: junkHand }],
    live: ["3p", "6m"],
    rules: { kuitan: false },
    phase: { type: "turn", actor: 1 },
  });
  expect(Game.availableTurnActions(withoutKuitan)?.canTsumo).toBe(false);
});
