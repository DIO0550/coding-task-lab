"use client";

import type { Tile } from "../../../../domains/tile/index.ts";
import type {
  GameAction,
  GameActionType,
} from "../../../../services/game/action/index.ts";
import { actionLabel, tilesLabel } from "../../utils/labels/index.ts";

export type ActionBarProps = Readonly<{
  /** いま選択できる行動。打牌(discard)は手牌側で選ぶため表示しない。 */
  actions: readonly GameAction[];
  onAction: (action: GameAction) => void;
  disabled?: boolean;
}>;

type ActionGroup = Readonly<{
  key: string;
  types: readonly GameActionType[];
  /** 種別ごとに1つのボタンへまとめるか(リーチは牌選択が手牌側の責務のためまとめる)。 */
  collapse: boolean;
  variant: "win" | "riichi" | "call" | "pass";
}>;

/**
 * ボタンの並び順と、同種の行動をどうまとめるか。
 * `discard` は含めない(捨てる牌の選択は HandView の責務)。
 * `riichi` は collapse: true とし、ボタン押下では「リーチという種別を選んだ」ことだけを伝える。
 * どの牌を切ってリーチするかは HandView で選ばせるため、
 * onAction には配列の先頭という意味ではなく「riichi 種別を代表する1件」を渡す。
 */
const GROUPS: readonly ActionGroup[] = [
  { key: "tsumo", types: ["tsumo"], collapse: true, variant: "win" },
  { key: "ron", types: ["ron"], collapse: true, variant: "win" },
  { key: "riichi", types: ["riichi"], collapse: true, variant: "riichi" },
  {
    key: "kan",
    types: ["ankan", "kakan", "minkan"],
    collapse: false,
    variant: "call",
  },
  { key: "pon", types: ["pon"], collapse: false, variant: "call" },
  { key: "chi", types: ["chi"], collapse: false, variant: "call" },
  { key: "pass", types: ["pass"], collapse: true, variant: "pass" },
];

const VARIANT_CLASS: Readonly<Record<ActionGroup["variant"], string>> = {
  win: "bg-rose-600 text-white hover:bg-rose-500 focus-visible:outline-rose-400",
  riichi:
    "bg-amber-500 text-stone-900 hover:bg-amber-400 focus-visible:outline-amber-300",
  call: "bg-sky-600 text-white hover:bg-sky-500 focus-visible:outline-sky-400",
  pass: "bg-stone-500 text-white hover:bg-stone-400 focus-visible:outline-stone-300",
};

const BUTTON_CLASS =
  "rounded-md px-4 py-2 text-sm font-bold shadow transition-colors focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50";

/** ボタン文言に添える牌(選択肢が複数あるときだけ使う)。 */
const actionTiles = (action: GameAction): readonly Tile[] => {
  if (action.type === "ankan" || action.type === "kakan") {
    return [action.tile];
  }
  if (
    action.type === "pon" ||
    action.type === "minkan" ||
    action.type === "chi"
  ) {
    return action.tiles;
  }
  return [];
};

type ActionButton = Readonly<{
  key: string;
  text: string;
  action: GameAction;
  variant: ActionGroup["variant"];
}>;

const buildButtons = (
  actions: readonly GameAction[],
  group: ActionGroup,
): readonly ActionButton[] => {
  const matched = actions.filter((action) => group.types.includes(action.type));
  if (matched.length === 0) {
    return [];
  }
  // 代表1件だけを出すグループ(ツモ・ロン・リーチ・パス)。
  if (group.collapse || matched.length === 1) {
    const representative = matched[0];
    return [
      {
        key: group.key,
        text: actionLabel(representative.type),
        action: representative,
        variant: group.variant,
      },
    ];
  }
  // 同じ種別に選択肢が複数ある(チーの組み合わせ違い、ポンの牌違いなど)ので並べて出す。
  return matched.map((action, index) => ({
    key: `${group.key}-${index}`,
    text: `${actionLabel(action.type)} ${tilesLabel(actionTiles(action))}`,
    action,
    variant: group.variant,
  }));
};

export function ActionBar({
  actions,
  onAction,
  disabled = false,
}: ActionBarProps): React.JSX.Element {
  const buttons = GROUPS.flatMap((group) => buildButtons(actions, group));
  return (
    <div
      role="toolbar"
      aria-label="操作"
      className="flex flex-wrap items-center gap-2"
    >
      {buttons.map((button) => (
        <button
          key={button.key}
          type="button"
          disabled={disabled}
          onClick={() => onAction(button.action)}
          className={`${BUTTON_CLASS} ${VARIANT_CLASS[button.variant]}`}
        >
          {button.text}
        </button>
      ))}
    </div>
  );
}
