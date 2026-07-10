import { fireEvent, render, screen } from "@testing-library/react";
import { test, expect } from "vitest";

import { MatchScreen } from "../index.ts";
import { createFakeScheduler, createTestMatch, makeRng, t, testConfig } from "./support.ts";

test("人間の手番で牌をクリックすると河へ移動し、手番が次家へ移る", () => {
  const scheduler = createFakeScheduler();
  const rng = makeRng(3);

  // 席0(人間)が起家(親)。安全に切れる孤立牌(北)を含む手にしておく。
  const match = createTestMatch({
    config: testConfig(),
    dealerSeat: 0,
    hands: [
      t("2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5p", "6p", "7p", "pei"),
      t("1m", "9m", "1p", "9p", "1s", "9s", "ton", "nan", "sha", "haku", "hatsu", "chun", "9s"),
      t("2s", "2s", "5s", "5s", "8s", "8s", "2m", "2m", "5m", "5m", "8m", "8m", "3s"),
      t("3m", "3m", "6m", "6m", "9m", "9m", "3p", "3p", "6p", "6p", "9p", "9p", "6s"),
    ],
    draws: t("haku"),
  });

  render(<MatchScreen initialMatch={match} rng={rng} scheduler={scheduler} />);

  expect(screen.getByTestId("river-0").querySelectorAll("[aria-label]")).toHaveLength(0);

  const peiButton = screen.getByRole("button", { name: "北" });
  fireEvent.click(peiButton);

  expect(screen.getByTestId("river-0").querySelectorAll("[aria-label]")).toHaveLength(1);
  // 誰も鳴き/ロンできない牌のため、手番は次家(席1)へ移る。
  expect(screen.getByTestId("player-panel-1")).toHaveAttribute("data-current-turn", "true");
  expect(screen.getByTestId("player-panel-0")).toHaveAttribute("data-current-turn", "false");
});
