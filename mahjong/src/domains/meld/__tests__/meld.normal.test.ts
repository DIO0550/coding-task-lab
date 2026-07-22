import { expect, test } from "vitest";
import { Meld } from "../index";

test("副露の生成と入力形式変換が正しく動作する", () => {
  const input = { type: "chi" as const, tiles: ["1m", "2m", "3m"] };
  const meld = Meld.fromInput(input);

  expect(meld.type).toBe("chi");
  expect(Meld.isOpen(meld)).toBe(true);
  expect(Meld.toInput(meld)).toEqual(input);
});

test("暗槓は門前として判定される", () => {
  const meld = Meld.fromInput({ type: "ankan", tiles: ["ton", "ton", "ton", "ton"] });
  expect(Meld.isConcealed(meld)).toBe(true);
  expect(Meld.isOpen(meld)).toBe(false);
});
