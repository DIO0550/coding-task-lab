import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { MatchScreen } from "../index.ts";

test("対戦画面には対戦開始設定が表示される", () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  expect(
    screen.getByRole("region", { name: "対戦開始設定" }),
  ).toBeInTheDocument();
});

test.each(["東家", "南家", "西家", "北家"])(
  "%s の操作種別を人間とCPUから選べる",
  (house) => {
    render(<MatchScreen autoAdvanceMs={0} />);
    expect(
      screen.getByLabelText(`${house}の操作種別`),
    ).toBeInTheDocument();
  },
);

test.each(["東家", "南家", "西家", "北家"])(
  "%s のCPUレベルを選べる",
  (house) => {
    render(<MatchScreen autoAdvanceMs={0} />);
    expect(screen.getByLabelText(`${house}のCPUレベル`)).toBeInTheDocument();
  },
);

test("CPUレベルは入門・標準・上級から選べる", () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  const select = screen.getByLabelText("南家のCPUレベル");
  expect(
    Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent,
    ),
  ).toStrictEqual(["入門", "標準", "上級"]);
});

test("対戦形式は東風戦と半荘戦から選べる", () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  const select = screen.getByLabelText("対戦形式");
  expect(
    Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent,
    ),
  ).toStrictEqual(["東風戦", "半荘戦"]);
});

test.each(["持ち点", "返し点", "喰いタン", "後付け", "赤ドラ", "CPU自動和了"])(
  "ルール設定に %s が表示される",
  (label) => {
    render(<MatchScreen autoAdvanceMs={0} />);
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  },
);

test("初期表示は東一局になる", () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  expect(screen.getByText("東一局")).toBeInTheDocument();
});

test("初期表示は0本場になる", () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  expect(screen.getByText("0本場")).toBeInTheDocument();
});

test("初期表示は供託0本になる", () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  expect(screen.getByText("供託0本")).toBeInTheDocument();
});

test.each(["東家 あなた", "南家 CPU下家", "西家 CPU対面", "北家 CPU上家"])(
  "初期表示では %s の持ち点が25000点になる",
  (panel) => {
    render(<MatchScreen autoAdvanceMs={0} />);
    expect(
      within(screen.getByLabelText(panel)).getByText("25,000点"),
    ).toBeInTheDocument();
  },
);

test("初期表示では4人分のプレイヤーが表示される", () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  expect(
    ["東家 あなた", "南家 CPU下家", "西家 CPU対面", "北家 CPU上家"].map(
      (panel) => screen.getByLabelText(panel).tagName,
    ),
  ).toStrictEqual(["SECTION", "SECTION", "SECTION", "SECTION"]);
});

test("対戦開始前は対戦開始ボタンが表示される", () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  expect(
    screen.getByRole("button", { name: "対戦開始" }),
  ).toBeInTheDocument();
});
