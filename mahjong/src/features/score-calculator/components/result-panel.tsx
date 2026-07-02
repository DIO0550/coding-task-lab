import type { CalcResult } from "../../../services/score-calculation/index.ts";
import {
  PAYMENT_FROM_LABELS,
  REASON_LABELS,
  YAKU_LABELS,
} from "../utils/labels.ts";

type Props = Readonly<{
  result: CalcResult | null;
}>;

/** 計算結果の表示。未計算・エラー・和了結果の3状態を描画する */
export const ResultPanel = ({ result }: Props) => {
  if (result === null) {
    return (
      <p className="text-sm text-neutral-500">
        手牌と条件を入力して「計算する」を押してください。
      </p>
    );
  }

  if (!result.valid) {
    return (
      <p
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
      >
        {REASON_LABELS[result.reason]}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-semibold text-neutral-700">
          {result.han}翻 {result.fu}符
        </span>
        <span className="text-3xl font-bold text-emerald-700">
          {result.score.total}点
        </span>
      </div>
      <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
        {result.yaku.map((yaku) => (
          <li
            key={yaku.name}
            className="flex justify-between px-3 py-1.5 text-sm"
          >
            <span>{YAKU_LABELS[yaku.name]}</span>
            <span className="font-semibold">{yaku.han}翻</span>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="text-xs font-semibold text-neutral-500">支払い</h3>
        <ul className="mt-1 space-y-0.5 text-sm">
          {result.score.payments.map((payment, index) => (
            <li key={`${payment.from}-${index}`}>
              {PAYMENT_FROM_LABELS[payment.from]}: {payment.amount}点
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
