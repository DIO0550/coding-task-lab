import { test, expect } from "vitest";
import { calculateInput } from "../calc.ts";

test("空入力は invalid_input を返す", () => {
  expect(calculateInput("")).toStrictEqual({
    valid: false,
    reason: "invalid_input",
  });
});
