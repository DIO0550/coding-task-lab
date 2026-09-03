import { fireEvent, render, screen, within } from "@testing-library/react";
import { test, expect } from "vitest";

import type { Tile } from "@/src/domains/tile";
import { arrangeWall } from "@/src/services/game-engine/__tests__/fixtures";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { MatchScreen } from "..";

/** 断么九のみの 3p/6p 待ち(親ロンで 1翻40符 = 2,000点) */
const TANYAO: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];

/** 全員人間・親(席0)がテンパイ。親が白を切り、南家が 3p を切ると親がロンできる */
const setupRon = () => {
  const wallTiles = arrangeWall({ hands: [TANYAO, null, null, null], draws: ["haku", "3p"], doraIndicators: ["ton"] });
  render(<MatchScreen options={{ rng: createSeededRandom(3), wallTiles, stepDelayMs: 0 }} />);
  (["南家の操作種別", "西家の操作種別", "北家の操作種別"] as const).forEach((label) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value: "human" } }),
  );
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  fireEvent.click(within(screen.getByTestId("hand-view")).getByRole("button", { name: "白" }));
  fireEvent.click(within(screen.getByTestId("hand-view")).getByRole("button", { name: "三筒" }));
};

test("他家の打牌でロンできるときはロンとパスが選べ、鳴き・ロンの選択が求められる", () => {
  setupRon();
  expect(screen.getByRole("status")).toHaveTextContent("鳴き・ロンを選択してください");
  expect(screen.getByRole("button", { name: "ロン" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "パス" })).toBeInTheDocument();
});

test("ロン和了すると和了者・放銃者・和了種別・成立役・翻数・符・点数移動・親継続が表示される", () => {
  setupRon();
  fireEvent.click(screen.getByRole("button", { name: "ロン" }));
  const dialog = screen.getByRole("dialog", { name: "局の結果" });
  expect(within(dialog).getByRole("heading", { name: "あなた のロン和了" })).toBeInTheDocument();
  expect(within(dialog).getByText("放銃者").nextElementSibling).toHaveTextContent("CPU 1");
  expect(within(dialog).getByText("和了種別").nextElementSibling).toHaveTextContent("ロン");
  expect(within(dialog).getByRole("list", { name: "成立役" })).toHaveTextContent("断么九");
  expect(within(dialog).getByText("翻数・符").nextElementSibling).toHaveTextContent("1翻 40符");
  expect(within(dialog).getByText("点数").nextElementSibling).toHaveTextContent("2,000点");
  expect(within(dialog).getByText("+2,000")).toBeInTheDocument();
  expect(within(dialog).getByText("-2,000")).toBeInTheDocument();
  expect(within(dialog).getByText("連荘")).toBeInTheDocument();
});

test("結果を確定すると点数が反映され、親の和了なので本場が1増えて東一局のまま次局へ進む", () => {
  setupRon();
  fireEvent.click(screen.getByRole("button", { name: "ロン" }));
  fireEvent.click(screen.getByRole("button", { name: "確定" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(within(screen.getByTestId("seat-panel-0")).getByText("27,000点")).toBeInTheDocument();
  expect(within(screen.getByTestId("seat-panel-1")).getByText("23,000点")).toBeInTheDocument();
  expect(screen.getByText("1本場")).toBeInTheDocument();
  expect(screen.getByText("東一局")).toBeInTheDocument();
  expect(screen.getByText("残り山: 69枚")).toBeInTheDocument();
});

test("パスを選ぶとロンせずに次の手番へ進む", () => {
  setupRon();
  fireEvent.click(screen.getByRole("button", { name: "パス" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("CPU 2の手番です");
});
