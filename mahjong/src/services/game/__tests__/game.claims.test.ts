import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";
import { Game } from "../index";
import { discardEntry, junkHand, seededRng, setupState } from "./helpers";

const rng = seededRng(300);

/** 123456789m + 4p6p + 2s2s: 5p 待ち(一気通貫)のロン用手牌 */
const ronHand5p: readonly Tile[] = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "4p",
  "6p",
  "2s",
  "2s",
];

/** 4m を2枚持つポン用のゴミ手(4mはこの2枚のみ) */
const ponHand4m: readonly Tile[] = [
  "4m",
  "4m",
  "9m",
  "1p",
  "4p",
  "7p",
  "1s",
  "4s",
  "7s",
  "ton",
  "nan",
  "sha",
  "pei",
];

test("和了牌を打牌されるとロンの選択肢が提示される", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5p" },
      { hand: junkHand },
      { hand: ronHand5p },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5p", riichi: false },
    rng,
  );
  expect(next.phase.type).toBe("claims");
  if (next.phase.type === "claims") {
    expect(next.phase.options).toStrictEqual([
      { player: 2, canRon: true, canPon: false, canKan: false, chiOptions: [] },
    ]);
  }
});

test("自分の河に待ち牌があるとフリテンでロンできない", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5p" },
      { hand: junkHand },
      { hand: ronHand5p, discards: [discardEntry("5p")] },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5p", riichi: false },
    rng,
  );
  // ロンの選択肢が出ず、そのまま下家の手番になる
  expect(next.phase).toStrictEqual({ type: "turn", actor: 1 });
});

test("ロンはポンより優先して解決される", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5p" },
      { hand: junkHand },
      { hand: ronHand5p },
      { hand: ["5p", "5p", ...junkHand.slice(0, 11)] },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5p", riichi: false },
    rng,
  );
  expect(claims.phase.type).toBe("claims");
  const afterPon = Game.apply(claims, { type: "pon", player: 3 }, rng);
  const resolved = Game.apply(afterPon, { type: "ron", player: 2 }, rng);
  expect(resolved.phase.type).toBe("roundEnd");
  if (resolved.phase.type === "roundEnd") {
    expect(resolved.phase.result.type).toBe("win");
    if (resolved.phase.result.type === "win") {
      expect(resolved.phase.result.winner).toBe(2);
      expect(resolved.phase.result.loser).toBe(0);
      expect(resolved.phase.result.winType).toBe("ron");
    }
  }
});

test("ポンはチーより優先して解決される", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "4m" },
      { hand: ["2m", "3m", ...junkHand.slice(2)], discards: [discardEntry("1p")] },
      { hand: ponHand4m },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "4m", riichi: false },
    rng,
  );
  expect(claims.phase.type).toBe("claims");
  const afterChi = Game.apply(
    claims,
    { type: "chi", player: 1, tiles: ["2m", "3m"] },
    rng,
  );
  const resolved = Game.apply(afterChi, { type: "pon", player: 2 }, rng);
  expect(resolved.phase).toStrictEqual({ type: "turn", actor: 2 });
  expect(resolved.players[2].melds).toStrictEqual([
    { meld: { type: "pon", tiles: ["4m", "4m", "4m"] }, from: 0 },
  ]);
  expect(resolved.players[2].hand).toHaveLength(11);
  expect(resolved.players[2].drawn).toBeNull();
  // 鳴かれた打牌には claimed が付く
  const lastDiscard = resolved.players[0].discards.at(-1);
  expect(lastDiscard?.claimed).toBe(true);
});

test("複数のロンは頭ハネで放銃者から反時計回りに最も近い1人が和了する", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5p" },
      { hand: ronHand5p },
      { hand: junkHand },
      { hand: ronHand5p },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5p", riichi: false },
    rng,
  );
  const afterFirst = Game.apply(claims, { type: "ron", player: 3 }, rng);
  const resolved = Game.apply(afterFirst, { type: "ron", player: 1 }, rng);
  expect(resolved.phase.type).toBe("roundEnd");
  if (resolved.phase.type === "roundEnd" && resolved.phase.result.type === "win") {
    expect(resolved.phase.result.winner).toBe(1);
  }
});

