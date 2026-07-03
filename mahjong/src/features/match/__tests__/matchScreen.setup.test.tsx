import { test, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { MatchScreen } from "../index";

test("対戦開始設定の見出しと対戦開始ボタンが表示される", () => {
  render(<MatchScreen />);
  expect(screen.getByRole("heading", { name: "対戦開始設定" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "対戦開始" })).toBeInTheDocument();
});

test("4席分のプレイヤー設定が既定の表示名で表示される", () => {
  render(<MatchScreen />);
  expect(within(screen.getByTestId("player-setup-0")).getByLabelText("表示名")).toHaveValue(
    "プレイヤー1",
  );
  expect(within(screen.getByTestId("player-setup-1")).getByLabelText("表示名")).toHaveValue(
    "プレイヤー2",
  );
  expect(within(screen.getByTestId("player-setup-2")).getByLabelText("表示名")).toHaveValue(
    "プレイヤー3",
  );
  expect(within(screen.getByTestId("player-setup-3")).getByLabelText("表示名")).toHaveValue(
    "プレイヤー4",
  );
});

test("操作種別で人間とCPUを選択できる", () => {
  render(<MatchScreen />);
  const typeSelect = within(screen.getByTestId("player-setup-0")).getByLabelText("操作種別");
  expect(typeSelect).toHaveValue("human");
  expect(within(typeSelect).getByRole("option", { name: "人間" })).toBeInTheDocument();
  expect(within(typeSelect).getByRole("option", { name: "CPU" })).toBeInTheDocument();
  fireEvent.change(typeSelect, { target: { value: "cpu" } });
  expect(typeSelect).toHaveValue("cpu");
});

test("CPUの席ではCPUレベルとして入門・標準・上級を選択できる", () => {
  render(<MatchScreen />);
  const levelSelect = within(screen.getByTestId("player-setup-1")).getByLabelText("CPUレベル");
  const optionLabels = within(levelSelect)
    .getAllByRole("option")
    .map((option) => option.textContent);
  expect(optionLabels).toStrictEqual(["入門", "標準", "上級"]);
  fireEvent.change(levelSelect, { target: { value: "advanced" } });
  expect(levelSelect).toHaveValue("advanced");
});

test("人間の席にはCPUレベルの選択が表示されない", () => {
  render(<MatchScreen />);
  expect(
    within(screen.getByTestId("player-setup-0")).queryByLabelText("CPUレベル"),
  ).not.toBeInTheDocument();
});

test("表示名を入力して変更できる", () => {
  render(<MatchScreen />);
  const nameInput = within(screen.getByTestId("player-setup-0")).getByLabelText("表示名");
  fireEvent.change(nameInput, { target: { value: "山田" } });
  expect(nameInput).toHaveValue("山田");
});

test("対戦形式は東風戦と半荘戦から選べて初期値は半荘戦になっている", () => {
  render(<MatchScreen />);
  const select = screen.getByLabelText("対戦形式");
  expect(within(select).getByRole("option", { name: "東風戦" })).toBeInTheDocument();
  expect(within(select).getByRole("option", { name: "半荘戦" })).toBeInTheDocument();
  expect(select).toHaveValue("hanchan");
});

test("持ち点の初期値は25,000点開始になっている", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("持ち点")).toHaveValue("25000");
});

test("返し点の初期値は30,000点になっている", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("返し点")).toHaveValue("30000");
});

test("喰いタンの初期値はありになっている", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("喰いタン")).toHaveValue("on");
});

test("後付けの初期値はありになっている", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("後付け")).toHaveValue("on");
});

test("赤ドラの初期値はありになっている", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("赤ドラ")).toHaveValue("on");
});

test("CPU自動和了の初期値はありになっている", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("CPU自動和了")).toHaveValue("on");
});
