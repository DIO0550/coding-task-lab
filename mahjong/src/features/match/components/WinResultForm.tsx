"use client";

import { useReducer } from "react";
import type { WinType } from "@/domains/score";
import { MatchState, SeatIndex, WinDeclaration } from "../domains";

type WinFormState = Readonly<{
  winnerSeat: SeatIndex;
  loserSeat: SeatIndex;
  winType: WinType;
  han: number;
  fu: number;
}>;

type WinFormAction =
  | Readonly<{ type: "winner_selected"; seat: SeatIndex }>
  | Readonly<{ type: "loser_selected"; seat: SeatIndex }>
  | Readonly<{ type: "win_type_selected"; winType: WinType }>
  | Readonly<{ type: "han_selected"; han: number }>
  | Readonly<{ type: "fu_selected"; fu: number }>;

const winFormReducer = (state: WinFormState, action: WinFormAction): WinFormState => {
  switch (action.type) {
    case "winner_selected":
      return {
        ...state,
        winnerSeat: action.seat,
        loserSeat: WinDeclaration.resolveLoser(action.seat, state.loserSeat),
      };
    case "loser_selected":
      return { ...state, loserSeat: action.seat };
    case "win_type_selected":
      return { ...state, winType: action.winType };
    case "han_selected":
      return { ...state, han: action.han };
    case "fu_selected":
      return { ...state, fu: action.fu };
  }
};

const INITIAL_FORM: WinFormState = {
  winnerSeat: 0,
  loserSeat: 1,
  winType: "ron",
  han: 1,
  fu: 30,
};

type Props = Readonly<{
  match: MatchState;
  onSubmit: (declaration: WinDeclaration) => void;
}>;

export function WinResultForm({ match, onSubmit }: Props) {
  const [form, dispatch] = useReducer(winFormReducer, INITIAL_FORM);
  const dealerContinues = MatchState.isDealer(match, form.winnerSeat);

  return (
    <form
      data-testid="win-result-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          winnerSeat: form.winnerSeat,
          loserSeat: form.winType === "ron" ? form.loserSeat : null,
          winType: form.winType,
          han: form.han,
          fu: form.fu,
        });
      }}
      className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4 text-slate-900"
    >
      <h2 className="text-sm font-bold text-emerald-800">和了結果入力</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="win-winner" className="text-slate-700">
            和了者
          </label>
          <select
            id="win-winner"
            value={String(form.winnerSeat)}
            onChange={(event) => {
              const seat = SeatIndex.parse(event.target.value);
              if (seat !== null) {
                dispatch({ type: "winner_selected", seat });
              }
            }}
            className="w-36 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
          >
            {SeatIndex.all.map((seat) => (
              <option key={seat} value={String(seat)}>
                {match.players[seat].name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="win-loser" className="text-slate-700">
            放銃者
          </label>
          <select
            id="win-loser"
            value={String(form.loserSeat)}
            disabled={form.winType !== "ron"}
            onChange={(event) => {
              const seat = SeatIndex.parse(event.target.value);
              if (seat !== null) {
                dispatch({ type: "loser_selected", seat });
              }
            }}
            className="w-36 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {SeatIndex.all
              .filter((seat) => seat !== form.winnerSeat)
              .map((seat) => (
                <option key={seat} value={String(seat)}>
                  {match.players[seat].name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="win-type" className="text-slate-700">
            和了種別
          </label>
          <select
            id="win-type"
            value={form.winType}
            onChange={(event) =>
              dispatch({
                type: "win_type_selected",
                winType: event.target.value === "tsumo" ? "tsumo" : "ron",
              })
            }
            className="w-36 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
          >
            <option value="tsumo">ツモ</option>
            <option value="ron">ロン</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="win-han" className="text-slate-700">
            翻数
          </label>
          <select
            id="win-han"
            value={String(form.han)}
            onChange={(event) => dispatch({ type: "han_selected", han: Number(event.target.value) })}
            className="w-36 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
          >
            {WinDeclaration.hanOptions.map((han) => (
              <option key={han} value={String(han)}>
                {han}翻
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="win-fu" className="text-slate-700">
            符
          </label>
          <select
            id="win-fu"
            value={String(form.fu)}
            onChange={(event) => dispatch({ type: "fu_selected", fu: Number(event.target.value) })}
            className="w-36 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
          >
            {WinDeclaration.fuOptions.map((fu) => (
              <option key={fu} value={String(fu)}>
                {fu}符
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-700">本場</span>
          <span data-testid="win-honba">{match.honba}本場</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-700">供託</span>
          <span data-testid="win-kyotaku">{match.kyotaku}本</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-700">親継続</span>
          <span data-testid="win-dealer-continues">
            {dealerContinues ? "あり(連荘)" : "なし(親交代)"}
          </span>
        </div>
      </div>
      <button
        type="submit"
        data-testid="win-submit"
        className="rounded-lg bg-emerald-700 px-6 py-2 font-bold text-white hover:bg-emerald-600"
      >
        結果確定
      </button>
    </form>
  );
}
