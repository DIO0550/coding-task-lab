import { expect, test } from "vitest";
import { WinContext } from "../index.ts";
import { Hand, type WinningForm } from "../../hand/index.ts";
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

const tile = (notation: string) => {
  const parsed = Tile.parse(notation);
  if (parsed === null) {
    throw new Error(`不正な牌表記: ${notation}`);
  }
  return parsed;
};

const singleForm = (
  concealed: string,
  meldInputs: readonly { type: string; tiles: readonly string[] }[] = [],
): WinningForm => {
  const melds = meldInputs.map((input) => {
    const parsed = Meld.parse(input);
    if (parsed === null) {
      throw new Error("不正な面子");
    }
    return parsed;
  });
  const forms = Hand.decompose(tiles(concealed), melds);
  if (forms.length !== 1) {
    throw new Error(`分解が一意でない: ${forms.length}通り`);
  }
  return forms[0];
};

test("雀頭を完成させる和了牌はpairの位置として列挙される", () => {
  const form = singleForm("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  expect(WinContext.agariPositions(form, tile("5m"))).toStrictEqual([
    { target: "pair", index: 0 },
  ]);
});

test("複数の面子に含まれる和了牌は該当する全ての位置が列挙される", () => {
  const form = singleForm("2m 3m 4m 4m 5m 6m 7p 7p 7p 9s 9s 9s ton ton");
  expect(WinContext.agariPositions(form, tile("4m"))).toStrictEqual([
    { target: "group", index: 0 },
    { target: "group", index: 1 },
  ]);
});

test("面子と雀頭の両方に含まれる和了牌は両方の位置が列挙される", () => {
  const form = singleForm("3m 4m 5m 5m 5m 6m 7m 8m 4p 5p 6p 1s 2s 3s");
  expect(WinContext.agariPositions(form, tile("5m"))).toStrictEqual([
    { target: "group", index: 0 },
    { target: "pair", index: 0 },
  ]);
});

test("副露の面子は和了牌を含んでいても位置に列挙されない", () => {
  const form = singleForm("4m 5m 6m 7p 8p 9p 1s 2s 3s 9s 9s", [
    { type: "pon", tiles: ["5m", "5m", "5m"] },
  ]);
  expect(WinContext.agariPositions(form, tile("5m"))).toStrictEqual([
    { target: "group", index: 0 },
  ]);
});

test("七対子は和了牌を含む対子の添字が列挙される", () => {
  const form = singleForm("1m 1m 3m 3m 5p 5p 7p 7p 9s 9s ton ton haku haku");
  expect(WinContext.agariPositions(form, tile("9s"))).toStrictEqual([
    { target: "pair", index: 4 },
  ]);
});

test("国士無双はpairの位置に固定される", () => {
  const form = singleForm(
    "1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun chun",
  );
  expect(WinContext.agariPositions(form, tile("1m"))).toStrictEqual([
    { target: "pair", index: 0 },
  ]);
});

test("どの位置にも含まれない牌の位置列挙は空になる", () => {
  const form = singleForm("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  expect(WinContext.agariPositions(form, tile("chun"))).toStrictEqual([]);
});
