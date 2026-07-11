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

const notations = (waitTiles: readonly Tile[]) => waitTiles.map(Tile.toNotation);

test("両面待ちの手は両側の2種が和了牌になる", () => {
  const concealed = tiles("1m 2m 3m 9m 9m 1p 1p 1p 4p 5p 6p 7s 8s");
  expect(notations(Hand.waits(concealed, []))).toStrictEqual(["6s", "9s"]);
});

test("嵌張待ちの手は間の1種が和了牌になる", () => {
  const concealed = tiles("1m 3m 9m 9m 1p 1p 1p 4p 5p 6p 7s 8s 9s");
  expect(notations(Hand.waits(concealed, []))).toStrictEqual(["2m"]);
});

test("単騎待ちの手はその牌1種が和了牌になる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m");
  expect(notations(Hand.waits(concealed, []))).toStrictEqual(["5m"]);
});

test("シャンポン待ちの手は両対子の2種が和了牌になる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s 9m 9m ton ton");
  expect(notations(Hand.waits(concealed, []))).toStrictEqual(["9m", "ton"]);
});

test("テンパイしていない手の和了牌は空になる", () => {
  const concealed = tiles("1m 2m 4m 5m 7p 8p 1s 2s 4s 5s ton nan sha");
  expect(Hand.waits(concealed, [])).toStrictEqual([]);
});

test("手牌と副露で4枚使い切った牌は待ちに含まれない", () => {
  const concealed = tiles("3m 4m 6p 6p 1s 2s 3s 7s 8s 9s");
  const melds = [meld("kan", ["5m", "5m", "5m", "5m"])];
  expect(notations(Hand.waits(concealed, melds))).toStrictEqual(["2m"]);
});

test("国士無双13面待ちは幺九牌13種すべてが和了牌になる", () => {
  const concealed = tiles("1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun");
  expect(notations(Hand.waits(concealed, []))).toStrictEqual([
    "1m",
    "9m",
    "1p",
    "9p",
    "1s",
    "9s",
    "ton",
    "nan",
    "sha",
    "pei",
    "haku",
    "hatsu",
    "chun",
  ]);
});

test("七対子テンパイの手は残る1種の単騎が和了牌になる", () => {
  const concealed = tiles("1m 1m 3m 3m 5p 5p 7p 7p 9s 9s ton ton haku");
  expect(notations(Hand.waits(concealed, []))).toStrictEqual(["haku"]);
});
