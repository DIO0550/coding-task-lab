import { test, expect } from "vitest";

import { Tile } from "../index.ts";

test("isHonorは字牌に対してtrueを返す", () => {
  expect(Tile.isHonor(Tile.parse("haku") as Tile)).toBe(true);
});

test("isHonorは数牌に対してfalseを返す", () => {
  expect(Tile.isHonor(Tile.parse("5m") as Tile)).toBe(false);
});

test("isTerminalは老頭牌(1と9)に対してtrueを返す", () => {
  expect(Tile.isTerminal(Tile.parse("1m") as Tile)).toBe(true);
  expect(Tile.isTerminal(Tile.parse("9s") as Tile)).toBe(true);
});

test("isTerminalは中張牌に対してfalseを返す", () => {
  expect(Tile.isTerminal(Tile.parse("5p") as Tile)).toBe(false);
});

test("isYaochuuは么九牌(老頭牌・字牌)に対してtrueを返す", () => {
  expect(Tile.isYaochuu(Tile.parse("1m") as Tile)).toBe(true);
  expect(Tile.isYaochuu(Tile.parse("chun") as Tile)).toBe(true);
});

test("isYaochuuは中張牌に対してfalseを返す", () => {
  expect(Tile.isYaochuu(Tile.parse("2m") as Tile)).toBe(false);
});

test("isGreenは緑一色に使える牌(2,3,4,6,8索と發)に対してtrueを返す", () => {
  for (const s of ["2s", "3s", "4s", "6s", "8s", "hatsu"]) {
    expect(Tile.isGreen(Tile.parse(s) as Tile)).toBe(true);
  }
});

test("isGreenは緑一色に使えない牌に対してfalseを返す", () => {
  for (const s of ["1s", "5s", "7s", "9s", "1m", "haku"]) {
    expect(Tile.isGreen(Tile.parse(s) as Tile)).toBe(false);
  }
});
