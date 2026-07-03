import { Game, type GameAction, type GameState } from "@/src/services/game";

type ActionBarProps = Readonly<{
  game: GameState;
  seat: number;
  riichiSelecting: boolean;
  onAction: (action: GameAction) => void;
  onToggleRiichi: (value: boolean) => void;
}>;

const buttonClass =
  "rounded bg-indigo-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-40";

/** 人間プレイヤーが今可能なアクションだけをボタンとして表示する */
export function ActionBar({
  game,
  seat,
  riichiSelecting,
  onAction,
  onToggleRiichi,
}: ActionBarProps) {
  const phase = game.phase;

  if (phase.type === "turn" && phase.actor === seat) {
    const actions = Game.availableTurnActions(game);
    if (actions === null) {
      return null;
    }
    return (
      <div className="flex flex-wrap items-center gap-2" aria-label="操作">
        {actions.canTsumo && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => onAction({ type: "tsumo", player: seat })}
          >
            ツモ
          </button>
        )}
        {actions.canRiichi && !riichiSelecting && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => onToggleRiichi(true)}
          >
            リーチ
          </button>
        )}
        {riichiSelecting && (
          <>
            <span className="text-sm font-bold text-orange-700">
              リーチ宣言牌を選んでください
            </span>
            <button
              type="button"
              className="rounded bg-zinc-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-zinc-600"
              onClick={() => onToggleRiichi(false)}
            >
              やめる
            </button>
          </>
        )}
        {actions.ankanTiles.map((tile) => (
          <button
            key={`ankan-${tile}`}
            type="button"
            className={buttonClass}
            onClick={() => onAction({ type: "ankan", player: seat, tile })}
          >
            暗槓({tile})
          </button>
        ))}
        {actions.kakanTiles.map((tile) => (
          <button
            key={`kakan-${tile}`}
            type="button"
            className={buttonClass}
            onClick={() => onAction({ type: "kakan", player: seat, tile })}
          >
            加槓({tile})
          </button>
        ))}
        {!riichiSelecting && (
          <span className="text-sm text-zinc-100">打牌してください</span>
        )}
      </div>
    );
  }

  if (phase.type === "claims") {
    const option = phase.options.find((o) => o.player === seat);
    if (option === undefined || phase.responses[seat] !== null) {
      return null;
    }
    return (
      <div className="flex flex-wrap items-center gap-2" aria-label="操作">
        {option.canRon && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => onAction({ type: "ron", player: seat })}
          >
            ロン
          </button>
        )}
        {option.canPon && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => onAction({ type: "pon", player: seat })}
          >
            ポン
          </button>
        )}
        {option.canKan && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => onAction({ type: "kan", player: seat })}
          >
            カン
          </button>
        )}
        {option.chiOptions.map((tiles) => (
          <button
            key={`chi-${tiles[0]}-${tiles[1]}`}
            type="button"
            className={buttonClass}
            onClick={() =>
              onAction({ type: "chi", player: seat, tiles })
            }
          >
            チー({tiles[0]} {tiles[1]})
          </button>
        ))}
        <button
          type="button"
          className="rounded bg-zinc-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-zinc-600"
          onClick={() => onAction({ type: "pass", player: seat })}
        >
          パス
        </button>
      </div>
    );
  }

  return null;
}
