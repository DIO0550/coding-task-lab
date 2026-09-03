import type { ReactNode } from "react";

import { Seat, type SeatIndex } from "@/src/domains/seat";

import type { BoardModel } from "../../utils/board-model";
import { Labels } from "../../utils/labels";
import { SeatPanel } from "../seat-panel";
import { TileGlyph } from "../tile-glyph";

/**
 * 卓全体の表示。表示席を手前(下)に置き、対面・上家・下家を周囲に配置する。中央に局・本場・供託・残り山・ドラ表示牌。
 * 手前席の下に手牌・操作(children)を差し込む。
 */
type Props = Readonly<{
  model: BoardModel;
  viewerSeat: SeatIndex;
  children?: ReactNode;
}>;

function CenterInfo({ model }: Readonly<{ model: BoardModel }>) {
  const dealer = model.seats.find((seat) => seat.isDealer);
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-900 bg-emerald-800 p-4 text-white" aria-label="卓情報">
      <div className="text-2xl font-bold">{Labels.round(model.roundWind, model.roundNumber)}</div>
      <div className="flex gap-3 text-sm">
        <span>{Labels.honba(model.honba)}</span>
        <span>{Labels.kyotaku(model.kyotaku)}</span>
      </div>
      <div className="text-sm">親: {dealer ? `${Labels.wind(dealer.wind)}家 ${dealer.name}` : "—"}</div>
      <div className="text-sm">残り山: {model.remaining === null ? "—" : `${model.remaining}枚`}</div>
      <div className="flex items-center gap-1 text-sm">
        <span>ドラ表示牌:</span>
        {model.doraIndicators.length === 0 ? (
          <span>—</span>
        ) : (
          model.doraIndicators.map((tile, index) => <TileGlyph key={`${tile}-${index}`} tile={tile} size="sm" />)
        )}
      </div>
    </div>
  );
}

export function TableBoard({ model, viewerSeat, children }: Props) {
  const seatAt = (offset: number) => model.seats[Seat.offset(viewerSeat, offset)];
  const statusOf = (seat: SeatIndex) => (model.turnSeat === seat ? "turn" : "idle");
  const top = seatAt(2);
  const left = seatAt(3);
  const right = seatAt(1);
  const bottom = seatAt(0);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto_auto] gap-3 rounded-xl bg-emerald-700 p-4">
      <div className="col-start-2 row-start-1 flex justify-center">
        <SeatPanel seat={top} status={statusOf(top.seat)} />
      </div>
      <div className="col-start-1 row-start-2 flex items-center justify-end">
        <SeatPanel seat={left} status={statusOf(left.seat)} />
      </div>
      <div className="col-start-2 row-start-2 flex items-center justify-center">
        <CenterInfo model={model} />
      </div>
      <div className="col-start-3 row-start-2 flex items-center justify-start">
        <SeatPanel seat={right} status={statusOf(right.seat)} />
      </div>
      <div className="col-span-3 row-start-3 flex flex-col items-center gap-3">
        <SeatPanel seat={bottom} status={statusOf(bottom.seat)} />
        {children}
      </div>
    </div>
  );
}
