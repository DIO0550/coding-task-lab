import { expect, test } from "vitest";
import { Option } from "../Option";

test("some で生成した値は存在する値として保持される", () => {
  const option = Option.some(42);
  expect(Option.isSome(option) ? option.value : undefined).toBe(42);
});

test("fromNullable は有効な値に対して存在する値を返す", () => {
  expect(Option.fromNullable(42)).toEqual(Option.some(42));
});

test("fromNullable は null に対して none を返す", () => {
  expect(Option.fromNullable(null)).toBe(Option.none);
});

test("fromNullable は undefined に対して none を返す", () => {
  expect(Option.fromNullable(undefined)).toBe(Option.none);
});

test("map は存在する値を変換した新しい値を返す", () => {
  expect(Option.map(Option.some(2), (v) => v * 3)).toEqual(Option.some(6));
});

test("map は none をそのまま返す", () => {
  expect(Option.map(Option.none, (v: number) => v * 3)).toBe(Option.none);
});

test("flatMap は存在する値に続く処理を連結できる", () => {
  expect(Option.flatMap(Option.some(2), (v) => Option.some(v * 3))).toEqual(
    Option.some(6),
  );
});

test("flatMap は連結した処理が none を返した場合 none になる", () => {
  expect(Option.flatMap(Option.some(2), () => Option.none)).toBe(Option.none);
});

test("flatMap は none で短絡してそのまま返す", () => {
  expect(Option.flatMap(Option.none, (v: number) => Option.some(v * 3))).toBe(
    Option.none,
  );
});

test("unwrapOr は存在する値を取り出す", () => {
  expect(Option.unwrapOr(Option.some(42), 0)).toBe(42);
});

test("unwrapOr は none に対してデフォルト値を返す", () => {
  expect(Option.unwrapOr(Option.none, 0)).toBe(0);
});

test("unwrap は存在する値を取り出す", () => {
  expect(Option.unwrap(Option.some(42))).toBe(42);
});

test("or は値を持つほうをそのまま返す", () => {
  expect(Option.or(Option.some(1), Option.some(2))).toEqual(Option.some(1));
});

test("or は値を持たないとき代わりの Option を返す", () => {
  expect(Option.or(Option.none, Option.some(2))).toEqual(Option.some(2));
});

test("isSome は値を持っていれば true", () => {
  expect(Option.isSome(Option.some(42))).toBe(true);
});

test("isSome は値を持たなければ false", () => {
  expect(Option.isSome(Option.none)).toBe(false);
});

test("contains は同じ値を持っていれば true", () => {
  expect(Option.contains(Option.some("a"), "a")).toBe(true);
});

test("contains は違う値を持っていれば false", () => {
  expect(Option.contains(Option.some("a"), "b")).toBe(false);
});

test("contains は値を持たなければ false", () => {
  expect(Option.contains(Option.none, "a")).toBe(false);
});

test("equals はどちらも値を持ち、比べ方が等しいと答えれば true", () => {
  expect(
    Option.equals(
      Option.some("a"),
      Option.some("A"),
      (a, b) => a.toLowerCase() === b.toLowerCase(),
    ),
  ).toBe(true);
});

test("equals はどちらも値を持ち、比べ方が違うと答えれば false", () => {
  expect(
    Option.equals(Option.some("a"), Option.some("b"), (a, b) => a === b),
  ).toBe(false);
});

test("equals はどちらも値を持たなければ true", () => {
  expect(Option.equals<string>(Option.none, Option.none, () => false)).toBe(
    true,
  );
});
