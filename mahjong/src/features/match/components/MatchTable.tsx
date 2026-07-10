import type { GameView, MatchConfig } from "@/src/domains/game/index.ts";

import { TileChip } from "./TileChip.tsx";

const ROUND_WIND_LABEL: Readonly<Record<"ton" | "nan", string>> = { ton: "東", nan: "南" };
const KYOKU_LABEL = ["", "一", "二", "三", "四"] as const;

export type MatchTableProps = Readonly<{ view: GameView; players: MatchConfig["players"] }>;

/** 卓全体の情報(局・本場・供託・親・ドラ表示牌・残り山枚数)を表示する。 */
export const MatchTable = ({ view, players }: MatchTableProps) => {
  const dealerName = players[view.dealerSeat].name;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
      <span className="text-lg font-bold">
        {ROUND_WIND_LABEL[view.roundWind]}
        {KYOKU_LABEL[view.kyokuNumber]}局
      </span>
      <span>{view.honba}本場</span>
      <span>供託{view.kyotaku}本</span>
      <span>親: {dealerName}</span>
      <span>残り山{view.remainingWallCount}枚</span>
      <span className="flex items-center gap-1">
        ドラ表示牌:
        <span className="flex gap-1">
          {view.doraIndicators.map((tile, i) => (
            <TileChip key={i} tile={tile} />
          ))}
        </span>
      </span>
    </div>
  );
};
