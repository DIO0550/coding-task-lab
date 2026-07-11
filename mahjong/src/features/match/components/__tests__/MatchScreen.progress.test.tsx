import { test, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MatchScreen } from "../MatchScreen.tsx";
import { cpuTurnState, humanTurnState } from "../../__tests__/helpers.ts";

afterEach(() => {
  vi.useRealTimers();
});

const riverTiles = (seat: number) =>
  within(screen.getByTestId(`river-${seat}`)).queryAllByTestId("river-tile");

test("CPUの手番はタイマーが経過するまで打牌されない", () => {
  vi.useFakeTimers();
  render(<MatchScreen initialGame={cpuTurnState()} />);
  expect(riverTiles(1)).toHaveLength(0);
});

test("CPUの手番はタイマー経過で自動的に打牌される", () => {
  vi.useFakeTimers();
  render(<MatchScreen initialGame={cpuTurnState()} />);
  act(() => {
    vi.advanceTimersByTime(600);
  });
  expect(riverTiles(1)).toHaveLength(1);
});

test("CPUの打牌後は次のCPUへ手番が移り自動進行が続く", () => {
  vi.useFakeTimers();
  render(<MatchScreen initialGame={cpuTurnState()} />);
  act(() => {
    vi.advanceTimersByTime(600);
  });
  act(() => {
    vi.advanceTimersByTime(600);
  });
  expect(riverTiles(2)).toHaveLength(1);
});

test("人間の手番に手牌をクリックするとその牌が河に捨てられる", () => {
  vi.useFakeTimers();
  render(<MatchScreen initialGame={humanTurnState()} />);
  const hand = within(screen.getByTestId("player-0")).getByTestId("hand");
  const target = within(hand)
    .getAllByTestId("hand-tile")
    .find((tile) => tile.getAttribute("data-tile") === "1m");
  if (target === undefined) {
    throw new Error("1m is not in the hand");
  }
  fireEvent.click(target);
  const river = riverTiles(0);
  expect(river).toHaveLength(1);
  expect(river[0].getAttribute("data-tile")).toBe("1m");
});

test("人間が打牌すると手番表示が次の席へ移る", () => {
  vi.useFakeTimers();
  render(<MatchScreen initialGame={humanTurnState()} />);
  const hand = within(screen.getByTestId("player-0")).getByTestId("hand");
  fireEvent.click(within(hand).getAllByTestId("hand-tile")[0]);
  expect(
    within(screen.getByTestId("player-1")).getByTestId("turn-badge"),
  ).toBeInTheDocument();
});
