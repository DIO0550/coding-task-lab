import { test, expect } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MatchScreen } from "@/src/features/match";

// 全席CPU・このシードでは最初の局が和了で終わる(シードはシミュレーションで選定)
const WIN_SEED = 1;

const startAllCpuMatch = (): void => {
  fireEvent.change(screen.getByLabelText("東家の操作種別"), {
    target: { value: "cpu" },
  });
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
};

test("和了発生時に結果(和了者・種別・役・翻・符・点数移動)が表示される", async () => {
  render(<MatchScreen seed={WIN_SEED} cpuDelayMs={0} />);
  startAllCpuMatch();
  const heading = await screen.findByText(
    /の(ツモ|ロン)和了/,
    undefined,
    { timeout: 30000 },
  );
  expect(heading).toBeInTheDocument();
  // 翻・符・点数のサマリ行(役ごとの翻表示とは別に、まとめ行が1つ)
  expect(screen.getByText(/\d+翻 \d+符 [\d,]+点/)).toBeInTheDocument();
  // 点数移動(4人分の増減)
  expect(screen.getAllByText(/[+-][\d,]+点/).length).toBeGreaterThanOrEqual(2);
  // 連荘/輪荘の表示
  expect(screen.getByText(/(連荘|輪荘)/)).toBeInTheDocument();
}, 40000);

test("結果を確定すると点数が反映され、表示が更新される", async () => {
  render(<MatchScreen seed={WIN_SEED} cpuDelayMs={0} />);
  startAllCpuMatch();
  await screen.findByText(/の(ツモ|ロン)和了/, undefined, { timeout: 30000 });
  fireEvent.click(screen.getByRole("button", { name: "確定して次へ" }));
  // 和了結果のオーバーレイが閉じ、持ち点が初期値から変化している
  await waitFor(() => {
    expect(screen.queryByText(/の(ツモ|ロン)和了/)).not.toBeInTheDocument();
  });
  await waitFor(() => {
    const panels = [0, 1, 2, 3].map(
      (seat) => screen.getByTestId(`player-panel-${seat}`).textContent ?? "",
    );
    const changed = panels.filter((text) => !text.includes("25,000点"));
    expect(changed.length).toBeGreaterThanOrEqual(2);
  });
}, 40000);
