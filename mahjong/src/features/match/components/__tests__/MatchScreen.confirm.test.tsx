import { test, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MatchScreen } from "../MatchScreen.tsx";
import { dealerTsumoState, ronState, tobiRonState } from "../../__tests__/helpers.ts";

const playerPoints = (seat: number) =>
  within(screen.getByTestId(`player-${seat}`)).getByTestId("points");

test("親のツモ和了を確定すると持ち点に反映され本場が増える(連荘)", () => {
  render(<MatchScreen initialGame={dealerTsumoState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));
  fireEvent.click(screen.getByRole("button", { name: "確定(次局へ)" }));
  expect(screen.getByTestId("kyoku")).toHaveTextContent("東一局");
  expect(screen.getByTestId("honba")).toHaveTextContent("1本場");
  expect(playerPoints(0)).toHaveTextContent("27,100点");
  expect(playerPoints(1)).toHaveTextContent("24,300点");
});

test("子のロン和了を確定すると次局(東二局)へ進み親が移る", () => {
  render(<MatchScreen initialGame={ronState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ロン" }));
  fireEvent.click(screen.getByRole("button", { name: "確定(次局へ)" }));
  expect(screen.getByTestId("kyoku")).toHaveTextContent("東二局");
  expect(screen.getByTestId("honba")).toHaveTextContent("0本場");
  expect(
    within(screen.getByTestId("player-1")).getByTestId("dealer-role"),
  ).toHaveTextContent("親");
});

test("子のロン和了を確定すると全席の持ち点表示が更新される", () => {
  render(<MatchScreen initialGame={ronState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ロン" }));
  fireEvent.click(screen.getByRole("button", { name: "確定(次局へ)" }));
  expect(playerPoints(0)).toHaveTextContent("24,000点");
  expect(playerPoints(1)).toHaveTextContent("26,000点");
  expect(playerPoints(2)).toHaveTextContent("25,000点");
  expect(playerPoints(3)).toHaveTextContent("25,000点");
});

test("確定すると結果表示は閉じて次局の卓に戻る", () => {
  render(<MatchScreen initialGame={ronState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ロン" }));
  fireEvent.click(screen.getByRole("button", { name: "確定(次局へ)" }));
  expect(screen.queryByTestId("result-panel")).toBeNull();
});

test("トビが発生した和了を確定すると最終順位が表示される", () => {
  render(<MatchScreen initialGame={tobiRonState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ロン" }));
  fireEvent.click(screen.getByRole("button", { name: "確定(次局へ)" }));
  const rows = screen.getAllByTestId("ranking-row");
  expect(screen.getByTestId("ranking-panel")).toBeInTheDocument();
  expect(rows[0]).toHaveTextContent("1位 あなた");
  expect(rows[0]).toHaveTextContent("1,500点");
  expect(rows[3]).toHaveTextContent("4位 CPU1");
});
