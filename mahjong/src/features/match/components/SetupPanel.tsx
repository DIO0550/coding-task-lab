import type {
  CpuLevel,
  RuleConfig,
  Seat,
} from "../../../domains/game/index.ts";
import type { MatchSetup, SeatSetup } from "../domains/match-setup.ts";

type SetupPanelProps = Readonly<{
  setup: MatchSetup;
  onSeatChange: (seat: Seat, patch: Partial<SeatSetup>) => void;
  onRuleChange: (patch: Partial<RuleConfig>) => void;
  onStart: () => void;
}>;

const SEATS: readonly Seat[] = [0, 1, 2, 3];

/** 起家基準の席名(開局時の風)。設定画面の見出しに使う */
const SEAT_LABELS: readonly string[] = ["東家", "南家", "西家", "北家"];

const parseLevel = (value: string): CpuLevel =>
  value === "beginner" || value === "advanced" ? value : "standard";

const selectClass =
  "rounded border border-zinc-400 bg-white px-1 py-0.5 text-sm text-zinc-900";

type OnOffSelectProps = Readonly<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}>;

/** あり/なし の2択セレクト */
const OnOffSelect = ({ label, value, onChange }: OnOffSelectProps) => (
  <label className="flex items-center gap-1">
    <span>{label}</span>
    <select
      aria-label={label}
      className={selectClass}
      value={value ? "on" : "off"}
      onChange={(event) => onChange(event.target.value === "on")}
    >
      <option value="on">あり</option>
      <option value="off">なし</option>
    </select>
  </label>
);

/** 対戦開始前の設定(4席のプレイヤー設定・ルール設定・開始ボタン) */
export const SetupPanel = ({
  setup,
  onSeatChange,
  onRuleChange,
  onStart,
}: SetupPanelProps) => {
  const rule = setup.rule;
  return (
    <section
      data-testid="setup-panel"
      aria-label="対戦開始設定"
      className="mx-auto flex max-w-5xl flex-col gap-3 rounded-lg border border-zinc-300 bg-white/90 p-4 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100"
    >
      <h2 className="text-base font-bold">対戦開始設定</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {SEATS.map((seat) => {
          const seatSetup = setup.seats[seat];
          return (
            <fieldset
              key={seat}
              className="flex flex-col gap-1 rounded border border-zinc-300 p-2 dark:border-zinc-700"
            >
              <legend className="px-1 font-semibold">{SEAT_LABELS[seat]}</legend>
              <label className="flex items-center justify-between gap-1">
                <span>操作種別</span>
                <select
                  aria-label={`${SEAT_LABELS[seat]}の操作種別`}
                  className={selectClass}
                  value={seatSetup.kind}
                  onChange={(event) =>
                    onSeatChange(seat, {
                      kind: event.target.value === "human" ? "human" : "cpu",
                    })
                  }
                >
                  <option value="human">人間</option>
                  <option value="cpu">CPU</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-1">
                <span>表示名</span>
                <input
                  aria-label={`${SEAT_LABELS[seat]}の表示名`}
                  className="w-24 rounded border border-zinc-400 bg-white px-1 py-0.5 text-sm text-zinc-900"
                  value={seatSetup.name}
                  onChange={(event) =>
                    onSeatChange(seat, { name: event.target.value })
                  }
                />
              </label>
              {seatSetup.kind === "cpu" && (
                <label className="flex items-center justify-between gap-1">
                  <span>CPUレベル</span>
                  <select
                    aria-label={`${SEAT_LABELS[seat]}のCPUレベル`}
                    className={selectClass}
                    value={seatSetup.level}
                    onChange={(event) =>
                      onSeatChange(seat, {
                        level: parseLevel(event.target.value),
                      })
                    }
                  >
                    <option value="beginner">入門</option>
                    <option value="standard">標準</option>
                    <option value="advanced">上級</option>
                  </select>
                </label>
              )}
            </fieldset>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1">
          <span>対戦形式</span>
          <select
            aria-label="対戦形式"
            className={selectClass}
            value={rule.format}
            onChange={(event) =>
              onRuleChange({
                format: event.target.value === "tonpuu" ? "tonpuu" : "hanchan",
              })
            }
          >
            <option value="tonpuu">東風戦</option>
            <option value="hanchan">半荘戦</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span>持ち点</span>
          <select
            aria-label="持ち点"
            className={selectClass}
            value={String(rule.startingPoints)}
            onChange={(event) =>
              onRuleChange({
                startingPoints: event.target.value === "30000" ? 30000 : 25000,
              })
            }
          >
            <option value="25000">25,000点開始</option>
            <option value="30000">30,000点開始</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span>返し点</span>
          <select
            aria-label="返し点"
            className={selectClass}
            value={rule.returnPoints === null ? "none" : "30000"}
            onChange={(event) =>
              onRuleChange({
                returnPoints: event.target.value === "none" ? null : 30000,
              })
            }
          >
            <option value="30000">30,000点</option>
            <option value="none">なし</option>
          </select>
        </label>
        <OnOffSelect
          label="喰いタン"
          value={rule.kuitan}
          onChange={(value) => onRuleChange({ kuitan: value })}
        />
        <OnOffSelect
          label="後付け"
          value={rule.atozuke}
          onChange={(value) => onRuleChange({ atozuke: value })}
        />
        <OnOffSelect
          label="赤ドラ"
          value={rule.akaDora}
          onChange={(value) => onRuleChange({ akaDora: value })}
        />
        <OnOffSelect
          label="CPU自動和了"
          value={rule.cpuAutoWin}
          onChange={(value) => onRuleChange({ cpuAutoWin: value })}
        />
      </div>
      <div>
        <button
          type="button"
          onClick={onStart}
          className="rounded bg-emerald-700 px-6 py-2 font-bold text-white hover:bg-emerald-600"
        >
          対戦開始
        </button>
      </div>
    </section>
  );
};
