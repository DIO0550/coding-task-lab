import { Tile } from "@/src/domains/tile";

type TileViewProps = Readonly<{
  tile: Tile;
  size?: "sm" | "md";
  faceDown?: boolean;
}>;

const SUIT_SYMBOLS = { m: "萬", p: "筒", s: "索" } as const;
const SUIT_COLORS = {
  m: "text-red-700",
  p: "text-blue-700",
  s: "text-green-700",
} as const;
const HONOR_LABELS = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
  haku: "白",
  hatsu: "發",
  chun: "中",
} as const;

const sizeClasses = {
  sm: "h-8 w-6 text-[10px]",
  md: "h-12 w-9 text-sm",
} as const;

/** 1枚の牌の表示。赤5は背景色で区別する */
export function TileView({ tile, size = "md", faceDown = false }: TileViewProps) {
  const base = `inline-flex select-none flex-col items-center justify-center rounded border font-bold leading-none shadow-sm ${sizeClasses[size]}`;

  if (faceDown) {
    return (
      <span
        aria-hidden
        className={`${base} border-emerald-900 bg-emerald-700`}
      />
    );
  }

  const suit = Tile.suitOf(tile);
  if (suit === null) {
    const honor = HONOR_LABELS[tile as keyof typeof HONOR_LABELS];
    const color = tile === "hatsu" ? "text-green-700" : tile === "chun" ? "text-red-700" : "text-zinc-900";
    return (
      <span
        aria-label={honor}
        className={`${base} border-zinc-400 bg-amber-50 ${color}`}
      >
        {honor}
      </span>
    );
  }

  const number = Tile.numberOf(tile);
  const red = Tile.isRed(tile);
  const label = `${red ? "赤" : ""}${number}${SUIT_SYMBOLS[suit]}`;
  return (
    <span
      aria-label={label}
      className={`${base} ${red ? "border-rose-500 bg-rose-100" : "border-zinc-400 bg-amber-50"} ${red ? "text-rose-700" : SUIT_COLORS[suit]}`}
    >
      <span>{number}</span>
      <span className="font-normal">{SUIT_SYMBOLS[suit]}</span>
    </span>
  );
}
