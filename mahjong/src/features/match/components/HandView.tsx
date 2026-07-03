import type { Tile } from "@/src/domains/tile";
import { TileView } from "./TileView";

type HandViewProps = Readonly<{
  tiles: readonly Tile[];
  drawn: Tile | null;
  selectableTiles: readonly Tile[];
  onSelect: (tile: Tile) => void;
}>;

/** 自分の手牌。打牌可能な牌はボタンとして操作できる */
export function HandView({
  tiles,
  drawn,
  selectableTiles,
  onSelect,
}: HandViewProps) {
  const renderTile = (tile: Tile, key: string, extraClass = "") => {
    const selectable = selectableTiles.includes(tile);
    return (
      <button
        key={key}
        type="button"
        disabled={!selectable}
        aria-label={`${tile}を切る`}
        data-tile={tile}
        className={`rounded transition-transform ${extraClass} ${
          selectable
            ? "cursor-pointer hover:-translate-y-1 focus:-translate-y-1"
            : "cursor-default opacity-95"
        }`}
        onClick={() => onSelect(tile)}
      >
        <TileView tile={tile} />
      </button>
    );
  };

  return (
    <div className="flex items-end gap-0.5" aria-label="自分の手牌">
      {tiles.map((tile, i) => renderTile(tile, `hand-${i}-${tile}`))}
      {drawn !== null && renderTile(drawn, `drawn-${drawn}`, "ml-3")}
    </div>
  );
}
