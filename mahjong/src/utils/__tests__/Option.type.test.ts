import { expect, expectTypeOf, test } from "vitest";
import { type None, Option, type Some } from "../Option";

/*
 * 絞り込みが効くことを固定する（`rules/coding.md`「型レベルの保証が仕様の一部であるとき
 * は `expectTypeOf` で退行を検知する」）。効かなくなると `isSome` は真偽を答えるだけの
 * 関数になり、通した先で `value` が読めなくなる。
 */

test("isSome が真の側では値を読める型に絞られる", () => {
  // `Option.some(42)` を直に入れると初期化子の型で絞られ、`isSome` が絞り込まなくても
  // `value` が読めてしまう。`fromNullable` は union を返すのでそれが起きない。
  const option = Option.fromNullable<number>(42);

  const value = Option.isSome(option) ? option.value : 0;

  expectTypeOf(value).toEqualTypeOf<number>();
  expect(value).toBe(42);
});

test("定義元の外からは在／不在の判別子を読めない", () => {
  const option = Option.fromNullable<number>(42);

  // @ts-expect-error 判別子のキーは定義元の外から名前を持てない（TS2339）
  const discriminant = option.some;

  expect(discriminant).toBeUndefined();
});

test("定義元の外では値リテラルで不在を作れない", () => {
  // @ts-expect-error 判別子のキーは定義元の外から書けない（TS2353）
  const made: Option<number> = { some: false };

  expect(made).not.toEqual(Option.none);
});

test("在／不在の判別子のキーは定義元から持ち出せない", async () => {
  const exported = await import("../Option");

  // @ts-expect-error 判別子のキーは export しない（TS2339）
  expect(exported.SomeTag).toBeUndefined();
});

test("在／不在の判別子は文字列のキーとして現れない", () => {
  expectTypeOf<Extract<keyof Some<number>, string>>().toEqualTypeOf<"value">();
  expectTypeOf<Extract<keyof None, string>>().toEqualTypeOf<never>();
});
