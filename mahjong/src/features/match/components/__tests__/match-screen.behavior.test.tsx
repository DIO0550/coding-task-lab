import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { MatchScreen } from "../index";

test("対戦開始設定とルール設定が表示される", () => {
  render(<MatchScreen />);

  expect(screen.getByText("対戦開始設定")).toBeInTheDocument();
  expect(screen.getAllByText("人間").length).toBeGreaterThan(0);
  expect(screen.getAllByText("CPU").length).toBeGreaterThan(0);
  expect(screen.getAllByText("入門").length).toBeGreaterThan(0);
  expect(screen.getByText("東風戦")).toBeInTheDocument();
  expect(screen.getByText("半荘戦")).toBeInTheDocument();
  expect(screen.getByText("喰いタン")).toBeInTheDocument();
});

test("初期表示は東一局0本場供託0本で各家25000点を表示する", () => {
  render(<MatchScreen />);

  expect(screen.getByText("東一局")).toBeInTheDocument();
  expect(screen.getByText("0本場")).toBeInTheDocument();
  expect(screen.getByText("0本")).toBeInTheDocument();
  expect(screen.getAllByText("25,000点").length).toBeGreaterThanOrEqual(4);
});

test("人間とCPUレベルを選択できる", () => {
  render(<MatchScreen />);

  const seatType = screen.getAllByDisplayValue("CPU")[0];
  expect(seatType).toBeInTheDocument();

  const cpuLevel = screen.getAllByLabelText(/CPUレベル/)[1];
  fireEvent.change(cpuLevel, { target: { value: "advanced" } });
  expect((cpuLevel as HTMLSelectElement).value).toBe("advanced");

  fireEvent.change(seatType, { target: { value: "human" } });
  expect((seatType as HTMLSelectElement).value).toBe("human");
});

test("対戦開始で配牌され人間の手牌が表示される", () => {
  render(<MatchScreen />);

  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));

  expect(screen.queryByText("対戦開始で配牌されます。")).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /牌 / }).length).toBeGreaterThan(13);
});

test("人間の手番で打牌するとCPU手番が自動進行して表示が更新される", () => {
  render(<MatchScreen />);

  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  const firstTile = screen.getAllByRole("button", { name: /牌 / }).find((button) => !button.hasAttribute("disabled"));
  expect(firstTile).toBeDefined();
  if (firstTile !== undefined) {
    fireEvent.click(firstTile);
  }

  expect(screen.getByText(/現在の手番:/)).toBeInTheDocument();
  expect(screen.getAllByText(/の河/).length).toBe(4);
});

test("和了または流局が発生すると結果と点数反映操作が表示される", () => {
  render(<MatchScreen />);

  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));

  for (let count = 0; count < 90 && screen.queryByText("結果確定") === null; count += 1) {
    const pass = screen.queryByRole("button", { name: "パス" });
    if (pass !== null && !pass.hasAttribute("disabled")) {
      fireEvent.click(pass);
      continue;
    }
    const ron = screen.queryByRole("button", { name: "ロン" });
    if (ron !== null && !ron.hasAttribute("disabled")) {
      fireEvent.click(ron);
      continue;
    }
    const tile = screen.getAllByRole("button", { name: /牌 / }).find((button) => !button.hasAttribute("disabled"));
    if (tile === undefined) {
      break;
    }
    fireEvent.click(tile);
  }

  expect(screen.getByText(/和了結果|流局結果/)).toBeInTheDocument();
  expect(screen.getByText("結果確定")).toBeInTheDocument();
  fireEvent.click(screen.getByText("結果確定"));
  expect(screen.getAllByText(/東|南/).length).toBeGreaterThan(0);
}, 15000);
