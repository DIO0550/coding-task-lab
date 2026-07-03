import { Tile } from "../../domains/tile/index.ts";
import { Hand } from "../../domains/hand/index.ts";
import { Yaku } from "../../domains/yaku/index.ts";
import type { YakuEntry } from "../../domains/yaku/index.ts";
import { Fu } from "../../domains/fu/index.ts";
import { Score } from "../../domains/score/index.ts";
import type { ScoreResult } from "../../domains/score/index.ts";
import { WinContext } from "../../domains/win-context/index.ts";
import { parseCalcInput } from "./input.ts";

export type CalcSuccess = Readonly<{
  valid: true;
  yaku: readonly YakuEntry[];
  han: number;
  fu: number;
  score: ScoreResult;
}>;

export type CalcFailureReason = "no_yaku" | "not_winning_hand" | "invalid_input";

export type CalcFailure = Readonly<{
  valid: false;
  reason: CalcFailureReason;
}>;

export type CalcResult = CalcSuccess | CalcFailure;

const MAX_HAN_OUTPUT = 26;

const countDoraHan = (tiles: readonly Tile[], doraTiles: readonly Tile[]): number => {
  let han = 0;
  for (const dora of doraTiles) {
    const kind = Tile.kindIndex(dora);
    han += tiles.filter((tile) => Tile.kindIndex(tile) === kind).length;
  }
  return han;
};

type Candidate = Readonly<{
  yaku: readonly YakuEntry[];
  han: number;
  fu: number;
  score: ScoreResult;
}>;

/** 高点法: 総得点 → 翻数 → 符の順で高い解釈を採用(assumptions A15) */
const better = (a: Candidate, b: Candidate): Candidate => {
  if (b.score.total !== a.score.total) {
    return b.score.total > a.score.total ? b : a;
  }
  if (b.han !== a.han) {
    return b.han > a.han ? b : a;
  }
  return b.fu > a.fu ? b : a;
};

export const ScoreCalculator = {
  /** 入力JSON(パース済み)から点数計算結果を返す */
  calculate(raw: unknown): CalcResult {
    const input = parseCalcInput(raw);
    if (input === null) {
      return { valid: false, reason: "invalid_input" };
    }

    const wins = Hand.enumerateWins({
      concealedTiles: input.concealedTiles,
      melds: input.melds,
      winTile: input.winTile,
      winType: input.context.winType,
    });
    if (wins.length === 0) {
      return { valid: false, reason: "not_winning_hand" };
    }

    const allTiles = [...input.concealedTiles, ...input.melds.flatMap((meld) => meld.tiles)];
    const doraEntries: YakuEntry[] = [];
    const doraHan = countDoraHan(allTiles, input.dora);
    if (doraHan > 0) {
      doraEntries.push({ name: "dora", han: doraHan });
    }
    const uraDoraHan = countDoraHan(allTiles, input.uraDora);
    if (uraDoraHan > 0) {
      doraEntries.push({ name: "ura_dora", han: uraDoraHan });
    }
    const akaDoraHan = allTiles.filter((tile) => tile.red).length;
    if (akaDoraHan > 0) {
      doraEntries.push({ name: "aka_dora", han: akaDoraHan });
    }

    const scoreArgs = {
      isDealer: WinContext.isDealer(input.context),
      winType: input.context.winType,
      honba: input.context.honba,
      kyotaku: input.context.kyotaku,
    };

    let best: Candidate | null = null;
    for (const win of wins) {
      const detected = Yaku.detect(win, input.context);
      let candidate: Candidate;
      if (detected.kind === "yakuman") {
        candidate = {
          yaku: detected.yaku,
          han: Math.min(Yaku.totalHan(detected.yaku), MAX_HAN_OUTPUT),
          fu: Fu.calculate(win, input.context, { isPinfu: false }),
          score: Score.calculateYakuman({ multiplier: detected.multiplier, ...scoreArgs }),
        };
      } else {
        if (detected.yaku.length === 0) {
          continue;
        }
        const isPinfu = detected.yaku.some((entry) => entry.name === "pinfu");
        const fu = Fu.calculate(win, input.context, { isPinfu });
        const yaku = [...detected.yaku, ...doraEntries];
        const han = Yaku.totalHan(yaku);
        candidate = { yaku, han, fu, score: Score.calculate({ han, fu, ...scoreArgs }) };
      }
      best = best === null ? candidate : better(best, candidate);
    }
    if (best === null) {
      return { valid: false, reason: "no_yaku" };
    }
    return { valid: true, yaku: best.yaku, han: best.han, fu: best.fu, score: best.score };
  },
} as const;
