import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Participant } from "../../../../../domains/participant/index.ts";
import { Rule } from "../../../../../domains/rule/index.ts";
import { MatchSetup } from "../index.ts";

const setup = () => {
  const onChangeParticipant = vi.fn();
  const onChangeRule = vi.fn();
  const onStart = vi.fn();
  render(
    <MatchSetup
      participants={Participant.defaultSeats()}
      rule={Rule.default()}
      onChangeParticipant={onChangeParticipant}
      onChangeRule={onChangeRule}
      onStart={onStart}
    />,
  );
  return { onChangeParticipant, onChangeRule, onStart };
};

test.each(["東家", "南家", "西家", "北家"])(
  "%s の操作種別・表示名・CPUレベルを設定できる",
  (house) => {
    setup();
    expect(screen.getByLabelText(`${house}の操作種別`)).toBeInTheDocument();
    expect(screen.getByLabelText(`${house}の表示名`)).toBeInTheDocument();
    expect(screen.getByLabelText(`${house}のCPUレベル`)).toBeInTheDocument();
  },
);

test("初期状態では東家が人間、他の3席がCPUとして表示される", () => {
  setup();
  expect(screen.getByLabelText("東家の操作種別")).toHaveValue("human");
  expect(screen.getByLabelText("南家の操作種別")).toHaveValue("cpu");
  expect(screen.getByLabelText("西家の操作種別")).toHaveValue("cpu");
  expect(screen.getByLabelText("北家の操作種別")).toHaveValue("cpu");
});

test("人間が操作する席ではCPUレベルを選べない", () => {
  setup();
  expect(screen.getByLabelText("東家のCPUレベル")).toBeDisabled();
  expect(screen.getByLabelText("南家のCPUレベル")).toBeEnabled();
});

test("CPUレベルは入門・標準・上級から選べる", () => {
  setup();
  const levels = screen.getByLabelText("南家のCPUレベル");
  expect(levels).toHaveTextContent("入門");
  expect(levels).toHaveTextContent("標準");
  expect(levels).toHaveTextContent("上級");
});

test("表示名を変更するとその席の設定が通知される", () => {
  const { onChangeParticipant } = setup();
  fireEvent.change(screen.getByLabelText("東家の表示名"), {
    target: { value: "たろう" },
  });
  expect(onChangeParticipant).toHaveBeenCalledWith(
    0,
    Participant.human("たろう"),
  );
});

test("操作種別をCPUに変更するとその席の設定が通知される", () => {
  const { onChangeParticipant } = setup();
  fireEvent.change(screen.getByLabelText("東家の操作種別"), {
    target: { value: "cpu" },
  });
  expect(onChangeParticipant).toHaveBeenCalledWith(
    0,
    Participant.cpu("あなた", "standard"),
  );
});

test("CPUレベルを上級に変更するとその席の設定が通知される", () => {
  const { onChangeParticipant } = setup();
  fireEvent.change(screen.getByLabelText("南家のCPUレベル"), {
    target: { value: "advanced" },
  });
  expect(onChangeParticipant).toHaveBeenCalledWith(
    1,
    Participant.cpu("CPU下家", "advanced"),
  );
});

test("ルール設定の初期値は半荘戦・25,000点持ち・30,000点返しになっている", () => {
  setup();
  expect(screen.getByLabelText("対戦形式")).toHaveValue("hanchan");
  expect(screen.getByLabelText("持ち点")).toHaveValue("25000");
  expect(screen.getByLabelText("返し点")).toHaveValue("30000");
});

test.each(["喰いタン", "後付け", "赤ドラ", "CPU自動和了"])(
  "ルール設定の %s は初期値ありで表示される",
  (label) => {
    setup();
    expect(screen.getByLabelText(label)).toBeChecked();
  },
);

test("対戦形式を東風戦に変更すると通知される", () => {
  const { onChangeRule } = setup();
  fireEvent.change(screen.getByLabelText("対戦形式"), {
    target: { value: "tonpuu" },
  });
  expect(onChangeRule).toHaveBeenCalledWith(
    Rule.with(Rule.default(), { length: "tonpuu" }),
  );
});

test("持ち点を30,000点開始に変更すると通知される", () => {
  const { onChangeRule } = setup();
  fireEvent.change(screen.getByLabelText("持ち点"), {
    target: { value: "30000" },
  });
  expect(onChangeRule).toHaveBeenCalledWith(
    Rule.with(Rule.default(), { startingPoints: 30000 }),
  );
});

test("返し点をなしに変更すると通知される", () => {
  const { onChangeRule } = setup();
  fireEvent.change(screen.getByLabelText("返し点"), {
    target: { value: "none" },
  });
  expect(onChangeRule).toHaveBeenCalledWith(
    Rule.with(Rule.default(), { returnPoints: null }),
  );
});

test.each([
  ["喰いタン", "kuitan"],
  ["後付け", "atozuke"],
  ["赤ドラ", "redDora"],
  ["CPU自動和了", "cpuAutoWin"],
])("%s をなしに変更すると通知される", (label, key) => {
  const { onChangeRule } = setup();
  fireEvent.click(screen.getByLabelText(label));
  expect(onChangeRule).toHaveBeenCalledWith(
    expect.objectContaining({ [key]: false }),
  );
});

test("対戦開始を押すと対戦の開始が通知される", () => {
  const { onStart } = setup();
  fireEvent.click(screen.getByRole("button", { name: "対戦開始" }));
  expect(onStart).toHaveBeenCalledTimes(1);
});
