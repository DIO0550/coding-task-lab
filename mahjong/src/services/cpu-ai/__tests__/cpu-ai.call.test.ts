import { test, expect } from "vitest";

import { RuleConfig } from "@/src/domains/rule-config";
import { TableView } from "@/src/domains/table-view";
import type { Tile } from "@/src/domains/tile";
import { GameEngine } from "@/src/services/game-engine";
import { discard, startGame } from "@/src/services/game-engine/__tests__/fixtures";
import { createSeededRandom } from "@/src/utils/seeded-random";

import { CpuAi } from "..";

const rng = () => createSeededRandom(7);

/** 白の対子を持つ手 */
const HAKU_PAIR: readonly Tile[] = ["haku", "haku", "2m", "5m", "8m", "2s", "5s", "8s", "3p", "6p", "9p", "nan", "sha"];
/** 5p の対子を持つ手(役牌ではない) */
const FIVE_PAIR: readonly Tile[] = ["5p", "5p", "2m", "5m", "8m", "2s", "5s", "8s", "3p", "9p", "nan", "sha", "pei"];

test("入門 CPU は役牌をポンし、役牌でない牌はポンしない", () => {
  const yakuhai = discard(startGame({ hands: [null, null, HAKU_PAIR, null], draws: ["haku"] }), 0, "haku");
  const ponned = CpuAi.decide(TableView.from(yakuhai, 2), GameEngine.availableActions(yakuhai, 2), "beginner", yakuhai.rules, rng());
  expect(ponned).toMatchObject({ type: "pon", tiles: ["haku", "haku"] });
  const plain = discard(startGame({ hands: [null, null, FIVE_PAIR, null], draws: ["5p"] }), 0, "5p");
  const passed = CpuAi.decide(TableView.from(plain, 2), GameEngine.availableActions(plain, 2), "beginner", plain.rules, rng());
  expect(passed).toStrictEqual({ type: "pass" });
});

test("標準 CPU は喰いタンが確定し向聴数が下がるチーをする", () => {
  // 南家: 234m 56m 333s 66s 46p 8p の一向聴。5p をチーすれば断么九確定のテンパイ形になる
  const hand: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "3s", "3s", "3s", "6s", "6s", "4p", "6p", "8p"];
  const game = discard(startGame({ hands: [null, hand, null, null], draws: ["5p"] }), 0, "5p");
  const decided = CpuAi.decide(TableView.from(game, 1), GameEngine.availableActions(game, 1), "standard", game.rules, rng());
  expect(decided).toMatchObject({ type: "chi", tiles: ["4p", "6p"] });
});

test("喰いタンなしの設定では役が確定しないチーをせずパスする", () => {
  const hand: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "3s", "3s", "3s", "6s", "6s", "4p", "6p", "8p"];
  const game = discard(startGame({ hands: [null, hand, null, null], draws: ["5p"], rules: { kuitan: false } }), 0, "5p");
  const rules = RuleConfig.with(game.rules, { kuitan: false });
  const decided = CpuAi.decide(TableView.from(game, 1), GameEngine.availableActions(game, 1), "standard", rules, rng());
  expect(decided).toStrictEqual({ type: "pass" });
});

test("標準 CPU はテンパイしている手を崩す鳴きをしない", () => {
  const tenpai: readonly Tile[] = ["2m", "3m", "4m", "5m", "6m", "7m", "3s", "3s", "3s", "6s", "6s", "4p", "5p"];
  const game = discard(startGame({ hands: [null, null, tenpai, null], draws: ["3s"] }), 0, "3s");
  expect(game.round.phase).toMatchObject({ type: "call", candidates: [2] });
  const decided = CpuAi.decide(TableView.from(game, 2), GameEngine.availableActions(game, 2), "standard", game.rules, rng());
  expect(decided).toStrictEqual({ type: "pass" });
});

test("上級 CPU は他家がリーチ中で二向聴以上なら鳴かずにパスする", () => {
  const game = discard(startGame({ hands: [null, null, HAKU_PAIR, null], draws: ["haku"] }), 0, "haku");
  const withRiichi = {
    ...game,
    round: {
      ...game.round,
      seats: game.round.seats.map((seat, index) =>
        index === 3 ? { ...seat, riichi: "riichi" as const, river: [{ tile: "pei" as const, isRiichi: true, calledBy: null }] } : seat,
      ),
    },
  };
  const decided = CpuAi.decide(TableView.from(withRiichi, 2), GameEngine.availableActions(withRiichi, 2), "advanced", game.rules, rng());
  expect(decided).toStrictEqual({ type: "pass" });
});

test("CPU だけの卓では advanceCpu を繰り返すと局が終わる", () => {
  const game = startGame({
    hands: [null, null, null, null],
    players: [
      { name: "A", kind: "cpu", level: "beginner" },
      { name: "B", kind: "cpu", level: "standard" },
      { name: "C", kind: "cpu", level: "advanced" },
      { name: "D", kind: "cpu", level: "standard" },
    ],
  });
  const random = rng();
  const ended = Array.from({ length: 400 }).reduce<ReturnType<typeof startGame>>(
    (current) => (current.round.phase.type === "ended" ? current : GameEngine.advanceCpu(current, random)),
    game,
  );
  expect(ended.round.phase.type).toBe("ended");
});
