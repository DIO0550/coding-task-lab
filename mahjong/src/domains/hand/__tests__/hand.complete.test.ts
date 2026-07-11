import { expect, test } from "vitest";
import { Hand } from "../index.ts";
import { Tile } from "../../tile/index.ts";

const tiles = (notations: string) =>
  notations.split(" ").map((notation) => {
    const tile = Tile.parse(notation);
    if (tile === null) {
      throw new Error(`不正な牌表記: ${notation}`);
    }
    return tile;
  });

test("13枚の手牌に和了牌を補完して14枚の完成手が昇順で作られる", () => {
  const hand = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m");
  const completed = Hand.completeConcealed(hand, 0, Tile.parse("5m")!);
  expect(completed).not.toBeNull();
  expect(completed!).toHaveLength(14);
  expect(completed!.filter((t) => Tile.equals(t, Tile.parse("5m")!))).toHaveLength(2);
  expect(completed!.toSorted(Tile.compare)).toStrictEqual([...completed!]);
});

test("14枚の手牌はそのまま完成手として受理される", () => {
  const hand = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m");
  const completed = Hand.completeConcealed(hand, 0, Tile.parse("5m")!);
  expect(completed).not.toBeNull();
  expect(completed!).toHaveLength(14);
});

test("副露1組の手は10枚に和了牌を補完して11枚になる", () => {
  const hand = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s 9s");
  const completed = Hand.completeConcealed(hand, 1, Tile.parse("9s")!);
  expect(completed).not.toBeNull();
  expect(completed!).toHaveLength(11);
});

test("副露1組の11枚の手はそのまま受理される", () => {
  const hand = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s 9s 9s");
  const completed = Hand.completeConcealed(hand, 1, Tile.parse("9s")!);
  expect(completed).not.toBeNull();
  expect(completed!).toHaveLength(11);
});

test("期待枚数と一致しない手牌は枚数不整合として補完できない", () => {
  const twelve = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton");
  expect(Hand.completeConcealed(twelve, 0, Tile.parse("5m")!)).toBeNull();
  const fifteen = tiles("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton ton 5m 5m 5m");
  expect(Hand.completeConcealed(fifteen, 0, Tile.parse("5m")!)).toBeNull();
});

test("副露数が0〜4の範囲外なら補完できない", () => {
  const hand = tiles("5m");
  expect(Hand.completeConcealed(hand, 5, Tile.parse("5m")!)).toBeNull();
  expect(Hand.completeConcealed(hand, -1, Tile.parse("5m")!)).toBeNull();
});
