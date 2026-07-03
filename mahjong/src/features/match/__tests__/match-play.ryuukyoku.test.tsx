import { fireEvent, render, screen } from "@testing-library/react";
import { test, expect } from "vitest";

import { LIVE_WALL_SIZE } from "@/src/domains/game/index.ts";

import { MatchScreen } from "../components/MatchScreen.tsx";
import { createFakeScheduler, createTestMatch, makeRng, t, testConfig } from "./support.ts";

test("荒牌流局が発生するとテンパイ/ノーテンとノーテン罰符の移動が表示される", () => {
  const dealt = createTestMatch({
    config: testConfig(),
    dealerSeat: 0,
    hands: [
      t("1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "nan", "nan"),
      t("1m", "9m", "2p", "8p", "3s", "7s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("2m", "8m", "3p", "7p", "4s", "6s", "ton", "nan", "sha", "pei", "haku", "hatsu", "chun"),
      t("4m", "6m", "4p", "6p", "5s", "1s", "9s", "1p", "9p", "2s", "8s", "3m", "7m"),
    ],
    draws: t("5m"),
  });
  // 山を使い切った状態を再現する(残り牌数0)。
  const match = { ...dealt, drawIndex: LIVE_WALL_SIZE };

  render(<MatchScreen initialMatch={match} rng={makeRng(5)} scheduler={createFakeScheduler()} />);

  const drawnTileButton = screen.getAllByRole("button").find((el) => el.getAttribute("aria-label") === "5萬");
  expect(drawnTileButton).toBeDefined();
  fireEvent.click(drawnTileButton as HTMLElement);

  expect(screen.getByText("流局(荒牌)")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "テンパイ/ノーテン" })).toBeInTheDocument();
  expect(screen.getByText("あなた: テンパイ")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "確定" })).toBeInTheDocument();
});
