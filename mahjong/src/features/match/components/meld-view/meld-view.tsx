import type { Meld } from "../../../../domains/meld/index.ts";
import { tilesLabel } from "../../utils/labels/index.ts";
import { TileView } from "../tile-view/index.ts";
import type { TileSize } from "../tile-view/index.ts";

export type MeldViewProps = Readonly<{
  melds: readonly Meld[];
  size?: "sm" | "md";
}>;

const MELD_TYPE_LABEL: Readonly<Record<string, string>> = {
  chi: "チー",
  pon: "ポン",
  kan: "カン",
  ankan: "暗槓",
};

const meldLabel = (meld: Meld): string => {
  const type = meld.added ? "加槓" : MELD_TYPE_LABEL[meld.type];
  return `${type} ${tilesLabel(meld.tiles)}`;
};

/** 暗槓は両端を伏せる(両端が裏向き)。 */
const isFaceDown = (meld: Meld, index: number): boolean =>
  meld.type === "ankan" && (index === 0 || index === meld.tiles.length - 1);

export function MeldView({
  melds,
  size = "sm",
}: MeldViewProps): React.JSX.Element {
  const tileSize: TileSize = size;
  return (
    <div role="list" aria-label="鳴き面子" className="flex flex-wrap gap-2">
      {melds.map((meld, meldIndex) => (
        <div
          key={meldIndex}
          role="listitem"
          aria-label={meldLabel(meld)}
          className="flex items-end gap-px"
        >
          {meld.tiles.map((tile, tileIndex) =>
            isFaceDown(meld, tileIndex) ? (
              <TileView.Back key={tileIndex} size={tileSize} />
            ) : (
              <TileView key={tileIndex} tile={tile} size={tileSize} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
