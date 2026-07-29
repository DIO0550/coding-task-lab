import type { Tile } from "../../../../domains/tile/index.ts";
import type { Wind } from "../../../../domains/wind/index.ts";
import {
  honbaLabel,
  remainingLabel,
  riichiSticksLabel,
  roundLabel,
} from "../../utils/labels/index.ts";
import { TileView } from "../tile-view/index.ts";

export type TableInfoProps = Readonly<{
  roundWind: Wind;
  roundNumber: number;
  honba: number;
  riichiSticks: number;
  /** 残りツモ可能枚数。 */
  remaining: number;
  doraIndicators: readonly Tile[];
  dealerName: string;
}>;

const ITEM_CLASS = "text-sm text-stone-700 dark:text-stone-300";

export function TableInfo({
  roundWind,
  roundNumber,
  honba,
  riichiSticks,
  remaining,
  doraIndicators,
  dealerName,
}: TableInfoProps): React.JSX.Element {
  return (
    <section
      aria-label="卓情報"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-stone-300 bg-stone-100/80 px-4 py-2 dark:border-stone-700 dark:bg-stone-900/80"
    >
      <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
        {roundLabel(roundWind, roundNumber)}
      </h2>
      <p className={ITEM_CLASS}>{honbaLabel(honba)}</p>
      <p className={ITEM_CLASS}>{riichiSticksLabel(riichiSticks)}</p>
      <p className={ITEM_CLASS}>{remainingLabel(remaining)}</p>
      <p className={ITEM_CLASS}>{`親: ${dealerName}`}</p>
      <div className="flex items-center gap-2">
        <span className={ITEM_CLASS}>ドラ表示牌</span>
        <span role="list" aria-label="ドラ表示牌" className="flex gap-0.5">
          {doraIndicators.map((tile, index) => (
            <span key={index} role="listitem" className="inline-flex">
              <TileView tile={tile} size="sm" />
            </span>
          ))}
        </span>
      </div>
    </section>
  );
}
