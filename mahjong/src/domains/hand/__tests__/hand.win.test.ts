import { expect, test } from "vitest";
import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import { Meld } from "../../meld/index.ts";

const tiles = (notations: string) =>
  notations.split(" ").map((notation) => {
    const tile = Tile.parse(notation);
    if (tile === null) {
      throw new Error(`不正な牌表記: ${notation}`);
    }
    return tile;
  });

const meld = (type: string, tileNotations: readonly string[]) => {
  const parsed = Meld.parse({ type, tiles: tileNotations });
  if (parsed === null) {
    throw new Error(`不正な面子: ${type}`);
  }
  return parsed;
};

test("4面子1雀頭が揃った面前手は和了形になる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  expect(Hand.isWinningShape(concealed, [])).toBe(true);
});

test("面子が揃わない手は和了形にならない", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton nan 5m 5m");
  expect(Hand.isWinningShape(concealed, [])).toBe(false);
});

test("異なる7種の対子が揃った手は七対子の和了形になる", () => {
  const concealed = tiles("1m 1m 3m 3m 5p 5p 7p 7p 9s 9s ton ton haku haku");
  expect(Hand.isWinningShape(concealed, [])).toBe(true);
});

test("同一牌4枚を含む手は七対子の和了形にならない", () => {
  const concealed = tiles("1m 1m 1m 1m 3m 3m 5p 5p 7p 7p 9s 9s ton ton");
  expect(Hand.isWinningShape(concealed, [])).toBe(false);
});

test("幺九牌13種とその一つの対子は国士無双の和了形になる", () => {
  const concealed = tiles(
    "1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun chun",
  );
  expect(Hand.isWinningShape(concealed, [])).toBe(true);
});

test("幺九牌が12種しかない手は国士無双の和了形にならない", () => {
  const concealed = tiles(
    "1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu 1m 1m",
  );
  expect(Hand.isWinningShape(concealed, [])).toBe(false);
});

test("副露を含む手も面前部分と合わせて和了形と判定される", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s 9m 9m");
  const melds = [meld("pon", ["ton", "ton", "ton"])];
  expect(Hand.isWinningShape(concealed, melds)).toBe(true);
});

test("面前部分の枚数が副露数と整合しない手は和了形にならない", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s 9m 9m");
  expect(Hand.isWinningShape(concealed, [])).toBe(false);
});
