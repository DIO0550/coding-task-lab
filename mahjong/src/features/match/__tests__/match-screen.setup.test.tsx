import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchScreen } from "@/src/features/match";

test("対戦開始設定(プレイヤー設定とルール設定)が表示される", () => {
  render(<MatchScreen seed={1} cpuDelayMs={0} />);
  expect(screen.getByText("対戦開始設定")).toBeInTheDocument();
  expect(screen.getByText("プレイヤー設定")).toBeInTheDocument();
  expect(screen.getByText("ルール設定")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "対戦開始" })).toBeInTheDocument();
});

test("各席で人間/CPUとCPUレベルを選択できる", () => {
  render(<MatchScreen seed={1} cpuDelayMs={0} />);
  const kindSelect = screen.getByLabelText<HTMLSelectElement>(
    "南家の操作種別",
  );
  expect(kindSelect.value).toBe("cpu");
  expect(
    screen.getByLabelText<HTMLSelectElement>("南家のCPUレベル"),
  ).toBeInTheDocument();
  const levelSelect = screen.getByLabelText<HTMLSelectElement>(
    "南家のCPUレベル",
  );
  const labels = [...levelSelect.options].map((option) => option.text);
  expect(labels).toStrictEqual(["入門", "標準", "上級"]);
});

test("東風戦/半荘戦・持ち点・返し点・喰いタン・後付け・赤ドラ・CPU自動和了のルール設定が表示される", () => {
  render(<MatchScreen seed={1} cpuDelayMs={0} />);
  expect(screen.getByText("対戦形式")).toBeInTheDocument();
  expect(screen.getByText("持ち点")).toBeInTheDocument();
  expect(screen.getByText("返し点")).toBeInTheDocument();
  expect(screen.getByText("喰いタン")).toBeInTheDocument();
  expect(screen.getByText("後付け")).toBeInTheDocument();
  expect(screen.getByText("赤ドラ")).toBeInTheDocument();
  expect(screen.getByText("CPU自動和了")).toBeInTheDocument();
  const gameTypeSelect = screen
    .getByText("対戦形式")
    .closest("label")
    ?.querySelector("select");
  expect(gameTypeSelect?.value).toBe("hanchan");
});

test("開いた直後に東一局・0本場・供託0本・各家25,000点の初期状態が表示される", () => {
  render(<MatchScreen seed={1} cpuDelayMs={0} />);
  expect(screen.getByText("東一局")).toBeInTheDocument();
  expect(screen.getByText("0本場")).toBeInTheDocument();
  expect(screen.getByText("0本")).toBeInTheDocument();
  expect(screen.getAllByText("25,000点")).toHaveLength(4);
});
