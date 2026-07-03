import { test, expect } from "vitest";

import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import { Meld } from "../../meld/index.ts";
import type { WinType } from "../../score/index.ts";

const tiles = (...texts: readonly string[]): Tile[] =>
  texts.flatMap((text) => {
    const tile = Tile.parse(text);
    return tile === null ? [] : [tile];
  });

const winsOf = (
  handTexts: readonly string[],
  winText: string,
  winType: WinType = "ron",
) => {
  const winTile = Tile.parse(winText);
  if (winTile === null) {
    throw new Error(`invalid tile: ${winText}`);
  }
  return Hand.enumerateWins({
    concealedTiles: tiles(...handTexts),
    melds: [],
    winTile,
    winType,
  });
};

test("4面子1雀頭の通常形は和了形と判定される", () => {
  const wins = winsOf(
    ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m", "5m"],
    "5m",
  );
  expect(wins.length).toBeGreaterThan(0);
  expect(wins.every((win) => win.form === "standard")).toBe(true);
});

test("和了形でない手は解釈なしになる", () => {
  const wins = winsOf(
    ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "1s", "2s", "haku", "9m", "9m"],
    "9m",
  );
  expect(wins).toHaveLength(0);
});

test("複数の面子分解がある手は解釈が複数列挙される", () => {
  const wins = winsOf(
    ["1m", "1m", "1m", "2m", "2m", "2m", "3m", "3m", "3m", "5s", "6s", "7s", "4p", "4p"],
    "4p",
  );
  expect(wins.length).toBe(2);
});

test("七対子は7種の対子で和了形と判定される", () => {
  const wins = winsOf(
    ["1m", "1m", "3p", "3p", "5s", "5s", "7m", "7m", "9p", "9p", "ton", "ton", "haku", "haku"],
    "haku",
  );
  expect(wins.map((win) => win.form)).toContain("chiitoitsu");
});

test("同一牌4枚は七対子の2対子として扱えない", () => {
  const wins = winsOf(
    ["1m", "1m", "1m", "1m", "3p", "3p", "5s", "5s", "7m", "7m", "9p", "9p", "ton", "ton"],
    "ton",
  );
  expect(wins.map((win) => win.form)).not.toContain("chiitoitsu");
});

test("二盃口形は通常形と七対子の両方の解釈を持つ", () => {
  const wins = winsOf(
    ["2m", "2m", "3m", "3m", "4m", "4m", "6p", "6p", "7p", "7p", "8p", "8p", "5s", "5s"],
    "5s",
  );
  const forms = wins.map((win) => win.form);
  expect(forms).toContain("standard");
  expect(forms).toContain("chiitoitsu");
});

test("国士無双は13種の么九牌で和了形と判定される", () => {
  const wins = winsOf(
    ["1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"],
    "9m",
  );
  expect(wins).toHaveLength(1);
  expect(wins[0]).toMatchObject({ form: "kokushi", thirteenWait: false });
});

test("13面待ちの国士無双は和了牌が対子になる形で判定される", () => {
  const wins = winsOf(
    ["1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun", "1m"],
    "1m",
  );
  expect(wins).toHaveLength(1);
  expect(wins[0]).toMatchObject({ form: "kokushi", thirteenWait: true });
});

test("副露がある手は残りの純手牌から面子分解される", () => {
  const meld = Meld.create("pon", tiles("8m", "8m", "8m"));
  if (meld === null) {
    throw new Error("meld setup failed");
  }
  const winTile = Tile.parse("7s");
  if (winTile === null) {
    throw new Error("tile setup failed");
  }
  const wins = Hand.enumerateWins({
    concealedTiles: tiles("2m", "3m", "4m", "5p", "6p", "7p", "5s", "6s", "7s", "3p", "3p"),
    melds: [meld],
    winTile,
    winType: "ron",
  });
  expect(wins.length).toBeGreaterThan(0);
  expect(wins[0].form).toBe("standard");
});
