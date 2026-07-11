import { test, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMatch } from "../useMatch.ts";
import { dealerTsumoState } from "../../__tests__/helpers.ts";

afterEach(() => {
  vi.useRealTimers();
});

test("start すると配牌され起家(席0)の手番から対局が始まる", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useMatch({ seed: 7 }));
  act(() => {
    result.current.start();
  });
  expect(result.current.game).not.toBeNull();
  expect(result.current.currentActor).toBe(0);
  expect(result.current.game?.players[0].hand).toHaveLength(13);
  expect(result.current.game?.players[0].drawn).not.toBeNull();
});

test("人間の手番で selectTile すると打牌として適用され河が増える", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useMatch({ seed: 7 }));
  act(() => {
    result.current.start();
  });
  const drawn = result.current.game?.players[0].drawn;
  if (drawn == null) {
    throw new Error("drawn tile is missing");
  }
  act(() => {
    result.current.selectTile(drawn);
  });
  expect(result.current.game?.players[0].discards).toHaveLength(1);
});

test("結果を確定すると点数が反映され本場が進む", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useMatch({ initialGame: dealerTsumoState() }));
  act(() => {
    result.current.act({ type: "tsumo" });
  });
  expect(result.current.game?.phase).toBe("result_win");
  act(() => {
    result.current.confirmResult();
  });
  expect(result.current.game?.players[0].points).toBe(27100);
  expect(result.current.game?.honba).toBe(1);
});

test("CPUの手番は約600ミリ秒後に自動で1手進む", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useMatch({ seed: 7 }));
  act(() => {
    result.current.start();
  });
  const drawn = result.current.game?.players[0].drawn;
  if (drawn == null) {
    throw new Error("drawn tile is missing");
  }
  act(() => {
    result.current.selectTile(drawn);
  });
  const before = result.current.game;
  if (before === null || result.current.currentActor === null) {
    throw new Error("game should be waiting for an actor");
  }
  act(() => {
    vi.advanceTimersByTime(600);
  });
  expect(result.current.game).not.toBe(before);
});
