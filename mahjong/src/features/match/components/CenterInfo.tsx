import type { GameState } from "@/src/services/game";
import { kyokuLabel } from "../utils/labels";
import { TileView } from "./TileView";

type CenterInfoProps = Readonly<{
  game: GameState;
}>;

/** 卓中央の情報表示: 局・本場・供託・残り山・ドラ表示牌 */
export function CenterInfo({ game }: CenterInfoProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-emerald-950/70 p-3 text-emerald-50">
      <div className="text-lg font-bold">
        {kyokuLabel(game.round.wind, game.round.kyoku)}
      </div>
      <div className="text-xs">
        {game.round.honba}本場 / 供託{game.round.kyotaku}本
      </div>
      <div className="text-xs">残り山 {game.wallCount}枚</div>
      <div className="mt-1 flex items-center gap-1">
        <span className="text-xs">ドラ表示</span>
        {game.doraIndicators.map((tile, i) => (
          <TileView key={`${tile}-${i}`} tile={tile} size="sm" />
        ))}
      </div>
    </div>
  );
}
