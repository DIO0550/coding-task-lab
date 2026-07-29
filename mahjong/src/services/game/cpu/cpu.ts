import type { CpuLevel } from "../../../domains/participant/index.ts";
import { Tile } from "../../../domains/tile/index.ts";
import { GameAction } from "../action/index.ts";
import type { PlayerView } from "../view/index.ts";
import { CallChoice } from "./call/index.ts";
import { DiscardChoice } from "./discard/index.ts";
import { RiichiChoice } from "./riichi/index.ts";
import { TableInfo } from "./table/index.ts";

const isSameTile = (left: Tile, right: Tile): boolean =>
  Tile.isSameKind(left, right) && left.red === right.red;

const isSameTiles = (
  left: readonly Tile[],
  right: readonly Tile[],
): boolean =>
  left.length === right.length &&
  left.every((tile, position) => isSameTile(tile, right[position]));

/** 2つの行動が同じ内容か。 */
const isSameAction = (left: GameAction, right: GameAction): boolean => {
  if (left.type !== right.type) {
    return false;
  }
  if ("index" in left && "index" in right) {
    return left.index === right.index;
  }
  if ("tile" in left && "tile" in right) {
    return isSameTile(left.tile, right.tile);
  }
  if ("tiles" in left && "tiles" in right) {
    return isSameTiles(left.tiles, right.tiles);
  }
  return true;
};

/**
 * 和了 → 鳴き → 槓 → リーチ → 打牌 の順に検討する。
 * いずれも選ばなければ見送る。
 */
const chooseAction = (
  view: PlayerView,
  level: CpuLevel,
  info: TableInfo,
): GameAction | null => {
  const win = view.actions.find((action) => GameAction.isWin(action));
  if (win !== undefined) {
    return win;
  }
  const claim = CallChoice.chooseClaim(view, level, info);
  if (claim !== null) {
    return claim;
  }
  const kan = CallChoice.chooseKan(view, level, info);
  if (kan !== null) {
    return kan;
  }
  const riichi = RiichiChoice.choose(view, level, info);
  if (riichi !== null) {
    return riichi;
  }
  return DiscardChoice.choose(view, level, info);
};

/** 選べる行動のうち、見送りを最優先とする既定の行動。 */
const fallbackAction = (view: PlayerView): GameAction | null => {
  const pass = view.actions.find((action) => action.type === "pass");
  return pass ?? view.actions[0] ?? null;
};

export const Cpu = {
  /**
   * 卓の公開情報と自分の手牌だけから行動を1つ決める。
   * 返す行動は必ず `view.actions` に含まれる。選べる行動が無ければ null。
   */
  decide(view: PlayerView, level: CpuLevel): GameAction | null {
    if (view.actions.length === 0) {
      return null;
    }
    const action = chooseAction(view, level, TableInfo.create(view));
    if (action === null) {
      return fallbackAction(view);
    }
    const legal = view.actions.some((allowed) => isSameAction(allowed, action));
    return legal ? action : fallbackAction(view);
  },
} as const;
