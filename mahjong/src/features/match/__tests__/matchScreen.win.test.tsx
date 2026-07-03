import { test, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { MatchScreen } from "../index";

const renderPlayingScreen = (): void => {
  render(<MatchScreen />);
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
};

test("親が40符2翻でロンすると放銃者から3,900点が移動し本場が1増える", () => {
  renderPlayingScreen();
  fireEvent.change(screen.getByLabelText("和了者"), { target: { value: "0" } });
  fireEvent.change(screen.getByLabelText("和了種別"), { target: { value: "ron" } });
  fireEvent.change(screen.getByLabelText("放銃者"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("翻数"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("符"), { target: { value: "40" } });
  fireEvent.click(screen.getByRole("button", { name: "結果確定" }));
  expect(screen.getByTestId("player-score-0")).toHaveTextContent("28,900点");
  expect(screen.getByTestId("player-score-1")).toHaveTextContent("21,100点");
  expect(screen.getByTestId("table-honba")).toHaveTextContent("1本場");
  expect(screen.getByTestId("table-round")).toHaveTextContent("東一局");
  expect(screen.getByTestId("table-dealer")).toHaveTextContent("親: プレイヤー1");
});

test("子が30符3翻でツモすると親から2,000点・他の子から1,000点ずつ移動する", () => {
  renderPlayingScreen();
  fireEvent.change(screen.getByLabelText("和了者"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("和了種別"), { target: { value: "tsumo" } });
  fireEvent.change(screen.getByLabelText("翻数"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("符"), { target: { value: "30" } });
  fireEvent.click(screen.getByRole("button", { name: "結果確定" }));
  expect(screen.getByTestId("player-score-0")).toHaveTextContent("23,000点");
  expect(screen.getByTestId("player-score-1")).toHaveTextContent("29,000点");
  expect(screen.getByTestId("player-score-2")).toHaveTextContent("24,000点");
  expect(screen.getByTestId("player-score-3")).toHaveTextContent("24,000点");
});

test("子が和了すると次局へ進み親が次のプレイヤーへ移り本場が0に戻る", () => {
  renderPlayingScreen();
  fireEvent.change(screen.getByLabelText("和了者"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("和了種別"), { target: { value: "tsumo" } });
  fireEvent.click(screen.getByRole("button", { name: "結果確定" }));
  expect(screen.getByTestId("table-round")).toHaveTextContent("東二局");
  expect(screen.getByTestId("table-dealer")).toHaveTextContent("親: プレイヤー2");
  expect(screen.getByTestId("table-honba")).toHaveTextContent("0本場");
  expect(screen.getByTestId("player-role-1")).toHaveTextContent("親");
  expect(screen.getByTestId("player-wind-1")).toHaveTextContent("東");
});

test("和了種別でツモを選ぶと放銃者が選択できなくなる", () => {
  renderPlayingScreen();
  expect(screen.getByLabelText("放銃者")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("和了種別"), { target: { value: "tsumo" } });
  expect(screen.getByLabelText("放銃者")).toBeDisabled();
});

test("和了者に親を選ぶと親継続があり(連荘)と表示される", () => {
  renderPlayingScreen();
  fireEvent.change(screen.getByLabelText("和了者"), { target: { value: "0" } });
  expect(screen.getByTestId("win-dealer-continues")).toHaveTextContent("あり(連荘)");
  fireEvent.change(screen.getByLabelText("和了者"), { target: { value: "2" } });
  expect(screen.getByTestId("win-dealer-continues")).toHaveTextContent("なし(親交代)");
});
