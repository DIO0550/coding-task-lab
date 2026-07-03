import { test, expect } from "vitest";

import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import type { Tile as TileT } from "../../tile/index.ts";

const tiles = (...ss: readonly string[]): readonly TileT[] => ss.map((s) => Tile.parse(s) as TileT);

test("和了形の14枚はシャンテン数が-1になる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "ton", "ton", "ton",
    "5s", "5s",
  );
  expect(Hand.shanten(concealed, 0)).toBe(-1);
});

test("テンパイの13枚はシャンテン数が0になる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "ton", "ton", "ton",
    "5s",
  );
  expect(Hand.shanten(concealed, 0)).toBe(0);
});

test("3面子1雀頭+孤立牌2枚のノーテン手は1シャンテンになる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "7s", "8s", "9s",
    "ton", "ton",
    "haku", "chun",
  );
  expect(Hand.shanten(concealed, 0)).toBe(1);
});

test("2面子1雀頭1塔子+孤立牌1枚のノーテン手は2シャンテンになる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "ton", "ton",
    "7s", "8s",
    "haku", "chun", "sha",
  );
  expect(Hand.shanten(concealed, 0)).toBe(2);
});

test("副露を1つ含む3面子1雀頭+孤立牌1枚のノーテン手は1シャンテンになる", () => {
  const concealed = tiles(
    "1m", "2m", "3m",
    "4p", "5p", "6p",
    "ton", "ton",
    "haku",
  );
  // 副露が1つあるので4面子中1つは既に完成しており、残り3面子分を concealed で探す形になる
  expect(Hand.shanten(concealed, 1)).toBe(1);
});

test("七対子の完成形は通常形として数えなくてもシャンテン数が-1になる", () => {
  const concealed = tiles(
    "1m", "1m",
    "9m", "9m",
    "1p", "1p",
    "9p", "9p",
    "1s", "1s",
    "9s", "9s",
    "haku", "haku",
  );
  expect(Hand.shanten(concealed, 0)).toBe(-1);
});

test("六対子+単独牌1枚は七対子の形として1シャンテンになる(通常形より有利)", () => {
  const concealed = tiles(
    "ton", "ton",
    "nan", "nan",
    "sha", "sha",
    "pei", "pei",
    "haku", "haku",
    "hatsu", "chun", "1m",
  );
  expect(Hand.shanten(concealed, 0)).toBe(1);
});

test("么九牌13種を単騎で揃えた13枚は国士無双としてシャンテン数0(13面待ち)になる", () => {
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "nan", "sha", "pei", "haku", "hatsu", "chun",
  );
  expect(Hand.shanten(concealed, 0)).toBe(0);
});

test("么九牌12種(1種欠け・么九牌以外1枚)は国士無双として1シャンテンになる", () => {
  const concealed = tiles(
    "1m", "9m", "1p", "9p", "1s", "9s",
    "ton", "nan", "sha", "pei", "haku", "hatsu",
    "5m",
  );
  expect(Hand.shanten(concealed, 0)).toBe(1);
});

test("副露がある場合は七対子・国士無双を考慮せず通常形のみでシャンテン数を計算する", () => {
  const concealed = tiles(
    "ton", "ton",
    "nan", "nan",
    "sha", "sha",
    "pei", "pei",
    "haku", "haku",
  );
  // meldCount!==0 のため七対子形(本来ならシャンテン0)は考慮されず、通常形のみで計算される
  expect(Hand.shanten(concealed, 1)).toBe(2);
});

test("シャンテン計算は複雑な手牌(九蓮宝燈のテンパイ形)でも高速に完了する", () => {
  const concealed = tiles(
    "1m", "1m", "1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "9m", "9m",
  );
  const start = Date.now();
  const result = Hand.shanten(concealed, 0);
  const elapsed = Date.now() - start;
  expect(result).toBe(0);
  expect(elapsed).toBeLessThan(100);
});
