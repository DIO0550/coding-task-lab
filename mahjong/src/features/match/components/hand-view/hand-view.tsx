import { Tile } from "@/src/domains/tile";

import { Labels } from "../../utils/labels";
import { TileGlyph } from "../tile-glyph";

/**
 * 表示席の手牌。打牌できる牌だけがボタンとして押せる。ツモ牌は右端に離して表示する。
 */
type Props = Readonly<{
  hand: readonly Tile[];
  drawnTile: Tile | null;
  /** いま打牌できる牌 */
  discardable: readonly Tile[];
  onDiscard: (tile: Tile) => void;
}>;

function TileButton({ tile, enabled, onDiscard }: Readonly<{ tile: Tile; enabled: boolean; onDiscard: (tile: Tile) => void }>) {
  return (
    <button
      type="button"
      aria-label={Labels.tile(tile)}
      disabled={!enabled}
      onClick={() => onDiscard(tile)}
      className={`rounded transition ${enabled ? "cursor-pointer hover:-translate-y-1 focus-visible:-translate-y-1" : "cursor-default opacity-60"}`}
    >
      <TileGlyph tile={tile} size="lg" />
    </button>
  );
}

export function HandView({ hand, drawnTile, discardable, onDiscard }: Props) {
  const isEnabled = (tile: Tile) => discardable.includes(tile);
  return (
    <div className="flex items-end gap-1 rounded-lg bg-emerald-900/60 p-2" aria-label="手牌" data-testid="hand-view">
      {hand.map((tile, index) => (
        <TileButton key={`${tile}-${index}`} tile={tile} enabled={isEnabled(tile)} onDiscard={onDiscard} />
      ))}
      {drawnTile === null ? null : (
        <span className="ml-3" data-testid="drawn-tile">
          <TileButton tile={drawnTile} enabled={isEnabled(drawnTile)} onDiscard={onDiscard} />
        </span>
      )}
    </div>
  );
}
