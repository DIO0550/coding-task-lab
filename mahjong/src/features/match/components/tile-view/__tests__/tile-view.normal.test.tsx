import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Tile } from "../../../../../domains/tile/index.ts";
import { TileView } from "../index.ts";

const tileOf = (code: string): Tile => Tile.fromCode(code) as Tile;

test.each([
  ["3m", "三萬"],
  ["7p", "七筒"],
  ["2s", "二索"],
  ["ton", "東"],
  ["haku", "白"],
])("牌 %s は牌名 %s で読み取れる", (code, expected) => {
  render(<TileView tile={tileOf(code)} />);
  expect(screen.getByLabelText(expected)).toBeInTheDocument();
});

test("赤ドラは赤五筒として区別して表示される", () => {
  render(<TileView tile={tileOf("0p")} />);
  expect(screen.getByLabelText("赤五筒")).toBeInTheDocument();
});

test("数牌は数字と種類が表面に表示される", () => {
  render(<TileView tile={tileOf("3m")} />);
  const tile = screen.getByLabelText("三萬");
  expect(tile).toHaveTextContent("3");
  expect(tile).toHaveTextContent("萬");
});

test("操作できない牌はボタンとして表示されない", () => {
  render(<TileView tile={tileOf("3m")} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("操作できる牌を押すと選択が通知される", () => {
  const onClick = vi.fn();
  render(<TileView tile={tileOf("3m")} state="selectable" onClick={onClick} />);
  fireEvent.click(screen.getByRole("button", { name: "三萬" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("選べない牌は押しても選択が通知されない", () => {
  const onClick = vi.fn();
  render(<TileView tile={tileOf("3m")} state="disabled" onClick={onClick} />);
  fireEvent.click(screen.getByRole("button", { name: "三萬" }));
  expect(onClick).not.toHaveBeenCalled();
});

test("補足を付けた牌は牌名と一緒に補足も読み取れる", () => {
  render(<TileView tile={tileOf("3m")} label="ツモ牌" />);
  expect(screen.getByLabelText("三萬(ツモ牌)")).toBeInTheDocument();
});

test("裏向きの牌は牌の内容が読み取れない", () => {
  render(<TileView.Back />);
  expect(screen.getByLabelText("裏向きの牌")).toBeInTheDocument();
});
