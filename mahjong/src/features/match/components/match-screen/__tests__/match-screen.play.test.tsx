import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { expect, test } from "vitest";

import { MatchScreen } from "../index.ts";

const startMatch = () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
};

const handTiles = (): readonly Element[] =>
  Array.from(
    screen.getByRole("group", { name: "手牌" }).querySelectorAll("[aria-label]"),
  );

const selectableTiles = (): readonly HTMLElement[] =>
  within(screen.getByRole("group", { name: "手牌" })).queryAllByRole("button");

test("対戦開始すると設定画面が閉じる", async () => {
  startMatch();
  await waitFor(() =>
    expect(screen.queryByRole("region", { name: "対戦開始設定" })).toBeNull(),
  );
});

test("対戦開始すると人間の手牌が表示される", async () => {
  startMatch();
  await waitFor(() =>
    expect(screen.getByRole("group", { name: "手牌" })).toBeInTheDocument(),
  );
});

test("親である人間はツモ後に14枚を持つ", async () => {
  startMatch();
  await waitFor(() => expect(handTiles()).toHaveLength(14));
});

test("他家の手牌は伏せて表示される", async () => {
  startMatch();
  await waitFor(() =>
    expect(screen.getAllByRole("group", { name: "伏せた手牌" })).toHaveLength(3),
  );
});

test("自分の手番では手牌の牌が選択できる", async () => {
  startMatch();
  await waitFor(() => expect(selectableTiles()).toHaveLength(14));
});

test("牌を選ぶと打牌されて手牌が13枚になる", async () => {
  startMatch();
  await waitFor(() => expect(selectableTiles()).toHaveLength(14));
  fireEvent.click(selectableTiles()[0]);
  await waitFor(() => expect(handTiles()).toHaveLength(13));
});

test("打牌するとCPUの手番が自動で進行して残り山が減る", async () => {
  startMatch();
  await waitFor(() => expect(selectableTiles()).toHaveLength(14));
  fireEvent.click(selectableTiles()[0]);
  await waitFor(
    () => expect(screen.getByText(/残り6[0-6]枚/)).toBeInTheDocument(),
    { timeout: 10000 },
  );
});

test("CPUの手番が進むと他家の捨て牌が増える", async () => {
  startMatch();
  await waitFor(() => expect(selectableTiles()).toHaveLength(14));
  fireEvent.click(selectableTiles()[0]);
  await waitFor(
    () =>
      expect(
        within(screen.getByLabelText("南家 CPU下家")).getByRole("list", {
          name: "捨て牌",
        }).children.length,
      ).toBeGreaterThan(0),
    { timeout: 10000 },
  );
});

test("対戦中は局・本場・供託・残り山が表示される", async () => {
  startMatch();
  await waitFor(() => expect(selectableTiles()).toHaveLength(14));
  expect([
    screen.getByText("東一局"),
    screen.getByText("0本場"),
    screen.getByText("供託0本"),
    screen.getByText("残り69枚"),
  ]).toHaveLength(4);
});

test("対戦中はドラ表示牌が表示される", async () => {
  startMatch();
  await waitFor(() =>
    expect(screen.getByRole("list", { name: "ドラ表示牌" })).toBeInTheDocument(),
  );
});

test("現在の手番が画面に表示される", async () => {
  startMatch();
  await waitFor(() =>
    expect(screen.getByText("現在の手番: あなた")).toBeInTheDocument(),
  );
});
