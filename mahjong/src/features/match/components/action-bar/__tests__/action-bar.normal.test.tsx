import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Tile } from "../../../../../domains/tile/index.ts";
import { GameAction } from "../../../../../services/game/action/index.ts";
import { ActionBar } from "../index.ts";

const tilesOf = (codes: readonly string[]): readonly Tile[] =>
  Tile.fromCodes(codes) as readonly Tile[];

test("選べる行動だけがボタンとして表示される", () => {
  render(
    <ActionBar
      actions={[GameAction.ron(), GameAction.pass()]}
      onAction={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "ロン" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "パス" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "ツモ" })).not.toBeInTheDocument();
});

test("打牌は手牌から選ぶため操作ボタンには出ない", () => {
  render(
    <ActionBar
      actions={[GameAction.discard(0), GameAction.discard(1)]}
      onAction={vi.fn()}
    />,
  );
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});

test("ツモを押すとツモの行動が通知される", () => {
  const onAction = vi.fn();
  render(<ActionBar actions={[GameAction.tsumo()]} onAction={onAction} />);
  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));
  expect(onAction).toHaveBeenCalledWith({ type: "tsumo" });
});

test("リーチは打牌の候補が複数あっても1つのボタンにまとまる", () => {
  render(
    <ActionBar
      actions={[
        GameAction.riichi(2),
        GameAction.riichi(5),
        GameAction.riichi(9),
      ]}
      onAction={vi.fn()}
    />,
  );
  expect(screen.getAllByRole("button", { name: "リーチ" })).toHaveLength(1);
});

test("リーチを押すとリーチ種別を代表する行動が通知される", () => {
  const onAction = vi.fn();
  render(
    <ActionBar
      actions={[GameAction.riichi(2), GameAction.riichi(5)]}
      onAction={onAction}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "リーチ" }));
  expect(onAction).toHaveBeenCalledWith({ type: "riichi", index: 2 });
});

test("チーの組み合わせが複数あるときは選択肢が並んで表示される", () => {
  render(
    <ActionBar
      actions={[
        GameAction.chi(tilesOf(["3m", "4m"])),
        GameAction.chi(tilesOf(["4m", "6m"])),
      ]}
      onAction={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: "チー 三萬 四萬" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "チー 四萬 六萬" }),
  ).toBeInTheDocument();
});

test("複数あるチーの選択肢を押すと選んだ組み合わせが通知される", () => {
  const onAction = vi.fn();
  const second = GameAction.chi(tilesOf(["4m", "6m"]));
  render(
    <ActionBar
      actions={[GameAction.chi(tilesOf(["3m", "4m"])), second]}
      onAction={onAction}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "チー 四萬 六萬" }));
  expect(onAction).toHaveBeenCalledWith(second);
});

test("カンの選択肢が1つだけならカンとだけ表示される", () => {
  render(
    <ActionBar
      actions={[GameAction.ankan(tilesOf(["5m"])[0])]}
      onAction={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "カン" })).toBeInTheDocument();
});

test("暗槓と加槓が同時に選べるときはそれぞれの牌で並んで表示される", () => {
  render(
    <ActionBar
      actions={[
        GameAction.ankan(tilesOf(["5m"])[0]),
        GameAction.kakan(tilesOf(["1p"])[0]),
      ]}
      onAction={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "カン 五萬" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "カン 一筒" })).toBeInTheDocument();
});

test("操作が禁止されているときはボタンを押せない", () => {
  const onAction = vi.fn();
  render(
    <ActionBar actions={[GameAction.tsumo()]} onAction={onAction} disabled />,
  );
  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));
  expect(onAction).not.toHaveBeenCalled();
});

test("選べる行動がないときはボタンが表示されない", () => {
  render(<ActionBar actions={[]} onAction={vi.fn()} />);
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});
