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

const meldOf = (type: "chi" | "pon" | "kan" | "ankan", texts: string[]) => {
  const meld = Meld.create(type, tiles(texts));
  if (meld === null) {
    throw new Error("副露の生成に失敗した");
  }
  return meld;
};

test("純手牌の上限は14枚から副露1つにつき3枚減る", () => {
  expect(Hand.capacity(0)).toBe(14);
  expect(Hand.capacity(2)).toBe(8);
  expect(Hand.capacity(4)).toBe(2);
});

test("上限枚数に達した手牌には牌を追加できない", () => {
  const fourteen = tiles([
    "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s",
    "ton", "ton", "ton", "5m", "5m",
  ]);
  expect(Hand.canAddTile(fourteen, [], tile("9m"))).toBe(false);
  expect(Hand.canAddTile(fourteen.slice(0, 13), [], tile("9m"))).toBe(true);
});

test("副露も含めて同種5枚目の牌は追加できない", () => {
  const concealed = tiles(["1m"]);
  const pon = meldOf("pon", ["1m", "1m", "1m"]);
  expect(Hand.canAddTile(concealed, [pon], tile("1m"))).toBe(false);
  expect(Hand.canAddTile(concealed, [pon], tile("2m"))).toBe(true);
});

test("同色の赤5は2枚目を追加できない", () => {
  const concealed = tiles(["0m"]);
  expect(Hand.canAddTile(concealed, [], tile("0m"))).toBe(false);
  expect(Hand.canAddTile(concealed, [], tile("0p"))).toBe(true);
});

test("副露は4つまでしか追加できない", () => {
  const melds = [
    meldOf("pon", ["1m", "1m", "1m"]),
    meldOf("pon", ["2p", "2p", "2p"]),
    meldOf("pon", ["3s", "3s", "3s"]),
    meldOf("pon", ["haku", "haku", "haku"]),
  ];
  const fifth = meldOf("pon", ["chun", "chun", "chun"]);
  expect(Hand.canAddMeld(tiles(["9m"]), melds, fifth)).toBe(false);
  expect(Hand.canAddMeld(tiles(["9m"]), melds.slice(0, 3), fifth)).toBe(true);
});

test("手牌が多すぎて副露の枠が残っていない場合は追加できない", () => {
  const twelve = tiles([
    "1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton",
  ]);
  const pon = meldOf("pon", ["haku", "haku", "haku"]);
  expect(Hand.canAddMeld(twelve, [], pon)).toBe(false);
  expect(Hand.canAddMeld(twelve.slice(0, 11), [], pon)).toBe(true);
});

test("既存の牌と合わせて同種5枚になる副露は追加できない", () => {
  const concealed = tiles(["haku", "haku"]);
  const pon = meldOf("pon", ["haku", "haku", "haku"]);
  expect(Hand.canAddMeld(concealed, [], pon)).toBe(false);
});
