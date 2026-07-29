import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Tile } from "../../../../../domains/tile/index.ts";
import { TableInfo } from "../index.ts";

const tilesOf = (codes: readonly string[]): readonly Tile[] =>
  Tile.fromCodes(codes) as readonly Tile[];

const renderInitialTable = () =>
  render(
    <TableInfo
      roundWind="ton"
      roundNumber={1}
      honba={0}
      riichiSticks={0}
      remaining={70}
      doraIndicators={tilesOf(["5s"])}
      dealerName="あなた"
    />,
  );

test("対戦開始直後は東一局と表示される", () => {
  renderInitialTable();
  expect(screen.getByText("東一局")).toBeInTheDocument();
});

test("対戦開始直後は0本場と表示される", () => {
  renderInitialTable();
  expect(screen.getByText("0本場")).toBeInTheDocument();
});

test("対戦開始直後は供託0本と表示される", () => {
  renderInitialTable();
  expect(screen.getByText("供託0本")).toBeInTheDocument();
});

test("残りの山枚数が表示される", () => {
  renderInitialTable();
  expect(screen.getByText("残り70枚")).toBeInTheDocument();
});

test("親のプレイヤー名が表示される", () => {
  renderInitialTable();
  expect(screen.getByText("親: あなた")).toBeInTheDocument();
});

test("ドラ表示牌が表示される", () => {
  renderInitialTable();
  expect(screen.getByLabelText("五索")).toBeInTheDocument();
});

test("局が進むと南四局と表示される", () => {
  render(
    <TableInfo
      roundWind="nan"
      roundNumber={4}
      honba={2}
      riichiSticks={1}
      remaining={0}
      doraIndicators={tilesOf(["1m", "ton"])}
      dealerName="CPU上家"
    />,
  );
  expect(screen.getByText("南四局")).toBeInTheDocument();
  expect(screen.getByText("2本場")).toBeInTheDocument();
  expect(screen.getByText("供託1本")).toBeInTheDocument();
});

test("カンでドラ表示牌が増えるとすべて表示される", () => {
  render(
    <TableInfo
      roundWind="ton"
      roundNumber={1}
      honba={0}
      riichiSticks={0}
      remaining={60}
      doraIndicators={tilesOf(["5s", "ton"])}
      dealerName="あなた"
    />,
  );
  const indicators = screen.getByRole("list", { name: "ドラ表示牌" });
  expect(indicators).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});
