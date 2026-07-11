import type { Tile } from "../../../domains/tile/index.ts";
import { TileFace } from "./TileFace.tsx";

/** 卓中央に出す卓全体の情報。対局前は wallRemaining / doraIndicators を null にする */
export type TableSummary = Readonly<{
  kyoku: string;
  honba: number;
  riichiSticks: number;
  dealerName: string;
  wallRemaining: number | null;
  doraIndicators: readonly Tile[] | null;
}>;

type TableInfoProps = Readonly<{
  summary: TableSummary;
}>;

/** 卓全体の情報(局・本場・供託・親・残り山・ドラ表示牌) */
export const TableInfo = ({ summary }: TableInfoProps) => (
  <div
    data-testid="table-info"
    className="flex h-full flex-col items-center justify-center gap-1 rounded-lg bg-emerald-950/80 p-3 text-center"
  >
    <p data-testid="kyoku" className="text-2xl font-bold">
      {summary.kyoku}
    </p>
    <p className="flex gap-3 text-sm">
      <span data-testid="honba">{summary.honba}本場</span>
      <span data-testid="riichi-sticks">供託{summary.riichiSticks}本</span>
    </p>
    <p data-testid="dealer-name" className="text-sm">
      親: {summary.dealerName}
    </p>
    {summary.wallRemaining !== null && (
      <p data-testid="wall-remaining" className="text-sm">
        残り山{summary.wallRemaining}枚
      </p>
    )}
    {summary.doraIndicators !== null && (
      <div data-testid="dora" className="flex items-center gap-1 text-sm">
        <span>ドラ表示</span>
        {summary.doraIndicators.map((tile, index) => (
          <span key={index} data-testid="dora-indicator">
            <TileFace tile={tile} />
          </span>
        ))}
      </div>
    )}
  </div>
);
