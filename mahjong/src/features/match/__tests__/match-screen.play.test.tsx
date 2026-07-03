import { test, expect } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MatchScreen } from "@/src/features/match";

test("対戦開始で配牌され、人間の手牌13枚とツモ牌が表示される", async () => {
  render(<MatchScreen seed={42} cpuDelayMs={0} />);
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  const hand = await screen.findByLabelText("自分の手牌");
  // 起家(東家)が人間なので、配牌13枚 + 第一ツモで14枚表示される
  await waitFor(() => {
    expect(within(hand).getAllByRole("button")).toHaveLength(14);
  });
});

test("人間の手番で打牌でき、捨て牌が河に表示される", async () => {
  render(<MatchScreen seed={42} cpuDelayMs={0} />);
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  const hand = await screen.findByLabelText("自分の手牌");
  await waitFor(() => {
    expect(within(hand).getAllByRole("button")).toHaveLength(14);
  });
  fireEvent.click(within(hand).getAllByRole("button")[0]);
  const river = screen.getByLabelText("あなたの捨て牌");
  await waitFor(() => {
    expect(river.childElementCount).toBeGreaterThanOrEqual(1);
  });
});

test("CPUの手番が自動で進行し、CPUの捨て牌が河に増えていく", async () => {
  render(<MatchScreen seed={42} cpuDelayMs={0} />);
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  const hand = await screen.findByLabelText("自分の手牌");
  await waitFor(() => {
    expect(within(hand).getAllByRole("button")).toHaveLength(14);
  });
  fireEvent.click(within(hand).getAllByRole("button")[0]);
  // 人間の打牌後、CPU 3人の手番が自動で進み、いずれかのCPUの河に牌が積まれる
  await waitFor(
    () => {
      const cpuRivers = [
        screen.getByLabelText("CPU 南の捨て牌"),
        screen.getByLabelText("CPU 西の捨て牌"),
        screen.getByLabelText("CPU 北の捨て牌"),
      ];
      const total = cpuRivers.reduce(
        (sum, river) => sum + river.childElementCount,
        0,
      );
      expect(total).toBeGreaterThanOrEqual(1);
    },
    { timeout: 5000 },
  );
});
