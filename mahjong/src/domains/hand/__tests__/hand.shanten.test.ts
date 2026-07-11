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

test("和了形の14枚のシャンテン数は-1になる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  expect(Hand.shanten(concealed, 0)).toBe(-1);
});

test("テンパイの13枚のシャンテン数は0になる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m");
  expect(Hand.shanten(concealed, 0)).toBe(0);
});

test("面子3つと搭子1つと雀頭の手は1シャンテンになる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton 2s 6s");
  expect(Hand.shanten(concealed, 0)).toBe(1);
});

test("嵌張2つを持つヘッドレスの手は1シャンテンになる", () => {
  const concealed = tiles("1m 2m 3m 4m 5m 6m 7m 8m 9m 2p 4p 6s 8s");
  expect(Hand.shanten(concealed, 0)).toBe(1);
});

test("対子5つの手は七対子で1シャンテンになる", () => {
  const concealed = tiles("1m 1m 3m 3m 5p 5p 7p 7p 9s 9s ton nan sha");
  expect(Hand.shanten(concealed, 0)).toBe(1);
});

test("七対子が完成した14枚のシャンテン数は-1になる", () => {
  const concealed = tiles("1m 1m 3m 3m 5p 5p 7p 7p 9s 9s ton ton haku haku");
  expect(Hand.shanten(concealed, 0)).toBe(-1);
});

test("幺九牌13種バラバラの手は国士無双で0シャンテンになる", () => {
  const concealed = tiles("1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun");
  expect(Hand.shanten(concealed, 0)).toBe(0);
});

test("幺九牌12種と対子1つの手は国士無双で0シャンテンになる", () => {
  const concealed = tiles("1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu 1m");
  expect(Hand.shanten(concealed, 0)).toBe(0);
});

test("幺九牌11種で対子なしの手は国士無双で2シャンテンになる", () => {
  const concealed = tiles("1m 9m 1p 9p 1s 9s ton nan sha pei haku 2m 3m");
  expect(Hand.shanten(concealed, 0)).toBe(2);
});

test("副露3組と面前4枚のテンパイはシャンテン0と判定される", () => {
  const concealed = tiles("1m 2m 3m 5p");
  expect(Hand.shanten(concealed, 3)).toBe(0);
  const melds = [
    meld("pon", ["ton", "ton", "ton"]),
    meld("chi", ["1s", "2s", "3s"]),
    meld("pon", ["9p", "9p", "9p"]),
  ];
  expect(Hand.isTenpai(concealed, melds)).toBe(true);
});

test("テンパイの手はisTenpaiがtrueになる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m");
  expect(Hand.isTenpai(concealed, [])).toBe(true);
});

test("1シャンテンの手はisTenpaiがfalseになる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton 2s 6s");
  expect(Hand.isTenpai(concealed, [])).toBe(false);
});

test("受け入れ牌はツモでシャンテンが進む牌だけが列挙される", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton nan sha");
  const acceptances = Hand.acceptances(concealed, 0);
  expect(acceptances.map(Tile.toNotation)).toStrictEqual(["ton", "nan", "sha"]);
});

test("手牌で4枚使い切った牌は受け入れに含まれない", () => {
  const concealed = tiles("ton ton ton ton 1m 2m 3m 4p 5p 6p 7s 8s 9s");
  const acceptances = Hand.acceptances(concealed, 0);
  expect(acceptances.some((t) => Tile.equals(t, Tile.parse("ton")!))).toBe(
    false,
  );
});
