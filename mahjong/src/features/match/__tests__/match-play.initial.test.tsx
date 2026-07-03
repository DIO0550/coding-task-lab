import { fireEvent, render, screen, within } from "@testing-library/react";
import { test, expect } from "vitest";

import { MatchScreen } from "../components/MatchScreen.tsx";
import { createFakeScheduler, makeRng } from "./support.ts";

test("初期表示は東一局・0本場・供託0本・各家25,000点になる", () => {
  render(<MatchScreen rng={makeRng(1)} scheduler={createFakeScheduler()} />);

  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));

  expect(screen.getByText("東1局")).toBeInTheDocument();
  expect(screen.getByText("0本場")).toBeInTheDocument();
  expect(screen.getByText("供託0本")).toBeInTheDocument();

  for (let seat = 0; seat < 4; seat += 1) {
    const panel = screen.getByTestId(`player-panel-${seat}`);
    expect(within(panel).getByText("25,000点")).toBeInTheDocument();
  }
});

test("対戦開始で配牌され、人間(親)の手牌13枚+ツモ牌1枚が表示される", () => {
  render(<MatchScreen rng={makeRng(1)} scheduler={createFakeScheduler()} />);

  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));

  // 既定設定では席1(席0)が人間かつ起家(親)のため、対戦開始直後にツモ済みの状態が表示される。
  const hand = screen.getByTestId("hand-0");
  const tileChips = hand.querySelectorAll("[aria-label]");
  expect(tileChips).toHaveLength(14);

  expect(screen.getByText("あなたの手牌")).toBeInTheDocument();
  expect(screen.getByText("あなたの番です")).toBeInTheDocument();
});
