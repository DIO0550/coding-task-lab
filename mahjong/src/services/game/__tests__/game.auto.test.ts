import { expect, test } from "vitest";

import { Participant } from "../../../domains/participant/index.ts";
import type { CpuLevel } from "../../../domains/participant/index.ts";
import { Rule } from "../../../domains/rule/index.ts";
import { Game } from "../index.ts";
import {
  allCpuParticipants,
  playMatch,
  startedSession,
  totalPoints,
} from "./game-fixture.ts";

const TONPUU = Rule.with(Rule.default(), { length: "tonpuu" });

const cpuSeats = (level: CpuLevel): readonly Participant[] => [
  Participant.cpu("東", level),
  Participant.cpu("南", level),
  Participant.cpu("西", level),
  Participant.cpu("北", level),
];

test.each([1, 2, 3, 4, 5])(
  "4人ともCPUの東風戦は種 %i でも終局まで自動進行する",
  (seed) => {
    const finished = playMatch(startedSession(seed, TONPUU, allCpuParticipants()));
    expect(finished.status).toBe("match_end");
  },
  30000,
);

test("4人ともCPUの半荘戦も終局まで自動進行する", () => {
  const finished = playMatch(startedSession(11, Rule.default(), allCpuParticipants()));
  expect(finished.status).toBe("match_end");
}, 60000);

test("終局まで進めても場の合計点は100000点のまま保たれる", () => {
  const finished = playMatch(startedSession(2, TONPUU, allCpuParticipants()));
  expect(totalPoints(finished)).toBe(100000);
}, 30000);

test("終局すると4人分の順位が確定する", () => {
  const finished = playMatch(startedSession(3, TONPUU, allCpuParticipants()));
  expect(finished.ranking).toHaveLength(4);
}, 30000);

test.each(["beginner", "standard", "advanced"] as const)(
  "CPUレベル %s でも東風戦を終局まで進行できる",
  (level) => {
    const finished = playMatch(startedSession(6, TONPUU, cpuSeats(level)));
    expect(finished.status).toBe("match_end");
  },
  30000,
);

test("人間が含まれる対戦では人間の手番で自動進行が止まる", () => {
  const session = startedSession(4);
  const stopped = playMatch(session, 500);
  expect([stopped.status, stopped.round.turn]).toStrictEqual(["playing", 0]);
});

test("人間の手番では打牌の選択肢が提示される", () => {
  const stopped = playMatch(startedSession(4), 500);
  expect(
    Game.availableActions(stopped, 0).some(
      (action) => action.type === "discard",
    ),
  ).toBe(true);
});

test("CPUは自分の手番で必ず行動を返す", () => {
  const session = startedSession(9, TONPUU, allCpuParticipants());
  const drawn = Game.autoStep(session);
  const acted = drawn === null ? null : Game.autoStep(drawn);
  expect(acted?.round.seats[0].river.discards).toHaveLength(1);
});
