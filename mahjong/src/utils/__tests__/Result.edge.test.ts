import { expect, test, vi } from "vitest";
import { Result } from "../Result";

test.each([
  [0],
  [false],
  [""],
])("falsy な値 %j でも ok は成功として扱う", (value) => {
  const success = Result.ok(value);
  expect(Result.isOk(success) ? success.value : undefined).toBe(value);
});

test("unwrapOr は falsy な成功値 0 をデフォルト値で上書きしない", () => {
  expect(Result.unwrapOr(Result.ok(0), 1)).toBe(0);
});

test("unwrap は falsy な成功値 0 をそのまま取り出す", () => {
  expect(Result.unwrap(Result.ok(0))).toBe(0);
});

test("map は失敗に対して変換関数を実行しない", () => {
  const failure: Result<number, string> = Result.err("fail");
  const result = Result.map(failure, () => {
    throw new Error("実行されないはず");
  });
  expect(result).toBe(failure);
});

test("flatMap は失敗に対して連結処理を実行しない", () => {
  const failure: Result<number, string> = Result.err("fail");
  const result = Result.flatMap(failure, () => {
    throw new Error("実行されないはず");
  });
  expect(result).toBe(failure);
});

test("map の変換関数が例外を投げた場合はそのまま伝播する", () => {
  const error = new Error("test error");
  expect(() =>
    Result.map(Result.ok(1), () => {
      throw error;
    }),
  ).toThrow(error);
});

test("ok で生成した結果は凍結されていて変更できない", () => {
  expect(Object.isFrozen(Result.ok(42))).toBe(true);
});

test("err で生成した結果は凍結されていて変更できない", () => {
  expect(Object.isFrozen(Result.err("fail"))).toBe(true);
});

test("値が undefined の成功と失敗は、比べると別物になる", () => {
  // 値も中身も undefined だと判別子しか違わないので、比較が判別子を見なくなる
  // （キーを非列挙にする等）とここが等しくなる。
  expect(Result.ok(undefined)).not.toEqual(Result.err(undefined));
});

test("定義元が評価し直されても、それ以前に作った値を判定できる", async () => {
  const before = await import("../Result");
  const old = before.Result.ok(1);

  vi.resetModules();
  const after = await import("../Result");

  expect(after.Result).not.toBe(before.Result);
  expect(after.Result.isOk(old)).toBe(true);
});
