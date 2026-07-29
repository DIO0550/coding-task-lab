import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Tile } from "../../../../../domains/tile/index.ts";
import { HandView } from "../index.ts";

const HAND_CODES: readonly string[] = [
  "1m",
  "2m",
  "3m",
  "4p",
  "5p",
  "6p",
  "7s",
  "8s",
  "9s",
  "ton",
  "ton",
  "nan",
  "nan",
  "chun",
];

const setupHand = (): readonly Tile[] =>
  Tile.fromCodes(HAND_CODES) as readonly Tile[];

test("手牌の枚数だけ牌が表示される", () => {
  render(
    <HandView tiles={setupHand()} drawn={null} selectableIndexes={[]} />,
  );
  expect(screen.getAllByRole("img")).toHaveLength(14);
});

test("ツモ牌は手牌と区別して表示される", () => {
  const tiles = setupHand();
  render(
    <HandView tiles={tiles} drawn={tiles[13]} selectableIndexes={[]} />,
  );
  expect(screen.getByLabelText("中(ツモ牌)")).toBeInTheDocument();
});

test("選択できる位置の牌だけが操作できる", () => {
  const tiles = setupHand();
  render(
    <HandView
      tiles={tiles}
      drawn={tiles[13]}
      selectableIndexes={[0, 13]}
      onSelectTile={vi.fn()}
    />,
  );
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "一萬" })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "中(ツモ牌)" }),
  ).toBeInTheDocument();
});

test("選択できない牌は押せない", () => {
  const tiles = setupHand();
  render(
    <HandView
      tiles={tiles}
      drawn={tiles[13]}
      selectableIndexes={[0]}
      onSelectTile={vi.fn()}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "二萬" }),
  ).not.toBeInTheDocument();
});

test("牌を押すとその位置が通知される", () => {
  const tiles = setupHand();
  const onSelectTile = vi.fn();
  render(
    <HandView
      tiles={tiles}
      drawn={tiles[13]}
      selectableIndexes={[0, 13]}
      onSelectTile={onSelectTile}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "一萬" }));
  expect(onSelectTile).toHaveBeenCalledWith(0);
});

test("ツモ牌を押すとツモ牌の位置が通知される", () => {
  const tiles = setupHand();
  const onSelectTile = vi.fn();
  render(
    <HandView
      tiles={tiles}
      drawn={tiles[13]}
      selectableIndexes={[13]}
      onSelectTile={onSelectTile}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "中(ツモ牌)" }));
  expect(onSelectTile).toHaveBeenCalledWith(13);
});

test("裏向きの手牌は牌の内容が分からず枚数だけ表示される", () => {
  render(
    <HandView
      tiles={setupHand().slice(0, 13)}
      drawn={null}
      selectableIndexes={[]}
      concealed
    />,
  );
  expect(screen.getAllByLabelText("裏向きの牌")).toHaveLength(13);
  expect(screen.queryByLabelText("一萬")).not.toBeInTheDocument();
});
