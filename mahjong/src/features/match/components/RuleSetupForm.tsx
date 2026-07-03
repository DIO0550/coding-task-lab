import type { RuleSet } from "@/src/domains/game/index.ts";

export type RuleSetupFormProps = Readonly<{
  rules: RuleSet;
  onChange: (patch: Partial<RuleSet>) => void;
}>;

type RadioFieldProps<T extends string | number | boolean> = Readonly<{
  label: string;
  name: string;
  value: T;
  options: readonly Readonly<{ value: T; label: string }>[];
  onChange: (value: T) => void;
}>;

/** ラベル付きラジオボタン群。RuleSetupForm 内でのみ使う私的な表示ヘルパー。 */
const RadioField = <T extends string | number | boolean>({ label, name, value, options, onChange }: RadioFieldProps<T>) => (
  <fieldset className="flex flex-wrap items-center gap-4">
    <legend className="w-28 shrink-0 font-semibold">{label}</legend>
    {options.map((option) => (
      <label key={String(option.value)} className="flex items-center gap-1">
        <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} />
        {option.label}
      </label>
    ))}
  </fieldset>
);

const YES_NO_OPTIONS: readonly Readonly<{ value: boolean; label: string }>[] = [
  { value: true, label: "あり" },
  { value: false, label: "なし" },
];

/** ルール設定(対戦形式・持ち点・返し点・喰いタン・後付け・赤ドラ・CPU自動和了)のフォーム。 */
export const RuleSetupForm = ({ rules, onChange }: RuleSetupFormProps) => (
  <div className="flex flex-col gap-3">
    <RadioField
      label="対戦形式"
      name="matchType"
      value={rules.matchType}
      options={[
        { value: "hanchan", label: "半荘戦" },
        { value: "tonpuu", label: "東風戦" },
      ]}
      onChange={(matchType) => onChange({ matchType })}
    />
    <RadioField
      label="持ち点"
      name="startingPoints"
      value={rules.startingPoints}
      options={[
        { value: 25000, label: "25,000点" },
        { value: 30000, label: "30,000点" },
      ]}
      onChange={(startingPoints) => onChange({ startingPoints })}
    />
    <RadioField
      label="返し点"
      name="returnPoints"
      value={rules.returnPoints ?? 0}
      options={[
        { value: 30000, label: "30,000点" },
        { value: 0, label: "なし" },
      ]}
      onChange={(v) => onChange({ returnPoints: v === 0 ? null : (v as 30000) })}
    />
    <RadioField label="喰いタン" name="kuitan" value={rules.kuitan} options={YES_NO_OPTIONS} onChange={(kuitan) => onChange({ kuitan })} />
    <RadioField label="後付け" name="atozuke" value={rules.atozuke} options={YES_NO_OPTIONS} onChange={(atozuke) => onChange({ atozuke })} />
    <RadioField label="赤ドラ" name="redDora" value={rules.redDora} options={YES_NO_OPTIONS} onChange={(redDora) => onChange({ redDora })} />
    <RadioField
      label="CPU自動和了"
      name="cpuAutoWin"
      value={rules.cpuAutoWin}
      options={YES_NO_OPTIONS}
      onChange={(cpuAutoWin) => onChange({ cpuAutoWin })}
    />
  </div>
);
