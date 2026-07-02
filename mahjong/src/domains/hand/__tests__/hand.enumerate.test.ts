import { test, expect } from "vitest";

import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";
import { Meld } from "../../meld/index.ts";

const tiles = (texts: ReadonlyArray<string>) =>
  texts.map((text) => {
    const tile = Tile.parse(text);
    if (tile === null) {
      throw new Error(`不正な牌表記: ${text}`);
    }
    return tile;
  });

const tile = (text: string) => tiles([text])[0];

test("4面子1雀頭の手は和了形として列挙される", () => {
  const wins = Hand.enumerateWinningHands(
    tiles([
      "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
      "ton", "ton", "ton", "5m", "5m",
    ]),
    [],
    tile("5m"),
  );
  expect(wins.length).toBeGreaterThan(0);
});

test("和了形でない14枚からは何も列挙されない", () => {
  const wins = Hand.enumerateWinningHands(
    tiles([
      "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
      "ton", "ton", "nan", "sha", "pei",
    ]),
    [],
    tile("pei"),
  );
  expect(wins).toStrictEqual([]);
});

test("面子の取り方が複数ある手は複数の解釈が列挙される", () => {
  const wins = Hand.enumerateWinningHands(
    tiles([
      "1m", "1m", "1m", "2m", "2m", "2m", "3m", "3m", "3m",
      "4m", "5m", "6m", "9m", "9m",
    ]),
    [],
    tile("9m"),
  );
  // 111/222/333 の刻子解釈と 123×3 の順子解釈
  expect(wins.length).toBeGreaterThanOrEqual(2);
});

test("二盃口形は通常形と七対子形の両方で列挙される", () => {
  const wins = Hand.enumerateWinningHands(
    tiles([
      "2m", "2m", "3m", "3m", "4m", "4m", "6m", "6m", "7m", "7m",
      "8m", "8m", "5m", "5m",
    ]),
    [],
    tile("5m"),
  );
  const forms = new Set(wins.map((win) => win.form));
  expect(forms.has("standard")).toBe(true);
  expect(forms.has("chiitoi")).toBe(true);
});

test("国士無双は和了牌が重複牌のとき十三面待ちになる", () => {
  const thirteenWait = Hand.enumerateWinningHands(
    tiles([
      "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "pei",
      "haku", "hatsu", "chun", "chun",
    ]),
    [],
    tile("chun"),
  );
  expect(thirteenWait).toStrictEqual([
    { form: "kokushi", thirteenWait: true },
  ]);

  const singleWait = Hand.enumerateWinningHands(
    tiles([
      "1m", "1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha",
      "pei", "haku", "hatsu", "chun",
    ]),
    [],
    tile("chun"),
  );
  expect(singleWait).toStrictEqual([
    { form: "kokushi", thirteenWait: false },
  ]);
});

test("暗槓だけの手は門前として扱われる", () => {
  const ankan = Meld.create("ankan", tiles(["1p", "1p", "1p", "1p"]));
  const pon = Meld.create("pon", tiles(["ton", "ton", "ton"]));
  if (ankan === null || pon === null) {
    throw new Error("副露の生成に失敗した");
  }

  const withAnkan = Hand.enumerateWinningHands(
    tiles(["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "nan", "nan"]),
    [ankan],
    tile("nan"),
  );
  expect(withAnkan.every(Hand.isMenzen)).toBe(true);

  const withPon = Hand.enumerateWinningHands(
    tiles(["2m", "3m", "4m", "4p", "5p", "6p", "7s", "8s", "9s", "nan", "nan"]),
    [pon],
    tile("nan"),
  );
  expect(withPon.some(Hand.isMenzen)).toBe(false);
});
