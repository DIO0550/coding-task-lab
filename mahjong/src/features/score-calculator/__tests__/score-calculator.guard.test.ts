import { test, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { createElement } from "react";

import { ScoreCalculator } from "../index.ts";

const palette = () => screen.getByRole("region", { name: "牌パレット" });

const pickFromPalette = (name: string, times = 1) => {
  const button = within(palette()).getByRole("button", { name });
  for (let i = 0; i < times; i += 1) {
    fireEvent.click(button);
  }
};

const handTiles = () =>
  within(screen.getByRole("region", { name: "手牌" })).queryAllByRole(
    "button",
  );

test("同種の牌は4枚までしか手牌に追加できない", () => {
  render(createElement(ScoreCalculator));

  pickFromPalette("東", 5);

  expect(handTiles()).toHaveLength(4);
});

test("和了牌を選ばないと計算ボタンは押せない", () => {
  render(createElement(ScoreCalculator));

  expect(screen.getByRole("button", { name: "計算する" })).toBeDisabled();

  pickFromPalette("一萬");
  expect(screen.getByRole("button", { name: "計算する" })).toBeDisabled();

  const winTileSection = screen.getByRole("region", { name: "和了牌の選択" });
  fireEvent.click(within(winTileSection).getByRole("button", { name: "一萬" }));
  expect(screen.getByRole("button", { name: "計算する" })).toBeEnabled();
});

test("和了牌に選んだ牌を手牌から削除すると選択が解除される", () => {
  render(createElement(ScoreCalculator));

  pickFromPalette("一萬");
  const winTileSection = screen.getByRole("region", { name: "和了牌の選択" });
  fireEvent.click(within(winTileSection).getByRole("button", { name: "一萬" }));
  expect(screen.getByRole("button", { name: "計算する" })).toBeEnabled();

  fireEvent.click(handTiles()[0]);

  expect(screen.getByRole("button", { name: "計算する" })).toBeDisabled();
});

test("リーチなしでは一発と裏ドラを指定できない", () => {
  render(createElement(ScoreCalculator));

  expect(screen.getByRole("checkbox", { name: "一発" })).toBeDisabled();
  expect(screen.getByRole("radio", { name: "裏ドラ" })).toBeDisabled();

  fireEvent.change(screen.getByRole("combobox", { name: "リーチ" }), {
    target: { value: "riichi" },
  });

  expect(screen.getByRole("checkbox", { name: "一発" })).toBeEnabled();
  expect(screen.getByRole("radio", { name: "裏ドラ" })).toBeEnabled();
});

test("リーチを取り消すと一発と裏ドラの入力もリセットされる", () => {
  render(createElement(ScoreCalculator));

  fireEvent.change(screen.getByRole("combobox", { name: "リーチ" }), {
    target: { value: "riichi" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "一発" }));
  fireEvent.click(screen.getByRole("radio", { name: "裏ドラ" }));
  pickFromPalette("五筒");

  const doraSection = screen.getByRole("region", { name: "ドラ表示" });
  expect(
    within(doraSection).getByRole("button", { name: "五筒" }),
  ).toBeInTheDocument();

  fireEvent.change(screen.getByRole("combobox", { name: "リーチ" }), {
    target: { value: "none" },
  });

  expect(screen.getByRole("checkbox", { name: "一発" })).not.toBeChecked();
  expect(
    within(doraSection).queryByRole("button", { name: "五筒" }),
  ).not.toBeInTheDocument();
});
