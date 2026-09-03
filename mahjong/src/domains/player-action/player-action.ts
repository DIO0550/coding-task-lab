import type { Tile } from "@/src/domains/tile";

/**
 * プレイヤー(人間・CPU)が選択できる行動。ゲーム進行エンジンが合法な行動を列挙し、その中から選ぶ。
 */
export type KanKind = "ankan" | "kakan" | "daiminkan";

export type PlayerAction =
  | Readonly<{ type: "discard"; tile: Tile; riichi: boolean }>
  | Readonly<{ type: "tsumo" }>
  | Readonly<{ type: "ron" }>
  | Readonly<{ type: "kan"; kind: KanKind; tile: Tile }>
  | Readonly<{ type: "pon"; tiles: readonly [Tile, Tile] }>
  | Readonly<{ type: "chi"; tiles: readonly [Tile, Tile] }>
  | Readonly<{ type: "pass" }>
  | Readonly<{ type: "confirm_result" }>;

export type PlayerActionType = PlayerAction["type"];

export const PlayerAction = {
  discard(tile: Tile, riichi = false): PlayerAction {
    return { type: "discard", tile, riichi };
  },
  tsumo(): PlayerAction {
    return { type: "tsumo" };
  },
  ron(): PlayerAction {
    return { type: "ron" };
  },
  kan(kind: KanKind, tile: Tile): PlayerAction {
    return { type: "kan", kind, tile };
  },
  pon(tiles: readonly [Tile, Tile]): PlayerAction {
    return { type: "pon", tiles };
  },
  chi(tiles: readonly [Tile, Tile]): PlayerAction {
    return { type: "chi", tiles };
  },
  pass(): PlayerAction {
    return { type: "pass" };
  },
  confirmResult(): PlayerAction {
    return { type: "confirm_result" };
  },

  equals(a: PlayerAction, b: PlayerAction): boolean {
    return PlayerAction.key(a) === PlayerAction.key(b);
  },

  /** 同一性判定・重複排除に使う文字列キー */
  key(action: PlayerAction): string {
    switch (action.type) {
      case "discard":
        return `discard:${action.tile}:${action.riichi ? "riichi" : ""}`;
      case "kan":
        return `kan:${action.kind}:${action.tile}`;
      case "pon":
      case "chi":
        return `${action.type}:${action.tiles.join(",")}`;
      case "tsumo":
      case "ron":
      case "pass":
      case "confirm_result":
        return action.type;
    }
  },

  /** 和了宣言かどうか */
  isWin(action: PlayerAction): boolean {
    return action.type === "tsumo" || action.type === "ron";
  },

  /** 他家の打牌への応答(鳴き・ロン・パス)かどうか */
  isCallResponse(action: PlayerAction): boolean {
    return (
      action.type === "ron" ||
      action.type === "pon" ||
      action.type === "chi" ||
      action.type === "pass" ||
      (action.type === "kan" && action.kind === "daiminkan")
    );
  },
} as const;
