import { expect, test } from "vitest";
import { Hand, type StandardForm, type WinningForm } from "../index.ts";
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

const asStandard = (form: WinningForm): StandardForm => {
  if (form.kind !== "standard") {
    throw new Error("通常形ではない");
  }
  return form;
};

test("111222333mを含む手は3刻子と3順子の2通りに分解される", () => {
  const concealed = tiles("1m 1m 1m 2m 2m 2m 3m 3m 3m 4p 5p 6p 9s 9s");
  const forms = Hand.decompose(concealed, []);
  expect(forms).toHaveLength(2);
  const signatures = forms
    .map((form) =>
      asStandard(form)
        .groups.map((group) => group.type)
        .toSorted()
        .join(","),
    )
    .toSorted();
  expect(signatures).toStrictEqual([
    "kotsu,kotsu,kotsu,shuntsu",
    "shuntsu,shuntsu,shuntsu,shuntsu",
  ]);
});

test("通常形の分解では雀頭がpairとして面子と区別される", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  const forms = Hand.decompose(concealed, []);
  expect(forms).toHaveLength(1);
  const form = asStandard(forms[0]);
  expect(form.groups).toHaveLength(4);
  expect(form.pair.type).toBe("pair");
  expect(form.pair.tiles.map(Tile.toNotation)).toStrictEqual(["5m", "5m"]);
});

test("チーの副露はfromMeldの順子として分解に含まれる", () => {
  const concealed = tiles("4p 5p 6p 7s 8s 9s 9m 9m 1m 2m 3m");
  const melds = [meld("chi", ["1s", "2s", "3s"])];
  const forms = Hand.decompose(concealed, melds);
  expect(forms).toHaveLength(1);
  const meldGroups = asStandard(forms[0]).groups.filter((g) => g.fromMeld);
  expect(meldGroups).toHaveLength(1);
  expect(meldGroups[0].type).toBe("shuntsu");
  expect(meldGroups[0].concealed).toBe(false);
});

test("暗槓は面前扱いの槓子として分解に含まれる", () => {
  const concealed = tiles("4p 5p 6p 7s 8s 9s 9m 9m 1m 2m 3m");
  const melds = [meld("ankan", ["ton", "ton", "ton", "ton"])];
  const forms = Hand.decompose(concealed, melds);
  expect(forms).toHaveLength(1);
  const kantsu = asStandard(forms[0]).groups.filter((g) => g.type === "kantsu");
  expect(kantsu).toHaveLength(1);
  expect(kantsu[0].concealed).toBe(true);
  expect(kantsu[0].fromMeld).toBe(true);
  expect(kantsu[0].tiles).toHaveLength(4);
});

test("面前の分解はconcealedかつfromMeldでないブロックになる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  const forms = Hand.decompose(concealed, []);
  const form = asStandard(forms[0]);
  expect(form.groups.every((g) => g.concealed && !g.fromMeld)).toBe(true);
  expect(form.pair.concealed).toBe(true);
  expect(form.pair.fromMeld).toBe(false);
});

test("二盃口の形は通常形と七対子の両方に分解される", () => {
  const concealed = tiles("2m 2m 3m 3m 4m 4m 5p 5p 6p 6p 7p 7p 9s 9s");
  const forms = Hand.decompose(concealed, []);
  const kinds = forms.map((form) => form.kind).toSorted();
  expect(kinds).toStrictEqual(["chiitoitsu", "standard"]);
});

test("七対子の分解は対子7つを正準順で持つ", () => {
  const concealed = tiles("1m 1m 3m 3m 5p 5p 7p 7p 9s 9s ton ton haku haku");
  const forms = Hand.decompose(concealed, []);
  expect(forms).toHaveLength(1);
  const form = forms[0];
  expect(form.kind).toBe("chiitoitsu");
  if (form.kind !== "chiitoitsu") {
    throw new Error("七対子ではない");
  }
  expect(form.pairs).toHaveLength(7);
  expect(form.pairs.map((pair) => Tile.toNotation(pair.tiles[0]))).toStrictEqual(
    ["1m", "3m", "5p", "7p", "9s", "ton", "haku"],
  );
});

test("国士無双の分解は14枚と対子牌を持つ", () => {
  const concealed = tiles(
    "1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun chun",
  );
  const forms = Hand.decompose(concealed, []);
  expect(forms).toHaveLength(1);
  const form = forms[0];
  expect(form.kind).toBe("kokushi");
  if (form.kind !== "kokushi") {
    throw new Error("国士無双ではない");
  }
  expect(form.tiles).toHaveLength(14);
  expect(Tile.toNotation(form.pairTile)).toBe("chun");
});

test("和了形でない手の分解は空になる", () => {
  const concealed = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton nan 5m 5m");
  expect(Hand.decompose(concealed, [])).toStrictEqual([]);
});

test("赤5は分解後のブロックにも赤のまま保持される", () => {
  const concealed = tiles("1m 2m 3m 4p 0p 6p 7s 8s 9s ton ton ton 5m 5m");
  const forms = Hand.decompose(concealed, []);
  expect(forms).toHaveLength(1);
  const allTiles = [
    ...asStandard(forms[0]).groups.flatMap((g) => g.tiles),
    ...asStandard(forms[0]).pair.tiles,
  ];
  expect(allTiles.filter((t) => t.red)).toHaveLength(1);
});
