"use client";

import type { Tile } from "../../../../domains/tile/index.ts";
import {
  tileDigitLabel,
  tileLabel,
  tileSuitLabel,
} from "../../utils/labels/index.ts";

/** 牌の表示サイズ。 */
export type TileSize = "sm" | "md" | "lg";

/**
 * 牌の表示状態。
 * selectable は選択できる牌、disabled は選べない牌、dimmed は鳴かれた牌などの減光表示。
 */
export type TileState = "default" | "selectable" | "disabled" | "dimmed";

export type TileViewProps = Readonly<{
  tile: Tile;
  size?: TileSize;
  state?: TileState;
  onClick?: () => void;
  /** 牌名に添える補足(例: ツモ牌 / リーチ宣言牌)。読み上げ名にも含める。 */
  label?: string;
}>;

export type TileBackProps = Readonly<{
  size?: TileSize;
}>;

const SIZE_CLASS: Readonly<Record<TileSize, string>> = {
  sm: "h-8 w-6",
  md: "h-10 w-7",
  lg: "h-14 w-10",
};

const DIGIT_CLASS: Readonly<Record<TileSize, string>> = {
  sm: "text-[11px]",
  md: "text-sm",
  lg: "text-xl",
};

const SUIT_CLASS: Readonly<Record<TileSize, string>> = {
  sm: "text-[7px]",
  md: "text-[9px]",
  lg: "text-[11px]",
};

const HONOR_CLASS: Readonly<Record<TileSize, string>> = {
  sm: "text-[13px]",
  md: "text-base",
  lg: "text-2xl",
};

const STATE_CLASS: Readonly<Record<TileState, string>> = {
  default: "",
  selectable:
    "cursor-pointer hover:-translate-y-1 hover:border-sky-500 hover:shadow-md focus-visible:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500",
  disabled: "cursor-not-allowed opacity-60",
  dimmed: "opacity-40",
};

const BASE_CLASS =
  "inline-flex flex-col items-center justify-center rounded-[3px] border border-stone-400 bg-stone-50 font-semibold leading-none shadow-sm transition-transform select-none";

/** 牌の面の文字色。牌は明るい面を保つため、ダークモードでも同じ配色にする。 */
const faceColor = (tile: Tile): string => {
  if (tile.red) {
    return "text-red-600";
  }
  if (tile.suit === "man") {
    return "text-amber-800";
  }
  if (tile.suit === "pin") {
    return "text-blue-700";
  }
  if (tile.suit === "sou") {
    return "text-green-700";
  }
  if (tile.rank === 6) {
    return "text-green-700";
  }
  if (tile.rank === 7) {
    return "text-red-600";
  }
  return "text-stone-800";
};

const surfaceClass = (tile: Tile): string =>
  tile.red ? "border-red-500 bg-red-50 ring-1 ring-red-400" : "";

const accessibleName = (tile: Tile, label: string | undefined): string =>
  label === undefined ? tileLabel(tile) : `${tileLabel(tile)}(${label})`;

function TileFace({
  tile,
  size,
}: Readonly<{ tile: Tile; size: TileSize }>): React.JSX.Element {
  if (tile.suit === "honor") {
    return <span className={HONOR_CLASS[size]}>{tileLabel(tile)}</span>;
  }
  return (
    <>
      <span className={DIGIT_CLASS[size]}>{tileDigitLabel(tile)}</span>
      <span className={SUIT_CLASS[size]}>{tileSuitLabel(tile.suit)}</span>
    </>
  );
}

/** 牌1枚。onClick を渡したときだけ操作可能なボタンになる。 */
function TileViewRoot({
  tile,
  size = "md",
  state = "default",
  onClick,
  label,
}: TileViewProps): React.JSX.Element {
  const className = [
    BASE_CLASS,
    SIZE_CLASS[size],
    faceColor(tile),
    surfaceClass(tile),
    STATE_CLASS[state],
  ]
    .filter((part) => part !== "")
    .join(" ");
  const name = accessibleName(tile, label);

  if (onClick === undefined) {
    return (
      <span className={className} aria-label={name} role="img">
        <TileFace tile={tile} size={size} />
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={name}
      onClick={onClick}
      disabled={state === "disabled"}
    >
      <TileFace tile={tile} size={size} />
    </button>
  );
}

/** 裏向きの牌。他家の手牌や暗槓の両端に使う。 */
function TileBack({ size = "md" }: TileBackProps): React.JSX.Element {
  return (
    <span
      role="img"
      aria-label="裏向きの牌"
      className={`inline-flex items-center justify-center rounded-[3px] border border-emerald-900 bg-emerald-700 shadow-sm ${SIZE_CLASS[size]}`}
    >
      <span className="h-1/2 w-1/2 rounded-[1px] border border-emerald-800 bg-emerald-600" />
    </span>
  );
}

export const TileView = Object.assign(TileViewRoot, { Back: TileBack });
