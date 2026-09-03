import { PlayerAction } from "@/src/domains/player-action";

import { Labels } from "../../utils/labels";
import { TileGlyph } from "../tile-glyph";

/**
 * 打牌以外の操作(ツモ・ロン・カン・ポン・チー・パス)とリーチ切替。可能な操作だけをボタンとして出す。
 */
type Props = Readonly<{
  actions: readonly PlayerAction[];
  riichiMode: boolean;
  onAct: (action: PlayerAction) => void;
  onToggleRiichi: () => void;
}>;

const buttonClass = (tone: "win" | "call" | "pass" | "riichi", active = false) => {
  const base = "flex items-center gap-1 rounded px-3 py-1.5 text-sm font-bold text-white";
  switch (tone) {
    case "win":
      return `${base} bg-red-600 hover:bg-red-700`;
    case "call":
      return `${base} bg-sky-700 hover:bg-sky-800`;
    case "pass":
      return `${base} bg-zinc-600 hover:bg-zinc-700`;
    case "riichi":
      return `${base} ${active ? "bg-amber-600 ring-2 ring-amber-300" : "bg-amber-500 hover:bg-amber-600"}`;
  }
};

function ActionButton({ action, onAct }: Readonly<{ action: PlayerAction; onAct: (action: PlayerAction) => void }>) {
  switch (action.type) {
    case "tsumo":
      return (
        <button type="button" className={buttonClass("win")} onClick={() => onAct(action)}>
          ツモ
        </button>
      );
    case "ron":
      return (
        <button type="button" className={buttonClass("win")} onClick={() => onAct(action)}>
          ロン
        </button>
      );
    case "kan":
      return (
        <button type="button" className={buttonClass("call")} onClick={() => onAct(action)} aria-label={`カン ${Labels.tile(action.tile)}`}>
          カン <TileGlyph tile={action.tile} size="sm" />
        </button>
      );
    case "pon":
    case "chi":
      return (
        <button
          type="button"
          className={buttonClass("call")}
          onClick={() => onAct(action)}
          aria-label={`${action.type === "pon" ? "ポン" : "チー"} ${action.tiles.map((tile) => Labels.tile(tile)).join(" ")}`}
        >
          {action.type === "pon" ? "ポン" : "チー"}
          {action.tiles.map((tile, index) => (
            <TileGlyph key={`${tile}-${index}`} tile={tile} size="sm" />
          ))}
        </button>
      );
    case "pass":
      return (
        <button type="button" className={buttonClass("pass")} onClick={() => onAct(action)}>
          パス
        </button>
      );
    case "discard":
    case "confirm_result":
      return null;
  }
}

export function ActionBar({ actions, riichiMode, onAct, onToggleRiichi }: Props) {
  const canRiichi = actions.some((action) => action.type === "discard" && action.riichi);
  const buttons = actions.filter((action) => action.type !== "discard" && action.type !== "confirm_result");
  if (!canRiichi && buttons.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="操作">
      {canRiichi ? (
        <button type="button" className={buttonClass("riichi", riichiMode)} aria-pressed={riichiMode} onClick={onToggleRiichi}>
          リーチ
        </button>
      ) : null}
      {buttons.map((action) => (
        <ActionButton key={PlayerAction.key(action)} action={action} onAct={onAct} />
      ))}
    </div>
  );
}
