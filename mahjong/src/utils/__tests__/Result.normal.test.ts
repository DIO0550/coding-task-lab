import { expect, test } from "vitest";
import { Result } from "../Result";

test("ok で生成した結果は成功として値を保持する", () => {
  const success = Result.ok(42);
  expect(Result.isOk(success) ? success.value : undefined).toBe(42);
});

test("err で生成した結果は失敗としてエラーを保持する", () => {
  const failure: Result<number, string> = Result.err("fail");
  expect(Result.isOk(failure) ? undefined : failure.error).toBe("fail");
});

test("map は成功値を変換した新しい成功結果を返す", () => {
  expect(Result.map(Result.ok(2), (v) => v * 3)).toEqual(Result.ok(6));
});

test("map は失敗をそのまま返す", () => {
  const failure: Result<number, string> = Result.err("fail");
  expect(Result.map(failure, (v: number) => v * 3)).toBe(failure);
});

test("flatMap は成功値に続く処理を連結できる", () => {
  const double = (n: number): Result<number, string> => Result.ok(n * 2);
  expect(Result.flatMap(Result.ok(5), double)).toEqual(Result.ok(10));
});

test("flatMap は失敗で短絡してそのまま返す", () => {
  const failure: Result<number, string> = Result.err("fail");
  const double = (n: number): Result<number, string> => Result.ok(n * 2);
  expect(Result.flatMap(failure, double)).toBe(failure);
});

test("flatMap は連結した処理の失敗を伝播する", () => {
  expect(Result.flatMap(Result.ok(5), () => Result.err("inner fail"))).toEqual(
    Result.err("inner fail"),
  );
});

test("unwrapOr は成功から値を取り出す", () => {
  expect(Result.unwrapOr(Result.ok(42), 0)).toBe(42);
});

test("unwrapOr は失敗に対してデフォルト値を返す", () => {
  expect(Result.unwrapOr(Result.err("fail"), 0)).toBe(0);
});

test("unwrap は成功から値を取り出す", () => {
  expect(Result.unwrap(Result.ok(42))).toBe(42);
});

test("unwrap は失敗に対して例外を投げる", () => {
  expect(() => Result.unwrap(Result.err("fail"))).toThrow("fail");
});

test("mapErr は失敗のエラーだけを変換する", () => {
  const result: Result<number, string> = Result.err("fail");
  expect(Result.mapErr(result, (error) => error.length)).toEqual(Result.err(4));
});

test("mapErr は成功の結果をそのまま返す", () => {
  const result: Result<number, string> = Result.ok(42);
  expect(Result.mapErr(result, (error: string) => error.length)).toEqual(
    Result.ok(42),
  );
});

test("isOk は成功なら true", () => {
  expect(Result.isOk(Result.ok(42))).toBe(true);
});

test("isOk は失敗なら false", () => {
  expect(Result.isOk(Result.err("fail"))).toBe(false);
});
