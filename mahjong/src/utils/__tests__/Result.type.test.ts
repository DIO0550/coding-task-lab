import { expect, expectTypeOf, test } from "vitest";
import { type Err, type Ok, Result } from "../Result";

/*
 * 絞り込みが効くことを固定する（`rules/coding.md`「型レベルの保証が仕様の一部であるとき
 * は `expectTypeOf` で退行を検知する」）。効かなくなると `isOk` は真偽を答えるだけの関数に
 * なり、通した先で `value` も `error` も読めなくなる。
 *
 * 結果を関数越しに受けるのは、`const result: Result<number, string> = Result.ok(42);` と
 * 書くと初期化子の型で絞り込まれてしまい、`isOk` が絞り込まなくても `value` が読めるため。
 */
function decoded(succeeds: boolean): Result<number, string> {
  return succeeds ? Result.ok(42) : Result.err("fail");
}

test("isOk が真の側では成功値を読める型に絞られる", () => {
  const result = decoded(true);

  const value = Result.isOk(result) ? result.value : 0;

  expectTypeOf(value).toEqualTypeOf<number>();
  expect(value).toBe(42);
});

test("isOk が偽の側では失敗のエラーを読める型に絞られる", () => {
  const result = decoded(false);

  const error = Result.isOk(result) ? "" : result.error;

  expectTypeOf(error).toEqualTypeOf<string>();
  expect(error).toBe("fail");
});

test("定義元の外からは成否の判別子を読めない", () => {
  const result = decoded(true);

  // @ts-expect-error 判別子のキーは定義元の外から名前を持てない（TS2339）
  const discriminant = result.ok;

  expect(discriminant).toBeUndefined();
});

test("定義元の外では値リテラルで結果を作れない", () => {
  // @ts-expect-error 判別子のキーは定義元の外から書けない（TS2353）
  const made: Result<number, string> = { ok: true, value: 42 };

  expect(made).not.toEqual(Result.ok(42));
});

test("成否の判別子のキーは定義元から持ち出せない", async () => {
  const exported = await import("../Result");

  // @ts-expect-error 判別子のキーは export しない（TS2339）
  expect(exported.OkTag).toBeUndefined();
});

test("成否の判別子は文字列のキーとして現れない", () => {
  expectTypeOf<Extract<keyof Ok<number>, string>>().toEqualTypeOf<"value">();
  expectTypeOf<Extract<keyof Err<string>, string>>().toEqualTypeOf<"error">();
});