test("チーは下家だけに提示される", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "4m" },
      { hand: junkHand },
      { hand: ["2m", "3m", ...junkHand.slice(2)], discards: [discardEntry("1p")] },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  // 2m3m を持つのは対面(席2)なのでチーできず、選択肢なしで手番が進む
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "4m", riichi: false },
    rng,
  );
  expect(next.phase).toStrictEqual({ type: "turn", actor: 1 });
});

test("チーすると手牌から2枚が副露へ移り打牌の手番になる", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "4m" },
      { hand: ["2m", "3m", ...junkHand.slice(2)], discards: [discardEntry("1p")] },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "4m", riichi: false },
    rng,
  );
  const resolved = Game.apply(
    claims,
    { type: "chi", player: 1, tiles: ["2m", "3m"] },
    rng,
  );
  expect(resolved.phase).toStrictEqual({ type: "turn", actor: 1 });
  expect(resolved.players[1].melds).toStrictEqual([
    { meld: { type: "chi", tiles: ["2m", "3m", "4m"] }, from: 0 },
  ]);
  expect(resolved.players[1].hand).toHaveLength(11);
});

test("鳴きが入ると全員の一発が消える", () => {
  const riichiTenpai: readonly Tile[] = [
    "1m",
    "2m",
    "3m",
    "4m",
    "5m",
    "6m",
    "7m",
    "8m",
    "9m",
    "2s",
    "2s",
    "8p",
    "8p",
  ];
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "4m" },
      {
        hand: riichiTenpai,
        riichi: "riichi",
        riichiTileIndex: 0,
        ippatsu: true,
        discards: [discardEntry("9s", { riichi: true })],
      },
      { hand: ponHand4m },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "4m", riichi: false },
    rng,
  );
  const resolved = Game.apply(claims, { type: "pon", player: 2 }, rng);
  expect(resolved.players[1].ippatsu).toBe(false);
});

test("リーチ中はポンできずロンだけが提示される", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "8p" },
      {
        // 8p8p を持つがリーチ中なのでポンできない
        hand: [
          "1m",
          "2m",
          "3m",
          "4m",
          "5m",
          "6m",
          "7m",
          "8m",
          "9m",
          "2s",
          "2s",
          "8p",
          "8p",
        ],
        riichi: "riichi",
        riichiTileIndex: 0,
        discards: [discardEntry("9s", { riichi: true })],
      },
      { hand: junkHand },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "8p", riichi: false },
    rng,
  );
  // 8p はシャンポン待ちの一角なのでロンは可能だが、リーチ中のためポンは不可
  expect(next.phase.type).toBe("claims");
  if (next.phase.type === "claims") {
    expect(next.phase.options).toStrictEqual([
      { player: 1, canRon: true, canPon: false, canKan: false, chiOptions: [] },
    ]);
  }
});

test("リーチ者が和了牌を見逃すと永続フリテンになる", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5p" },
      { hand: junkHand },
      {
        hand: ronHand5p,
        riichi: "riichi",
        riichiTileIndex: 0,
        discards: [discardEntry("9s", { riichi: true })],
      },
      { hand: junkHand },
    ],
    live: ["3p", "6m"],
    phase: { type: "turn", actor: 0 },
  });
  const claims = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5p", riichi: false },
    rng,
  );
  const resolved = Game.apply(claims, { type: "pass", player: 2 }, rng);
  expect(resolved.players[2].riichiFuriten).toBe(true);
  expect(resolved.players[2].furiten).toBe(true);
});

test("残り山0枚の最終打牌はロン以外の鳴きができない", () => {
  const state = setupState({
    players: [
      { hand: junkHand, drawn: "5p" },
      { hand: junkHand },
      { hand: ronHand5p },
      { hand: ["5p", "5p", ...junkHand.slice(0, 11)] },
    ],
    live: [],
    phase: { type: "turn", actor: 0 },
  });
  const next = Game.apply(
    state,
    { type: "discard", player: 0, tile: "5p", riichi: false },
    rng,
  );
  expect(next.phase.type).toBe("claims");
  if (next.phase.type === "claims") {
    // ポンを持つ席3は選択肢に含まれない
    expect(next.phase.options.map((option) => option.player)).toStrictEqual([2]);
  }
});
