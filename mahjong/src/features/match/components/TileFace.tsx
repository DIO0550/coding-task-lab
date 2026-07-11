import { Tile } from "../../../domains/tile/index.ts";
import { tileLabel } from "../utils/labels.ts";

type TileFaceProps = Readonly<{
  tile: Tile;
  /** normal=通常 / dimmed=鳴かれた牌 / sideways=リーチ宣言牌 */
  variant?: "normal" | "dimmed" | "sideways";
}>;

const VARIANT_CLASSES: Readonly<Record<string, string>> = {
  normal: "",
  dimmed: "opacity-40",
  sideways: "-rotate-90",
};

/** 1枚の牌の表示(白地に牌名。赤5は赤字) */
export const TileFace = ({ tile, variant = "normal" }: TileFaceProps) => (
  <span
    data-tile={Tile.toNotation(tile)}
    className={`inline-flex h-8 min-w-6 items-center justify-center rounded border border-zinc-400 bg-zinc-50 px-0.5 text-xs font-semibold shadow-sm ${
      tile.red ? "text-red-600" : "text-zinc-900"
    } ${VARIANT_CLASSES[variant]}`}
  >
    {tileLabel(tile)}
  </span>
);
