import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Match } from "../../../../../domains/match/index.ts";
import type { Ranking } from "../../../../../domains/match/index.ts";
import { Participant } from "../../../../../domains/participant/index.ts";
import { Rule } from "../../../../../domains/rule/index.ts";
import { RankingPanel } from "../index.ts";

/** 終局時の持ち点から順位を求める。 */
const setupRanking = (): readonly Ranking[] => {
  const match = Match.create(Rule.default(), Participant.defaultSeats());
  return Match.ranking(Match.applyPointChanges(match, [8000, -3000, 1000, -6000]));
};

test("最終順位が上位から順に表示される", () => {
  render(
    <RankingPanel
      ranking={setupRanking()}
      participants={Participant.defaultSeats()}
      onRestart={vi.fn()}
    />,
  );
  const list = within(screen.getByRole("list", { name: "順位" }));
  const items = list.getAllByRole("listitem");
  expect(items).toHaveLength(4);
  expect(items[0]).toHaveAccessibleName("1位 あなた 33,000点");
  expect(items[3]).toHaveAccessibleName("4位 CPU上家 19,000点");
});

test("各プレイヤーの持ち点が表示される", () => {
  render(
    <RankingPanel
      ranking={setupRanking()}
      participants={Participant.defaultSeats()}
      onRestart={vi.fn()}
    />,
  );
  expect(screen.getByText("33,000点")).toBeInTheDocument();
  expect(screen.getByText("26,000点")).toBeInTheDocument();
  expect(screen.getByText("22,000点")).toBeInTheDocument();
  expect(screen.getByText("19,000点")).toBeInTheDocument();
});

test("もう一度対戦を押すと再戦が通知される", () => {
  const onRestart = vi.fn();
  render(
    <RankingPanel
      ranking={setupRanking()}
      participants={Participant.defaultSeats()}
      onRestart={onRestart}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "もう一度対戦" }));
  expect(onRestart).toHaveBeenCalledTimes(1);
});
