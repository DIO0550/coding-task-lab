import { fireEvent, render, screen } from "@testing-library/react";
import { test, expect } from "vitest";

import { MatchScreen } from "../components/MatchScreen.tsx";
import { createFakeScheduler, createTestMatch, makeRng, t, testConfig } from "./support.ts";

const buildTsumoWinMatch = () =>
  createTestMatch({
    config: testConfig(),
    dealerSeat: 0,
    hands: [
      // 123m + 456p + 789s + ton(暗刻) + 5m(単騎)。ツモ牌5mで完成する。
      t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"),
      t("4m", "6m", "7m", "8m", "9m", "1p", "2p", "3p", "7p", "8p", "9p", "nan", "nan"),
      t("1s", "2s", "3s", "4s", "5s", "6s", "sha", "sha", "pei", "pei", "haku", "haku", "hatsu"),
      t("1m", "1m", "2m", "2m", "3m", "3m", "4p", "4p", "5p", "5p", "6s", "6s", "chun"),
    ],
    draws: t("5m"),
  });

test("ツモ和了が発生すると結果(役・翻・符・点数移動)が表示される", () => {
  const match = buildTsumoWinMatch();
  render(<MatchScreen initialMatch={match} rng={makeRng(11)} scheduler={createFakeScheduler()} />);

  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));

  expect(screen.getByText("あなたのツモ和了")).toBeInTheDocument();
  expect(screen.getByText(/自風牌/)).toBeInTheDocument();
  expect(screen.getByText(/場風牌/)).toBeInTheDocument();
  expect(screen.getByText(/門前清自摸和/)).toBeInTheDocument();
  expect(screen.getByText("親継続(連荘・本場+1)")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "確定" })).toBeInTheDocument();
});

test("結果確定後、点数が反映され本場が更新された表示になる(親のツモ和了は連荘)", () => {
  const match = buildTsumoWinMatch();
  render(<MatchScreen initialMatch={match} rng={makeRng(11)} scheduler={createFakeScheduler()} />);

  fireEvent.click(screen.getByRole("button", { name: "ツモ" }));
  fireEvent.click(screen.getByRole("button", { name: "確定" }));

  // 親(あなた)のツモ和了のため連荘: 東1局のまま本場が1に更新される。
  expect(screen.getByText("東1局")).toBeInTheDocument();
  expect(screen.getByText("1本場")).toBeInTheDocument();
  // 和了者(親)の持ち点が25,000点から増えている。
  const dealerPanel = screen.getByTestId("player-panel-0");
  expect(dealerPanel.textContent).not.toContain("25,000点");
});
