import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { MatchScreen } from "../index.ts";

const HOUSES = ["東家", "南家", "西家", "北家"] as const;

/** 4席すべてをCPUにして対戦を開始する(人間の入力なしで局が進む)。 */
const startCpuOnlyMatch = () => {
  render(<MatchScreen autoAdvanceMs={0} />);
  HOUSES.forEach((house) => {
    fireEvent.change(screen.getByLabelText(`${house}の操作種別`), {
      target: { value: "cpu" },
    });
  });
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
};

const waitForResult = async (): Promise<HTMLElement> =>
  await screen.findByRole(
    "region",
    { name: "局結果" },
    { timeout: 90000 },
  );

/** 起家(表示名「あなた」)の点数移動を読み取る。 */
const firstSeatDelta = (panel: HTMLElement): number => {
  const label =
    within(panel)
      .getByRole("list", { name: "点数移動" })
      .querySelector('[aria-label^="あなた "]')
      ?.getAttribute("aria-label") ?? "";
  const matched = /([+-])([\d,]+)/.exec(label);
  return matched === null
    ? 0
    : Number(`${matched[1]}${matched[2].replaceAll(",", "")}`);
};

/** 起家の持ち点表示を読み取る。 */
const firstSeatPoints = (): number => {
  const text =
    within(screen.getByLabelText(/あなた$/)).getByText(/^[\d,]+点$/)
      .textContent ?? "0点";
  return Number(text.replace("点", "").replaceAll(",", ""));
};

test(
  "CPU同士の対戦では和了または流局の結果が自動的に表示される",
  async () => {
    startCpuOnlyMatch();
    expect(await waitForResult()).toBeInTheDocument();
  },
  120000,
);

test(
  "局結果には点数移動が表示される",
  async () => {
    startCpuOnlyMatch();
    const panel = await waitForResult();
    expect(
      within(panel).getByRole("list", { name: "点数移動" }),
    ).toBeInTheDocument();
  },
  120000,
);

test(
  "結果を確定すると点数移動が持ち点に反映される",
  async () => {
    startCpuOnlyMatch();
    const panel = await waitForResult();
    const delta = firstSeatDelta(panel);
    const before = firstSeatPoints();
    fireEvent.click(within(panel).getByRole("button", { name: "確定" }));
    await waitFor(() => expect(firstSeatPoints()).toBe(before + delta));
  },
  120000,
);

test(
  "結果を確定すると結果表示が閉じて対戦が続く",
  async () => {
    startCpuOnlyMatch();
    const panel = await waitForResult();
    fireEvent.click(within(panel).getByRole("button", { name: "確定" }));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "局結果" })).toBeNull(),
    );
  },
  120000,
);
