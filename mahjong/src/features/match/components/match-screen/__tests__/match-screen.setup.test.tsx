import { fireEvent, render, screen, within } from "@testing-library/react";
import { test, expect } from "vitest";

import { MatchScreen } from "..";

test("対戦開始設定(プレイヤー設定・ルール設定・対戦開始ボタン)が表示される", () => {
  render(<MatchScreen />);
  expect(screen.getByRole("heading", { name: "対戦開始設定" })).toBeInTheDocument();
  expect(screen.getByText("プレイヤー設定")).toBeInTheDocument();
  expect(screen.getByText("ルール設定")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "対戦開始" })).toBeInTheDocument();
});

test("初期構成は東家が人間、南家・西家・北家が標準CPUになっている", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("東家の操作種別")).toHaveValue("human");
  expect(screen.getByLabelText("南家の操作種別")).toHaveValue("cpu");
  expect(screen.getByLabelText("南家のCPUレベル")).toHaveValue("standard");
  expect(screen.queryByLabelText("東家のCPUレベル")).not.toBeInTheDocument();
});

test("各席で人間/CPUを切り替え、CPUのときだけ入門/標準/上級のレベルを選べる", () => {
  render(<MatchScreen />);
  fireEvent.change(screen.getByLabelText("南家の操作種別"), { target: { value: "human" } });
  expect(screen.queryByLabelText("南家のCPUレベル")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("西家のCPUレベル"), { target: { value: "advanced" } });
  expect(screen.getByLabelText("西家のCPUレベル")).toHaveValue("advanced");
  const levelOptions = within(screen.getByLabelText("北家のCPUレベル")).getAllByRole("option");
  expect(levelOptions.map((option) => option.textContent)).toStrictEqual(["入門", "標準", "上級"]);
});

test("表示名を編集すると卓のプレイヤー表示に反映される", () => {
  render(<MatchScreen />);
  fireEvent.change(screen.getByLabelText("東家の表示名"), { target: { value: "太郎" } });
  expect(screen.getByRole("region", { name: "東家 太郎" })).toBeInTheDocument();
});

test("東風戦/半荘戦・持ち点・返し点・喰いタン・後付け・赤ドラ・CPU自動和了のルール設定が初期値付きで表示される", () => {
  render(<MatchScreen />);
  const gameLength = screen.getByLabelText("対戦形式");
  expect(within(gameLength).getAllByRole("option").map((option) => option.textContent)).toStrictEqual(["東風戦", "半荘戦"]);
  expect(gameLength).toHaveValue("hanchan");
  expect(screen.getByLabelText("持ち点")).toHaveValue("25000");
  expect(screen.getByLabelText("返し点")).toHaveValue("30000");
  expect(screen.getByLabelText("喰いタン")).toHaveValue("on");
  expect(screen.getByLabelText("後付け")).toHaveValue("on");
  expect(screen.getByLabelText("赤ドラ")).toHaveValue("on");
  expect(screen.getByLabelText("CPU自動和了")).toHaveValue("on");
});

test("対戦開始前の卓は東一局・0本場・供託0本で、各家25,000点と親が東家であることを表示する", () => {
  render(<MatchScreen />);
  expect(screen.getByText("東一局")).toBeInTheDocument();
  expect(screen.getByText("0本場")).toBeInTheDocument();
  expect(screen.getByText("供託0本")).toBeInTheDocument();
  expect(screen.getAllByText("25,000点")).toHaveLength(4);
  expect(within(screen.getByTestId("seat-panel-0")).getByText("親")).toBeInTheDocument();
  expect(within(screen.getByTestId("seat-panel-1")).getByText("子")).toBeInTheDocument();
  expect(screen.getByText("親: 東家 あなた")).toBeInTheDocument();
});

test("持ち点を30,000点開始にすると各家の表示が30,000点になる", () => {
  render(<MatchScreen />);
  fireEvent.change(screen.getByLabelText("持ち点"), { target: { value: "30000" } });
  expect(screen.getAllByText("30,000点", { selector: "span" })).toHaveLength(4);
});
