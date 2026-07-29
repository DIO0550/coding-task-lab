import { expect, test } from "vitest";

import { outcomeOf, summaryOf, yakuNames } from "./score-fixture.ts";

const PINFU_HAND = "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p";
const RED_FIVE_HAND = "2m 3m 4m 0m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p";

test("ドラは手牌にある枚数分だけ翻数に加算される", () => {
  const outcome = outcomeOf({
    hand: PINFU_HAND,
    winTile: "8s",
    riichi: "riichi",
    dora: "9p",
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: { yaku: expect.arrayContaining([{ name: "dora", han: 2 }]) },
  });
});

test("ドラが無い手にはドラの項目が出ない", () => {
  const outcome = outcomeOf({
    hand: PINFU_HAND,
    winTile: "8s",
    riichi: "riichi",
  });
  expect(yakuNames(outcome)).not.toContain("dora");
});

test("裏ドラはリーチしている場合に加算される", () => {
  const outcome = outcomeOf({
    hand: PINFU_HAND,
    winTile: "8s",
    riichi: "riichi",
    uraDora: "9p",
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: { yaku: expect.arrayContaining([{ name: "ura_dora", han: 2 }]) },
  });
});

test("リーチしていない場合は裏ドラを加算しない", () => {
  const outcome = outcomeOf({
    hand: "2m 3m 4m 5m 6m 7m 2p 3p 4p 6s 7s 8s 9p 9p",
    winTile: "8s",
    winType: "tsumo",
    uraDora: "9p",
  });
  expect(yakuNames(outcome)).not.toContain("ura_dora");
});

test("赤5は赤ドラとして1翻加算される", () => {
  const outcome = outcomeOf({
    hand: RED_FIVE_HAND,
    winTile: "8s",
    riichi: "riichi",
  });
  expect(outcome).toMatchObject({
    type: "scored",
    result: { yaku: expect.arrayContaining([{ name: "aka_dora", han: 1 }]) },
  });
});

test("赤5を含む手はリーチ平和と合わせて3翻になる", () => {
  const outcome = outcomeOf({
    hand: RED_FIVE_HAND,
    winTile: "8s",
    riichi: "riichi",
  });
  expect(summaryOf(outcome)?.han).toBe(3);
});

test("ドラだけでは役とみなされず和了できない", () => {
  const outcome = outcomeOf({
    hand: "1m 2m 3m 5p 6p 7p 1s 2s 3s 4m 5m 6m ton ton",
    winTile: "5m",
    dora: "ton",
  });
  expect(outcome).toStrictEqual({ type: "no_yaku" });
});
