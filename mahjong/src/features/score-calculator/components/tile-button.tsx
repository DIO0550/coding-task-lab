import { tileGlyph } from "../utils/labels.ts";

type Props = Readonly<{
  notation: string;
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
}>;

/** 牌1枚を表すボタン。数牌は数字+色種、字牌は1文字、赤5は赤字で表示する */
export const TileButton = ({
  notation,
  onClick,
  selected = false,
  disabled = false,
}: Props) => {
  const glyph = tileGlyph(notation);
  return (
    <button
      type="button"
      aria-label={glyph.name}
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 w-9 flex-col items-center justify-center rounded-md border text-sm font-bold shadow-sm transition-colors ${
        selected
          ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500"
          : "border-neutral-300 bg-white hover:bg-amber-50"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span className={glyph.red ? "text-red-600" : "text-neutral-900"}>
        {glyph.top}
      </span>
      {glyph.bottom !== null && (
        <span className="text-[10px] font-normal text-neutral-500">
          {glyph.bottom}
        </span>
      )}
    </button>
  );
};
