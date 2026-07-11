import { test, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MatchScreen } from "../MatchScreen.tsx";
import { dealerTsumoState, drawState, ronState } from "../../__tests__/helpers.ts";

test("人間の手番でツモ和了できるときはツモボタンが表示される", () => {
  render(<MatchScreen initialGame={dealerTsumoState()} />);
  expect(screen.getByRole("button", { name: "ツモ" })).toBeInTheDocument();
});

test("ツモ和了すると成立役と翻数の一覧が表示される", () => {
  render(<MatchScreen initialGame={dealerTsumoState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));
  const yakuList = screen.getByTestId("yaku-list");
  expect(yakuList).toHaveTextContent("門前清自摸和");
  expect(yakuList).toHaveTextContent("平和");
});

test("ツモ和了すると翻と符が表示される", () => {
  render(<MatchScreen initialGame={dealerTsumoState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));
  expect(screen.getByTestId("result-han-fu")).toHaveTextContent("2翻20符");
});

test("ツモ和了すると和了者と種別・点数移動が表示される", () => {
  render(<MatchScreen initialGame={dealerTsumoState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));
  expect(screen.getByTestId("result-title")).toHaveTextContent("ツモ和了");
  expect(screen.getByTestId("result-winner")).toHaveTextContent("あなた");
  expect(screen.getByTestId("result-total")).toHaveTextContent("2,100点");
  const deltas = screen.getByTestId("point-deltas");
  expect(deltas).toHaveTextContent("+2,100");
  expect(deltas).toHaveTextContent("-700");
});

test("親の和了は連荘と表示される", () => {
  render(<MatchScreen initialGame={dealerTsumoState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));
  expect(screen.getByTestId("dealer-continues")).toHaveTextContent("連荘");
});

test("他家の打牌にロンできるときはロンとパスが選べる", () => {
  render(<MatchScreen initialGame={ronState()} />);
  expect(screen.getByRole("button", { name: "ロン" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "パス" })).toBeInTheDocument();
});

test("ロン和了すると和了者と放銃者が表示される", () => {
  render(<MatchScreen initialGame={ronState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ロン" }));
  expect(screen.getByTestId("result-title")).toHaveTextContent("ロン和了");
  expect(screen.getByTestId("result-winner")).toHaveTextContent("あなた");
  expect(screen.getByTestId("result-loser")).toHaveTextContent("CPU1");
});

test("子の和了は輪荘と表示される", () => {
  render(<MatchScreen initialGame={ronState()} />);
  fireEvent.click(screen.getByRole("button", { name: "ロン" }));
  expect(screen.getByTestId("dealer-continues")).toHaveTextContent("輪荘");
});

test("流局するとテンパイ・ノーテンの別が表示される", () => {
  render(<MatchScreen initialGame={drawState()} />);
  expect(screen.getByTestId("result-title")).toHaveTextContent("流局");
  const rows = within(screen.getByTestId("tenpai-list")).getAllByRole(
    "listitem",
  );
  expect(rows[0]).toHaveTextContent("テンパイ");
  expect(rows[1]).toHaveTextContent("ノーテン");
  expect(rows[2]).toHaveTextContent("ノーテン");
  expect(rows[3]).toHaveTextContent("ノーテン");
});

test("流局するとノーテン罰符の点数移動が表示される", () => {
  render(<MatchScreen initialGame={drawState()} />);
  const deltas = screen.getByTestId("point-deltas");
  expect(deltas).toHaveTextContent("+3,000");
  expect(deltas).toHaveTextContent("-1,000");
});
