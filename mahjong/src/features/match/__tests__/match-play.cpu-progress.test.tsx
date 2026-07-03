import { act, render, screen } from "@testing-library/react";
import { test, expect } from "vitest";

import { MatchScreen } from "../components/MatchScreen.tsx";
import { createFakeScheduler, createTestMatch, makeRng, t, testConfig } from "./support.ts";

test("CPUの手番が自動で進行する(フェイクスケジューラをflushすると河に牌が増える)", () => {
  const scheduler = createFakeScheduler();
  const rng = makeRng(7);

  // 席1(CPU)が起家(親)で手番を持つ状態を直接構築する。
  // 4面子完成+孤立牌2枚(白・發)という、どちらを切ってもテンパイになる手にしておくことで、
  // 他家が鳴き/ロンできない安全な牌を確実に切らせる。
  const match = createTestMatch({
    config: testConfig(),
    dealerSeat: 1,
    hands: [
      t("1m", "4m", "7m", "1p", "4p", "7p", "1s", "4s", "7s", "ton", "nan", "sha", "pei"),
      t("2m", "3m", "4m", "5m", "6m", "7m", "2p", "3p", "4p", "5p", "6p", "7p", "haku"),
      t("2s", "2s", "5s", "5s", "8s", "8s", "2m", "2m", "5m", "5m", "8m", "8m", "3s"),
      t("3m", "3m", "6m", "6m", "9m", "9m", "3p", "3p", "6p", "6p", "9p", "9p", "6s"),
    ],
    draws: t("hatsu"),
  });

  render(<MatchScreen initialMatch={match} rng={rng} scheduler={scheduler} />);

  expect(screen.getByTestId("river-1").children).toHaveLength(0);

  act(() => {
    scheduler.flush();
  });

  expect(screen.getByTestId("river-1").children.length).toBeGreaterThan(0);
});
