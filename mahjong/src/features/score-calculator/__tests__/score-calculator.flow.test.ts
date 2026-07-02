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

test("牌を選んで和了牌を指定し計算すると役と点数が表示される", () => {
  render(createElement(ScoreCalculator));

  // 仕様の入力例: 123m 456p 789s 東東東 + 5m単騎ロン(東場東家)
  pickFromPalette("一萬");
  pickFromPalette("二萬");
  pickFromPalette("三萬");
  pickFromPalette("四筒");
  pickFromPalette("五筒");
  pickFromPalette("六筒");
  pickFromPalette("七索");
  pickFromPalette("八索");
  pickFromPalette("九索");
  pickFromPalette("東", 3);
  pickFromPalette("五萬", 2);

  const winTileSection = screen.getByRole("region", { name: "和了牌の選択" });
  fireEvent.click(within(winTileSection).getByRole("button", { name: "五萬" }));

  fireEvent.click(screen.getByRole("button", { name: "計算する" }));

  const result = screen.getByRole("region", { name: "計算結果" });
  expect(within(result).getByText("自風牌")).toBeInTheDocument();
  expect(within(result).getByText("場風牌")).toBeInTheDocument();
  expect(within(result).getByText("2翻 40符")).toBeInTheDocument();
  expect(within(result).getByText("3900点")).toBeInTheDocument();
  expect(within(result).getByText("放銃者: 3900点")).toBeInTheDocument();
});

test("和了形でない手を計算するとエラーメッセージが表示される", () => {
  render(createElement(ScoreCalculator));

  pickFromPalette("一萬");
  pickFromPalette("二萬");
  pickFromPalette("三萬");
  pickFromPalette("四筒");
  pickFromPalette("五筒");
  pickFromPalette("六筒");
  pickFromPalette("七索");
  pickFromPalette("八索");
  pickFromPalette("九索");
  pickFromPalette("東", 2);
  pickFromPalette("南");
  pickFromPalette("西");
  pickFromPalette("北");

  const winTileSection = screen.getByRole("region", { name: "和了牌の選択" });
  fireEvent.click(within(winTileSection).getByRole("button", { name: "北" }));
  fireEvent.click(screen.getByRole("button", { name: "計算する" }));

  expect(screen.getByRole("alert")).toHaveTextContent("和了形ではありません");
});

test("副露モードで基準牌を選ぶと副露が追加され手牌の上限が減る", () => {
  render(createElement(ScoreCalculator));

  fireEvent.click(screen.getByRole("radio", { name: "副露" }));
  fireEvent.change(screen.getByRole("combobox", { name: "副露の種類" }), {
    target: { value: "chi" },
  });
  pickFromPalette("三筒");

  const meldSection = screen.getByRole("region", { name: "副露" });
  expect(within(meldSection).getByText("チー")).toBeInTheDocument();
  expect(
    within(meldSection).getByText("三筒・四筒・五筒"),
  ).toBeInTheDocument();

  const handSection = screen.getByRole("region", { name: "手牌" });
  expect(within(handSection).getByText("0 / 11 枚(和了牌を含む)"))
    .toBeInTheDocument();
});

test("クリアすると入力と結果が初期状態に戻る", () => {
  render(createElement(ScoreCalculator));

  pickFromPalette("一萬", 2);
  const winTileSection = screen.getByRole("region", { name: "和了牌の選択" });
  fireEvent.click(within(winTileSection).getByRole("button", { name: "一萬" }));
  fireEvent.click(screen.getByRole("button", { name: "計算する" }));
  expect(screen.getByRole("alert")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "クリア" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  const handSection = screen.getByRole("region", { name: "手牌" });
  expect(
    within(handSection).getByText("パレットから牌を追加してください"),
  ).toBeInTheDocument();
});
