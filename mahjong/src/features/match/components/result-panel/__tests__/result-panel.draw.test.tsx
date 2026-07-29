import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Participant } from "../../../../../domains/participant/index.ts";
import type { ExhaustiveDrawResult } from "../../../../../domains/round-result/index.ts";
import type { Wind } from "../../../../../domains/wind/index.ts";
import { ResultPanel } from "../index.ts";

const SEAT_WINDS: readonly Wind[] = ["ton", "nan", "sha", "pei"];

/** 東家と西家がテンパイ、南家と北家がノーテンで流局した局。 */
const setupDrawResult = (): ExhaustiveDrawResult => ({
  type: "exhaustive_draw",
  tenpai: [true, false, true, false],
  pointChanges: [1500, -1500, 1500, -1500],
  dealerContinues: true,
});

const renderDraw = (onConfirm = vi.fn()) =>
  render(
    <ResultPanel
      result={setupDrawResult()}
      participants={Participant.defaultSeats()}
      seatWinds={SEAT_WINDS}
      onConfirm={onConfirm}
    />,
  );

test("荒牌で終わった局は流局と表示される", () => {
  renderDraw();
  expect(screen.getByRole("heading", { name: "流局" })).toBeInTheDocument();
});

test("各家のテンパイとノーテンが表示される", () => {
  renderDraw();
  const tenpaiList = within(
    screen.getByRole("list", { name: "テンパイ状況" }),
  );
  expect(
    tenpaiList.getByRole("listitem", { name: "あなた テンパイ" }),
  ).toBeInTheDocument();
  expect(
    tenpaiList.getByRole("listitem", { name: "CPU下家 ノーテン" }),
  ).toBeInTheDocument();
  expect(
    tenpaiList.getByRole("listitem", { name: "CPU対面 テンパイ" }),
  ).toBeInTheDocument();
  expect(
    tenpaiList.getByRole("listitem", { name: "CPU上家 ノーテン" }),
  ).toBeInTheDocument();
});

test("ノーテン罰符の点数移動が表示される", () => {
  renderDraw();
  const changes = within(screen.getByRole("list", { name: "点数移動" }));
  expect(
    changes.getByRole("listitem", { name: "あなた +1,500" }),
  ).toBeInTheDocument();
  expect(
    changes.getByRole("listitem", { name: "CPU下家 -1,500" }),
  ).toBeInTheDocument();
});

test("親がテンパイで流局した局は連荘と表示される", () => {
  renderDraw();
  expect(screen.getByText("連荘")).toBeInTheDocument();
});

test("流局でも確定を押すと結果の確定が通知される", () => {
  const onConfirm = vi.fn();
  renderDraw(onConfirm);
  fireEvent.click(screen.getByRole("button", { name: "確定" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
