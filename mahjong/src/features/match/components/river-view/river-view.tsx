import type { Discard, River } from "../../../../domains/river/index.ts";
import { TileView } from "../tile-view/index.ts";
import type { TileSize } from "../tile-view/index.ts";

export type RiverViewProps = Readonly<{
  river: River;
  size?: "sm" | "md";
}>;

/** 河は6枚ごとに折り返す。 */
const COLUMNS = 6;

const CELL_CLASS: Readonly<Record<"sm" | "md", string>> = {
  sm: "h-8 w-6",
  md: "h-10 w-7",
};

/** 横向きに置くリーチ宣言牌は、回転後の幅ぶんセルを広げて重なりを防ぐ。 */
const ROTATED_CELL_CLASS: Readonly<Record<"sm" | "md", string>> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

/** 牌名に添える状態(リーチ宣言牌・鳴かれた牌)。 */
const discardLabel = (discard: Discard): string | undefined => {
  if (discard.riichi) {
    return "リーチ宣言牌";
  }
  return discard.called ? "鳴かれ" : undefined;
};

export function RiverView({
  river,
  size = "sm",
}: RiverViewProps): React.JSX.Element {
  const tileSize: TileSize = size;
  return (
    <div
      role="list"
      aria-label="捨て牌"
      className="grid w-max gap-px"
      style={{ gridTemplateColumns: `repeat(${COLUMNS}, min-content)` }}
    >
      {river.discards.map((discard, index) => (
        <span
          key={index}
          role="listitem"
          className={`inline-flex items-center justify-center ${discard.riichi ? ROTATED_CELL_CLASS[size] : CELL_CLASS[size]}`}
        >
          <span className={discard.riichi ? "inline-flex rotate-90" : ""}>
            <TileView
              tile={discard.tile}
              size={tileSize}
              state={discard.called ? "dimmed" : "default"}
              label={discardLabel(discard)}
            />
          </span>
        </span>
      ))}
    </div>
  );
}
