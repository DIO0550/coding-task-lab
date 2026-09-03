import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { test, expect } from "vitest";

import { arrangeWall } from "@/src/services/game-engine/__tests__/fixtures";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { MatchScreen } from "..";

/** 全員が鳴けない配牌で、親(席0・人間)の第一ツモを白にする */
const setup = () => {
  const wallTiles = arrangeWall({ hands: [null, null, null, null], draws: ["haku"] });
  render(<MatchScreen options={{ rng: createSeededRandom(7), wallTiles, stepDelayMs: 0 }} />);
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
};

test("対戦開始で配牌され、人間(親)の手牌13枚とツモ牌1枚が表示される", () => {
  setup();
  const hand = screen.getByTestId("hand-view");
  expect(within(hand).getAllByRole("button")).toHaveLength(14);
  expect(within(screen.getByTestId("drawn-tile")).getByRole("button", { name: "白" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("あなたの手番です");
});

test("対戦開始直後の卓は残り山69枚でドラ表示牌が1枚めくられている", () => {
  setup();
  expect(screen.getByText("残り山: 69枚")).toBeInTheDocument();
  expect(within(screen.getByText("ドラ表示牌:").parentElement as HTMLElement).getAllByRole("img")).toHaveLength(1);
});

test("人間の手番で牌を選ぶと打牌され、その牌が自分の河に並ぶ", () => {
  setup();
  fireEvent.click(within(screen.getByTestId("hand-view")).getByRole("button", { name: "白" }));
  expect(within(screen.getByTestId("river-0")).getByRole("img", { name: "白" })).toBeInTheDocument();
  expect(within(screen.getByTestId("hand-view")).getAllByRole("button")).toHaveLength(13);
});

test("人間が打牌するとCPUの手番が自動で進行し、CPUの河に牌が並んで手番が人間へ戻る", async () => {
  setup();
  fireEvent.click(within(screen.getByTestId("hand-view")).getByRole("button", { name: "白" }));
  await waitFor(() => expect(within(screen.getByTestId("river-1")).getAllByRole("img").length).toBeGreaterThan(0));
  await waitFor(() => expect(within(screen.getByTestId("river-3")).getAllByRole("img").length).toBeGreaterThan(0));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("あなたの手番です"));
  expect(within(screen.getByTestId("hand-view")).getAllByRole("button")).toHaveLength(14);
});

test("CPUの手番中は人間の手牌を打牌できない", async () => {
  setup();
  fireEvent.click(within(screen.getByTestId("hand-view")).getByRole("button", { name: "白" }));
  const buttons = within(screen.getByTestId("hand-view")).getAllByRole("button");
  expect(buttons.every((button) => button.hasAttribute("disabled"))).toBe(true);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("あなたの手番です"));
});
