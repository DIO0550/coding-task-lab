import { expect, test } from "vitest";

import type { CpuLevel } from "../../../../domains/participant/index.ts";
import { GameAction } from "../../action/index.ts";
import { Cpu } from "../index.ts";
import {
  claimOf,
  discardActions,
  handOf,
  viewOf,
} from "./player-view-fixture.ts";

const LEVELS: readonly CpuLevel[] = ["beginner", "standard", "advanced"];

test.each(LEVELS)("%s のCPUは自分の手番で打牌を選ぶ", (level) => {
  const hand = handOf("1m 3m 5m 7m 9m 2p 4p 6p 8p 1s 3s 5s ton nan");
  const view = viewOf({ hand, actions: discardActions(hand) });

  expect(Cpu.decide(view, level)?.type).toBe("discard");
});

test.each(LEVELS)("%s のCPUはツモ和了できるなら必ずツモを宣言する", (level) => {
  const hand = handOf("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton chun chun chun");
  const view = viewOf({
    hand,
    actions: [...discardActions(hand), GameAction.tsumo()],
  });

  expect(Cpu.decide(view, level)).toStrictEqual(GameAction.tsumo());
});

test.each(LEVELS)("%s のCPUはロン和了できるなら必ずロンを宣言する", (level) => {
  const hand = handOf("1m 2m 3m 4p 5p 6p 7s 8s 9s ton ton chun chun");
  const view = viewOf({
    hand,
    phase: "claim",
    turn: 1,
    claim: claimOf("chun", 1),
    actions: [GameAction.ron(), GameAction.pass()],
  });

  expect(Cpu.decide(view, level)).toStrictEqual(GameAction.ron());
});

test.each(LEVELS)(
  "%s のCPUが打牌局面で返す行動は選べる行動に含まれる",
  (level) => {
    const hand = handOf("1m 2m 3m 5m 6m 4p 5p 6p 7s 8s 9s ton ton nan");
    const view = viewOf({
      hand,
      actions: [...discardActions(hand), GameAction.riichi(13)],
    });

    expect(view.actions).toContainEqual(Cpu.decide(view, level));
  },
);

test.each(LEVELS)(
  "%s のCPUが鳴き局面で返す行動は選べる行動に含まれる",
  (level) => {
    const hand = handOf("2m 3m 4m 5p 6p 7p 2s 3s 4s haku haku 1m 9s");
    const view = viewOf({
      hand,
      phase: "claim",
      turn: 1,
      claim: claimOf("haku", 1),
      actions: [
        GameAction.pon(handOf("haku haku").concealed),
        GameAction.pass(),
      ],
    });

    expect(view.actions).toContainEqual(Cpu.decide(view, level));
  },
);

test.each(LEVELS)("%s のCPUは選べる行動が無ければ何も選ばない", (level) => {
  const view = viewOf({ actions: [] });

  expect(Cpu.decide(view, level)).toBeNull();
});

test.each(LEVELS)("%s のCPUは見送りしか選べなければ見送る", (level) => {
  const view = viewOf({
    phase: "claim",
    turn: 1,
    claim: claimOf("1m", 1),
    actions: [GameAction.pass()],
  });

  expect(Cpu.decide(view, level)).toStrictEqual(GameAction.pass());
});

test.each(LEVELS)("%s のCPUは同じ状況からは常に同じ行動を選ぶ", (level) => {
  const hand = handOf("1m 3m 5m 7m 9m 2p 4p 6p 8p 1s 3s 5s ton nan");
  const view = viewOf({ hand, actions: discardActions(hand) });

  expect(Cpu.decide(view, level)).toStrictEqual(Cpu.decide(view, level));
});
