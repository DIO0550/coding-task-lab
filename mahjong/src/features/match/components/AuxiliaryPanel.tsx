const ACTIONS = [
  { id: "dahai", label: "打牌", enabled: true },
  { id: "chi", label: "チー", enabled: false },
  { id: "pon", label: "ポン", enabled: false },
  { id: "kan", label: "カン", enabled: false },
  { id: "riichi", label: "リーチ", enabled: false },
  { id: "tsumo", label: "ツモ", enabled: false },
  { id: "ron", label: "ロン", enabled: false },
  { id: "pass", label: "パス", enabled: false },
] as const;

type Props = Readonly<{
  turnPlayerName: string;
}>;

/** 対戦中の補助表示(A19: 開始状態の静的な初期値を表示する) */
export function AuxiliaryPanel({ turnPlayerName }: Props) {
  return (
    <section
      aria-label="補助情報"
      className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4 text-slate-900"
    >
      <h2 className="text-sm font-bold text-emerald-800">補助情報</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">残り山</dt>
          <dd data-testid="aux-wall">70枚</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">ドラ表示牌</dt>
          <dd data-testid="aux-dora">
            <span className="rounded border border-slate-400 bg-slate-50 px-1.5 py-0.5 font-bold">
              五萬
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">捨て牌河</dt>
          <dd data-testid="aux-river">なし</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">鳴き面子</dt>
          <dd data-testid="aux-melds">なし</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">リーチ</dt>
          <dd data-testid="aux-riichi">なし</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-600">手番</dt>
          <dd data-testid="aux-turn">{turnPlayerName}(親)</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2" data-testid="aux-actions">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            data-testid={`action-${action.id}`}
            disabled={!action.enabled}
            className="rounded border border-emerald-700 px-3 py-1 text-sm font-bold text-emerald-800 enabled:bg-emerald-50 enabled:hover:bg-emerald-100 disabled:border-slate-300 disabled:text-slate-400"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
