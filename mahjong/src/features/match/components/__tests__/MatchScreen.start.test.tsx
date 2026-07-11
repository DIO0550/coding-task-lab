import { test, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MatchScreen } from "../MatchScreen.tsx";

const startMatch = () => {
  render(<MatchScreen seed={42} />);
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
};

test("対戦開始すると人間(親)の手牌がツモ牌込みで14枚表示される", () => {
  startMatch();
  const hand = within(screen.getByTestId("player-0")).getByTestId("hand");
  const tiles = within(hand).getAllByTestId("hand-tile");
  expect(tiles).toHaveLength(14);
});

test("対戦開始すると人間のツモ牌が区別されて表示される", () => {
  startMatch();
  const hand = within(screen.getByTestId("player-0")).getByTestId("hand");
  const drawnTiles = within(hand)
    .getAllByTestId("hand-tile")
    .filter((tile) => tile.getAttribute("data-drawn") === "true");
  expect(drawnTiles).toHaveLength(1);
});

test("対戦開始するとCPUの手牌は伏せられ枚数のみ表示される", () => {
  startMatch();
  const hidden = within(screen.getByTestId("player-1")).getByTestId(
    "hidden-hand",
  );
  expect(within(hidden).getAllByTestId("hidden-tile")).toHaveLength(13);
  expect(hidden).toHaveTextContent("13枚");
});

test("対戦開始すると残り山枚数が表示される(親の第1ツモ後で69枚)", () => {
  startMatch();
  expect(screen.getByTestId("wall-remaining")).toHaveTextContent("残り山69枚");
});

test("対戦開始するとドラ表示牌が1枚表示される", () => {
  startMatch();
  expect(screen.getAllByTestId("dora-indicator")).toHaveLength(1);
});

test("対戦開始すると設定パネルは表示されなくなる", () => {
  startMatch();
  expect(screen.queryByTestId("setup-panel")).toBeNull();
});

test("持ち点30,000点開始を選んで対戦開始すると各家30,000点で始まる", () => {
  render(<MatchScreen seed={42} />);
  fireEvent.change(screen.getByLabelText("持ち点"), {
    target: { value: "30000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  const points = within(screen.getByTestId("player-0")).getByTestId("points");
  expect(points).toHaveTextContent("30,000点");
});
