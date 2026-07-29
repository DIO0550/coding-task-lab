"use client";

import { Tile } from "../../../../domains/tile/index.ts";
import { TileView } from "../tile-view/index.ts";
import type { TileState } from "../tile-view/index.ts";

export type HandViewProps = Readonly<{
  /** 純手牌。位置(index)は selectableIndexes と対応する。 */
  tiles: readonly Tile[];
  /** ツモ牌。純手牌に含まれる場合はその牌を離して表示する。 */
  drawn: Tile | null;
  /** 選択できる純手牌の位置。 */
  selectableIndexes: readonly number[];
  onSelectTile?: (index: number) => void;
  /** 裏向きで表示する(他家の手牌)。 */
  concealed?: boolean;
}>;

type HandEntry = Readonly<{ tile: Tile; index: number }>;

/** ツモ牌が純手牌のどの位置にあるか。含まれない場合は -1。 */
const drawnIndexOf = (tiles: readonly Tile[], drawn: Tile | null): number => {
  if (drawn === null) {
    return -1;
  }
  return tiles.reduce(
    (found, tile, index) => (Tile.compare(tile, drawn) === 0 ? index : found),
    -1,
  );
};

const tileState = (
  selectable: boolean,
  hasHandler: boolean,
): TileState | undefined => {
  if (selectable) {
    return "selectable";
  }
  return hasHandler ? "disabled" : "default";
};

export function HandView({
  tiles,
  drawn,
  selectableIndexes,
  onSelectTile,
  concealed = false,
}: HandViewProps): React.JSX.Element {
  const drawnIndex = drawnIndexOf(tiles, drawn);
  const handTiles: readonly HandEntry[] = tiles
    .map((tile, index) => ({ tile, index }))
    .filter((entry) => entry.index !== drawnIndex);
  const drawnEntry: HandEntry | null =
    drawn === null
      ? null
      : { tile: drawn, index: drawnIndex >= 0 ? drawnIndex : tiles.length };

  const renderTile = (entry: HandEntry, label?: string): React.JSX.Element => {
    const selectable = selectableIndexes.includes(entry.index);
    const hasHandler = onSelectTile !== undefined;
    return (
      <TileView
        key={entry.index}
        tile={entry.tile}
        size="lg"
        state={tileState(selectable, hasHandler)}
        label={label}
        onClick={
          selectable && hasHandler ? () => onSelectTile(entry.index) : undefined
        }
      />
    );
  };

  if (concealed) {
    return (
      <div
        role="group"
        aria-label="伏せた手牌"
        className="flex items-end gap-0.5"
      >
        {tiles.map((_, index) => (
          <TileView.Back key={index} size="sm" />
        ))}
        {drawn === null ? null : (
          <span className="ml-2 inline-flex">
            <TileView.Back size="sm" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div role="group" aria-label="手牌" className="flex items-end gap-0.5">
      {handTiles.map((entry) => renderTile(entry))}
      {drawnEntry === null ? null : (
        <span className="ml-3 inline-flex">
          {renderTile(drawnEntry, "ツモ牌")}
        </span>
      )}
    </div>
  );
}
