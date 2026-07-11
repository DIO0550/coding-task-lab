import type { Action } from "../../../domains/game/index.ts";
import { tileLabel } from "../utils/labels.ts";

type ActionPanelProps = Readonly<{
  actions: readonly Action[];
  riichiSelecting: boolean;
  onAction: (action: Action) => void;
  onBeginRiichi: () => void;
  onCancelRiichi: () => void;
}>;

const buttonClass =
  "rounded bg-amber-400 px-4 py-1.5 text-sm font-bold text-emerald-950 hover:bg-amber-300";

const KAN_KIND_LABELS: Readonly<Record<string, string>> = {
  ankan: "暗槓",
  minkan: "カン",
  kakan: "加槓",
};

/** 打牌以外の行動ボタンのラベル(チー/ポンは使う牌も示す) */
const actionButtonLabel = (action: Action): string => {
  switch (action.type) {
    case "tsumo":
      return "ツモ";
    case "ron":
      return "ロン";
    case "pass":
      return "パス";
    case "chi":
      return `チー(${action.tiles.map(tileLabel).join("")})`;
    case "pon":
      return `ポン(${action.tiles.map(tileLabel).join("")})`;
    case "kan":
      return `${KAN_KIND_LABELS[action.kind]}(${tileLabel(action.tile)})`;
    default:
      return action.type;
  }
};

/**
 * 人間の手番/宣言機会に操作可能なアクションだけをボタンで出す。
 * 打牌は手牌の牌クリック、リーチはボタン→宣言牌の選択の2段階
 */
export const ActionPanel = ({
  actions,
  riichiSelecting,
  onAction,
  onBeginRiichi,
  onCancelRiichi,
}: ActionPanelProps) => {
  if (riichiSelecting) {
    return (
      <div
        data-testid="action-panel"
        className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-950/80 p-3"
      >
        <span className="text-sm font-bold text-amber-300">
          リーチ: 切る牌を選んでください
        </span>
        <button type="button" className={buttonClass} onClick={onCancelRiichi}>
          やめる
        </button>
      </div>
    );
  }
  const hasRiichi = actions.some((action) => action.type === "riichi");
  const buttonActions = actions.filter(
    (action) => action.type !== "discard" && action.type !== "riichi",
  );
  if (!hasRiichi && buttonActions.length === 0) {
    return null;
  }
  return (
    <div
      data-testid="action-panel"
      className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-950/80 p-3"
    >
      {buttonActions.map((action, index) => (
        <button
          key={index}
          type="button"
          className={buttonClass}
          onClick={() => onAction(action)}
        >
          {actionButtonLabel(action)}
        </button>
      ))}
      {hasRiichi && (
        <button type="button" className={buttonClass} onClick={onBeginRiichi}>
          リーチ
        </button>
      )}
    </div>
  );
};
