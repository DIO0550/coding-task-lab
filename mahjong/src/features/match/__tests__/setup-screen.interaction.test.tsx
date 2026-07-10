import { fireEvent, render, screen, within } from "@testing-library/react";
import { test, expect } from "vitest";

import { MatchScreen } from "../index.ts";

test("席の操作種別を人間からCPUに切り替えるとCPUレベルの選択肢が表示される", () => {
  render(<MatchScreen />);

  // 席1(既定: 人間)にはまだCPUレベルの選択肢が無い。
  expect(screen.getAllByRole("radio", { name: "入門" })).toHaveLength(3);

  const seat1CpuRadios = screen.getAllByRole("radio", { name: "CPU" });
  fireEvent.click(seat1CpuRadios[0] as HTMLElement);

  expect(screen.getAllByRole("radio", { name: "人間" })[0]).not.toBeChecked();
  expect(screen.getAllByRole("radio", { name: "CPU" })[0]).toBeChecked();
  // 席1がCPUになったのでCPUレベルの選択肢(入門)が1つ増える。
  expect(screen.getAllByRole("radio", { name: "入門" })).toHaveLength(4);
});

test("CPUレベルを標準から入門に切り替えられる", () => {
  render(<MatchScreen />);

  const beginnerRadios = screen.getAllByRole("radio", { name: "入門" });
  const firstCpuBeginner = beginnerRadios[0] as HTMLElement;
  expect(firstCpuBeginner).not.toBeChecked();

  fireEvent.click(firstCpuBeginner);

  expect(firstCpuBeginner).toBeChecked();
  // 「標準」の選択肢自体は3席分そのまま存在するが、チェック済みなのは残り2席のみになる。
  const standardRadios = screen.getAllByRole("radio", { name: "標準" });
  expect(standardRadios).toHaveLength(3);
  const checkedStandardCount = standardRadios.filter((radio) => (radio as HTMLInputElement).checked).length;
  expect(checkedStandardCount).toBe(2);
});

test("表示名を変更できる", () => {
  render(<MatchScreen />);

  const nameInputs = screen.getAllByRole("textbox");
  const firstNameInput = nameInputs[0] as HTMLInputElement;
  fireEvent.change(firstNameInput, { target: { value: "テスト太郎" } });

  expect(firstNameInput.value).toBe("テスト太郎");
});

test("ルール設定(対戦形式)を東風戦に切り替えられる", () => {
  render(<MatchScreen />);

  const tonpuuRadio = screen.getByRole("radio", { name: "東風戦" });
  expect(tonpuuRadio).not.toBeChecked();

  fireEvent.click(tonpuuRadio);

  expect(tonpuuRadio).toBeChecked();
  expect(screen.getByRole("radio", { name: "半荘戦" })).not.toBeChecked();
});

test("喰いタンをなしに切り替えられる", () => {
  render(<MatchScreen />);

  const kuitanGroup = screen.getByRole("group", { name: "喰いタン" });
  const kuitanNo = within(kuitanGroup).getByRole("radio", { name: "なし" });
  expect(kuitanNo).not.toBeChecked();

  fireEvent.click(kuitanNo);

  expect(kuitanNo).toBeChecked();
  expect(within(kuitanGroup).getByRole("radio", { name: "あり" })).not.toBeChecked();
});
