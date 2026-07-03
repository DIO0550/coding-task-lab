import { test, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { MatchScreen } from "../index";

const renderPlayingScreen = (): void => {
  render(<MatchScreen />);
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
};

test("対戦開始すると東一局・0本場・供託0本が表示される", () => {
  renderPlayingScreen();
  expect(screen.getByTestId("table-round")).toHaveTextContent("東一局");
  expect(screen.getByTestId("table-honba")).toHaveTextContent("0本場");
  expect(screen.getByTestId("table-kyotaku")).toHaveTextContent("供託0本");
});

test("対戦開始直後は各家の持ち点が25,000点で表示される", () => {
  renderPlayingScreen();
  expect(screen.getByTestId("player-score-0")).toHaveTextContent("25,000点");
  expect(screen.getByTestId("player-score-1")).toHaveTextContent("25,000点");
  expect(screen.getByTestId("player-score-2")).toHaveTextContent("25,000点");
  expect(screen.getByTestId("player-score-3")).toHaveTextContent("25,000点");
});

test("持ち点30,000点開始を選ぶと各家30,000点で対戦が始まる", () => {
  render(<MatchScreen />);
  fireEvent.change(screen.getByLabelText("持ち点"), { target: { value: "30000" } });
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  expect(screen.getByTestId("player-score-0")).toHaveTextContent("30,000点");
  expect(screen.getByTestId("player-score-3")).toHaveTextContent("30,000点");
});

test("設定した表示名が対戦画面に反映される", () => {
  render(<MatchScreen />);
  fireEvent.change(
    screen.getAllByLabelText("表示名")[0],
    { target: { value: "山田" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  expect(screen.getByTestId("player-name-0")).toHaveTextContent("山田");
});

test("対戦開始直後は1席目のプレイヤーが親として表示される", () => {
  renderPlayingScreen();
  expect(screen.getByTestId("table-dealer")).toHaveTextContent("親: プレイヤー1");
  expect(screen.getByTestId("player-role-0")).toHaveTextContent("親");
  expect(screen.getByTestId("player-role-1")).toHaveTextContent("子");
});

test("各プレイヤーの風が東南西北の順で表示される", () => {
  renderPlayingScreen();
  expect(screen.getByTestId("player-wind-0")).toHaveTextContent("東");
  expect(screen.getByTestId("player-wind-1")).toHaveTextContent("南");
  expect(screen.getByTestId("player-wind-2")).toHaveTextContent("西");
  expect(screen.getByTestId("player-wind-3")).toHaveTextContent("北");
});

test("補助表示が開始状態の初期値で表示される", () => {
  renderPlayingScreen();
  expect(screen.getByTestId("aux-wall")).toHaveTextContent("70枚");
  expect(screen.getByTestId("aux-dora")).toBeInTheDocument();
  expect(screen.getByTestId("aux-river")).toHaveTextContent("なし");
  expect(screen.getByTestId("aux-melds")).toHaveTextContent("なし");
  expect(screen.getByTestId("aux-riichi")).toHaveTextContent("なし");
  expect(screen.getByTestId("aux-turn")).toHaveTextContent("プレイヤー1(親)");
});

test("操作アクションが全て表示され打牌のみ有効になっている", () => {
  renderPlayingScreen();
  expect(screen.getByRole("button", { name: "打牌" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "チー" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "ポン" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "カン" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "リーチ" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "ツモ" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "ロン" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "パス" })).toBeDisabled();
});

test("和了結果入力の項目が全て表示される", () => {
  renderPlayingScreen();
  expect(screen.getByLabelText("和了者")).toBeInTheDocument();
  expect(screen.getByLabelText("放銃者")).toBeInTheDocument();
  expect(screen.getByLabelText("和了種別")).toBeInTheDocument();
  expect(screen.getByLabelText("翻数")).toBeInTheDocument();
  expect(screen.getByLabelText("符")).toBeInTheDocument();
  expect(screen.getByTestId("win-honba")).toHaveTextContent("0本場");
  expect(screen.getByTestId("win-kyotaku")).toHaveTextContent("0本");
  expect(screen.getByTestId("win-dealer-continues")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "結果確定" })).toBeInTheDocument();
});
