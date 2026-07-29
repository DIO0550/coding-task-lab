import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Participant } from "../../../../../domains/participant/index.ts";
import type { WinResult } from "../../../../../domains/round-result/index.ts";
import { Score } from "../../../../../domains/score/index.ts";
import type { Wind } from "../../../../../domains/wind/index.ts";
import { ResultPanel } from "../index.ts";

const SEAT_WINDS: readonly Wind[] = ["ton", "nan", "sha", "pei"];

/** 子のリーチ・平和・ドラ1(3翻30符)を西家から出和了りした局。 */
const setupRonResult = (): WinResult => ({
  type: "win",
  winner: 1,
  loser: 2,
  winType: "ron",
  yaku: [
    { name: "riichi", han: 1 },
    { name: "pinfu", han: 1 },
    { name: "dora", han: 1 },
  ],
  han: 3,
  fu: 30,
  score: Score.calculate({
    han: 3,
    fu: 30,
    yakumanMultiplier: 0,
    isDealer: false,
    winType: "ron",
    honba: 0,
    riichiSticks: 0,
  }),
  pointChanges: [0, 3900, -3900, 0],
  dealerContinues: false,
});

/** 親の満貫ツモで親が続く局。 */
const setupDealerTsumoResult = (): WinResult => ({
  type: "win",
  winner: 0,
  loser: null,
  winType: "tsumo",
  yaku: [
    { name: "menzen_tsumo", han: 1 },
    { name: "honitsu", han: 3 },
    { name: "tanyao", han: 1 },
  ],
  han: 5,
  fu: 40,
  score: Score.calculate({
    han: 5,
    fu: 40,
    yakumanMultiplier: 0,
    isDealer: true,
    winType: "tsumo",
    honba: 0,
    riichiSticks: 0,
  }),
  pointChanges: [12000, -4000, -4000, -4000],
  dealerContinues: true,
});

const renderRon = (onConfirm = vi.fn()) =>
  render(
    <ResultPanel
      result={setupRonResult()}
      participants={Participant.defaultSeats()}
      seatWinds={SEAT_WINDS}
      onConfirm={onConfirm}
    />,
  );

test("和了した局は和了と表示される", () => {
  renderRon();
  expect(screen.getByRole("heading", { name: "和了" })).toBeInTheDocument();
});

test("和了者が表示される", () => {
  renderRon();
  const detail = within(screen.getByRole("region", { name: "和了内容" }));
  expect(detail.getByText("南 CPU下家")).toBeInTheDocument();
});

test("ロンで和了したときは放銃者が表示される", () => {
  renderRon();
  const detail = within(screen.getByRole("region", { name: "和了内容" }));
  expect(detail.getByText("西 CPU対面")).toBeInTheDocument();
});

test("和了種別が表示される", () => {
  renderRon();
  expect(screen.getByText("ロン")).toBeInTheDocument();
});

test("成立した役と役ごとの翻数が一覧で表示される", () => {
  renderRon();
  const yakuList = within(screen.getByRole("list", { name: "成立役" }));
  expect(yakuList.getByRole("listitem", { name: "立直 1翻" })).toBeInTheDocument();
  expect(yakuList.getByRole("listitem", { name: "平和 1翻" })).toBeInTheDocument();
  expect(yakuList.getByRole("listitem", { name: "ドラ 1翻" })).toBeInTheDocument();
});

test("翻数と符が表示される", () => {
  renderRon();
  expect(screen.getByText("3翻")).toBeInTheDocument();
  expect(screen.getByText("30符")).toBeInTheDocument();
});

test("和了点が表示される", () => {
  renderRon();
  expect(screen.getByText("3,900点")).toBeInTheDocument();
});

test("4人分の点数移動が表示される", () => {
  renderRon();
  const changes = within(screen.getByRole("list", { name: "点数移動" }));
  expect(changes.getAllByRole("listitem")).toHaveLength(4);
  expect(
    changes.getByRole("listitem", { name: "CPU下家 +3,900" }),
  ).toBeInTheDocument();
  expect(
    changes.getByRole("listitem", { name: "CPU対面 -3,900" }),
  ).toBeInTheDocument();
});

test("子が和了した局は輪荘と表示される", () => {
  renderRon();
  expect(screen.getByText("輪荘")).toBeInTheDocument();
});

test("親が和了した局は連荘と表示される", () => {
  render(
    <ResultPanel
      result={setupDealerTsumoResult()}
      participants={Participant.defaultSeats()}
      seatWinds={SEAT_WINDS}
      onConfirm={vi.fn()}
    />,
  );
  expect(screen.getByText("連荘")).toBeInTheDocument();
});

test("満貫の手には点数区分が表示される", () => {
  render(
    <ResultPanel
      result={setupDealerTsumoResult()}
      participants={Participant.defaultSeats()}
      seatWinds={SEAT_WINDS}
      onConfirm={vi.fn()}
    />,
  );
  expect(screen.getByText("満貫")).toBeInTheDocument();
  expect(screen.getByText("12,000点")).toBeInTheDocument();
});

test("確定を押すと結果の確定が通知される", () => {
  const onConfirm = vi.fn();
  renderRon(onConfirm);
  fireEvent.click(screen.getByRole("button", { name: "確定" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
