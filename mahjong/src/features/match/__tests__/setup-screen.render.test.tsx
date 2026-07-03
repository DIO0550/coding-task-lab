import { render, screen } from "@testing-library/react";
import { test, expect } from "vitest";

import { MatchScreen } from "../components/MatchScreen.tsx";

test("対戦開始設定画面に4席分の操作種別・表示名・CPUレベルの設定が表示される", () => {
  render(<MatchScreen />);

  expect(screen.getByRole("heading", { name: "対戦開始設定" })).toBeInTheDocument();
  expect(screen.getByText("席1")).toBeInTheDocument();
  expect(screen.getByText("席2")).toBeInTheDocument();
  expect(screen.getByText("席3")).toBeInTheDocument();
  expect(screen.getByText("席4")).toBeInTheDocument();

  // 既定: 席1が人間、席2〜4がCPU(標準)。
  const humanRadios = screen.getAllByRole("radio", { name: "人間" });
  expect(humanRadios).toHaveLength(4);
  expect(humanRadios[0]).toBeChecked();

  const cpuRadios = screen.getAllByRole("radio", { name: "CPU" });
  expect(cpuRadios[1]).toBeChecked();
  expect(cpuRadios[2]).toBeChecked();
  expect(cpuRadios[3]).toBeChecked();

  // CPU席にはCPUレベル(入門/標準/上級)の選択肢が表示される。
  const standardRadios = screen.getAllByRole("radio", { name: "標準" });
  expect(standardRadios).toHaveLength(3);
  standardRadios.forEach((radio) => expect(radio).toBeChecked());
});

test("ルール設定(対戦形式・持ち点・返し点・喰いタン・後付け・赤ドラ・CPU自動和了)が既定値付きで表示される", () => {
  render(<MatchScreen />);

  expect(screen.getByRole("heading", { name: "ルール設定" })).toBeInTheDocument();

  expect(screen.getByRole("radio", { name: "半荘戦" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "東風戦" })).not.toBeChecked();

  expect(screen.getByRole("radio", { name: "25,000点" })).toBeChecked();

  // "30,000点" は持ち点(30,000点開始)と返し点(30,000点)の2箇所にある。
  // 既定は持ち点25,000点開始・返し点30,000点なので、前者は未選択・後者は選択済み。
  const points30 = screen.getAllByRole("radio", { name: "30,000点" });
  expect(points30).toHaveLength(2);
  expect(points30[0]).not.toBeChecked();
  expect(points30[1]).toBeChecked();

  const naText = screen.getAllByText("なし");
  expect(naText.length).toBeGreaterThan(0);

  const ariRadios = screen.getAllByRole("radio", { name: "あり" });
  ariRadios.forEach((radio) => expect(radio).toBeChecked());
});

test("対戦開始ボタンが表示され、設定開始前は対局画面(卓)が表示されない", () => {
  render(<MatchScreen />);
  expect(screen.getByRole("button", { name: "対戦開始" })).toBeInTheDocument();
  expect(screen.queryByText(/局$/)).not.toBeInTheDocument();
});
