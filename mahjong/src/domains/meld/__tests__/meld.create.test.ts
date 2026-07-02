import { test, expect } from "vitest";

import { Meld } from "../index.ts";
import { Tile } from "../../tile/index.ts";

const tiles = (texts: ReadonlyArray<string>) =>
  texts.map((text) => {
    const tile = Tile.parse(text);
    if (tile === null) {
      throw new Error(`不正な牌表記: ${text}`);
    }
    return tile;
  });

test("連続する同色3枚はチーとして生成できる", () => {
  expect(Meld.create("chi", tiles(["3p", "1p", "2p"]))).not.toBeNull();
});

test("字牌や不連続の牌はチーにならない", () => {
  expect(Meld.create("chi", tiles(["ton", "nan", "sha"]))).toBeNull();
  expect(Meld.create("chi", tiles(["1m", "2m", "4m"]))).toBeNull();
  expect(Meld.create("chi", tiles(["1m", "2m", "3p"]))).toBeNull();
});

test("同種3枚はポンとして生成できる", () => {
  expect(Meld.create("pon", tiles(["haku", "haku", "haku"]))).not.toBeNull();
  expect(Meld.create("pon", tiles(["1m", "1m", "2m"]))).toBeNull();
});

test("カンは同種4枚のみ生成できる", () => {
  expect(Meld.create("kan", tiles(["5s", "5s", "5s", "5s"]))).not.toBeNull();
  expect(Meld.create("ankan", tiles(["5s", "5s", "5s"]))).toBeNull();
});

test("赤5を含んでいても同種として判定される", () => {
  expect(Meld.create("pon", tiles(["0m", "5m", "5m"]))).not.toBeNull();
});

test("暗槓は門前を崩さない副露として扱われる", () => {
  const ankan = Meld.create("ankan", tiles(["1p", "1p", "1p", "1p"]));
  const kan = Meld.create("kan", tiles(["1p", "1p", "1p", "1p"]));
  expect(ankan).not.toBeNull();
  expect(kan).not.toBeNull();
  expect(Meld.isOpen(ankan as NonNullable<typeof ankan>)).toBe(false);
  expect(Meld.isOpen(kan as NonNullable<typeof kan>)).toBe(true);
});
