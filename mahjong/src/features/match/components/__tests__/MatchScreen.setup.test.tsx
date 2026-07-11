import { test, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MatchScreen } from "../MatchScreen.tsx";

test("対戦開始前に4席分の操作種別と表示名の設定項目が既定値で表示される", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("東家の操作種別")).toHaveValue("human");
  expect(screen.getByLabelText("南家の操作種別")).toHaveValue("cpu");
  expect(screen.getByLabelText("西家の操作種別")).toHaveValue("cpu");
  expect(screen.getByLabelText("北家の操作種別")).toHaveValue("cpu");
  expect(screen.getByLabelText("東家の表示名")).toHaveValue("あなた");
  expect(screen.getByLabelText("南家の表示名")).toHaveValue("CPU1");
  expect(screen.getByLabelText("西家の表示名")).toHaveValue("CPU2");
  expect(screen.getByLabelText("北家の表示名")).toHaveValue("CPU3");
});

test("CPUの席にだけCPUレベルの選択肢が表示される", () => {
  render(<MatchScreen />);
  expect(screen.queryByLabelText("東家のCPUレベル")).toBeNull();
  expect(screen.getByLabelText("南家のCPUレベル")).toHaveValue("standard");
  expect(screen.getByLabelText("西家のCPUレベル")).toHaveValue("standard");
  expect(screen.getByLabelText("北家のCPUレベル")).toHaveValue("standard");
});

test("席をCPUに変更するとその席のCPUレベルが選択できるようになる", () => {
  render(<MatchScreen />);
  fireEvent.change(screen.getByLabelText("東家の操作種別"), {
    target: { value: "cpu" },
  });
  expect(screen.getByLabelText("東家のCPUレベル")).toHaveValue("standard");
});

test("ルール設定が仕様の初期値(半荘戦・25000点・返し点30000・各種あり)で表示される", () => {
  render(<MatchScreen />);
  expect(screen.getByLabelText("対戦形式")).toHaveValue("hanchan");
  expect(screen.getByLabelText("持ち点")).toHaveValue("25000");
  expect(screen.getByLabelText("返し点")).toHaveValue("30000");
  expect(screen.getByLabelText("喰いタン")).toHaveValue("on");
  expect(screen.getByLabelText("後付け")).toHaveValue("on");
  expect(screen.getByLabelText("赤ドラ")).toHaveValue("on");
  expect(screen.getByLabelText("CPU自動和了")).toHaveValue("on");
});

test("対戦形式は東風戦へ変更できる", () => {
  render(<MatchScreen />);
  fireEvent.change(screen.getByLabelText("対戦形式"), {
    target: { value: "tonpuu" },
  });
  expect(screen.getByLabelText("対戦形式")).toHaveValue("tonpuu");
});

test("対戦開始ボタンが表示される", () => {
  render(<MatchScreen />);
  expect(screen.getByRole("button", { name: "対戦開始" })).toBeInTheDocument();
});
