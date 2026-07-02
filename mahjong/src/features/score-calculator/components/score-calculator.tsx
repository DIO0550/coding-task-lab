"use client";

import type { Wind } from "../../../domains/tile/index.ts";
import type { MeldType } from "../../../domains/meld/index.ts";
import type {
  RiichiType,
  Situational,
  WinType,
} from "../../../domains/win-context/index.ts";
import { useScoreCalculator } from "../hooks/use-score-calculator.ts";
import type { PaletteTarget } from "../hooks/score-calculator-reducer.ts";
import { MELD_TYPE_LABELS, WIND_LABELS, tileGlyph } from "../utils/labels.ts";
import { TileButton } from "./tile-button.tsx";
import { TilePalette } from "./tile-palette.tsx";
import { ResultPanel } from "./result-panel.tsx";

const SEAT_WINDS: ReadonlyArray<Wind> = ["ton", "nan", "sha", "pei"];
const ROUND_WINDS: ReadonlyArray<Wind> = ["ton", "nan"];
const MELD_TYPES: ReadonlyArray<MeldType> = ["chi", "pon", "kan", "ankan"];

const RIICHI_OPTIONS: ReadonlyArray<{ value: RiichiType; label: string }> = [
  { value: "none", label: "なし" },
  { value: "riichi", label: "リーチ" },
  { value: "double", label: "ダブルリーチ" },
];

const WIN_TYPE_OPTIONS: ReadonlyArray<{ value: WinType; label: string }> = [
  { value: "ron", label: "ロン" },
  { value: "tsumo", label: "ツモ" },
];

const SITUATIONAL_OPTIONS: ReadonlyArray<{
  value: Situational;
  label: string;
}> = [
  { value: "haitei", label: "海底摸月" },
  { value: "houtei", label: "河底撈魚" },
  { value: "rinshan", label: "嶺上開花" },
  { value: "chankan", label: "槍槓" },
  { value: "tenhou", label: "天和" },
  { value: "chihou", label: "地和" },
];

const PALETTE_TARGET_OPTIONS: ReadonlyArray<{
  value: PaletteTarget;
  label: string;
}> = [
  { value: "hand", label: "手牌" },
  { value: "meld", label: "副露" },
  { value: "dora", label: "ドラ" },
  { value: "uraDora", label: "裏ドラ" },
];

const SECTION_CLASS =
  "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm";

const SELECT_CLASS =
  "rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm";

/** 点数計算機の画面全体。状態は useScoreCalculator に、計算は services に委譲する */
export const ScoreCalculator = () => {
  const calculator = useScoreCalculator();
  const { state } = calculator;
  const winTileCandidates = [...new Set(state.hand)];

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">麻雀点数計算機</h1>
        <p className="mt-1 text-sm text-neutral-500">
          パレットから牌を選んで手牌を作り、和了の状況を設定して点数を計算します。
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <section aria-label="手牌" className={SECTION_CLASS}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">手牌</h2>
              <span className="text-xs text-neutral-500">
                {state.hand.length} / {calculator.capacity} 枚(和了牌を含む)
              </span>
            </div>
            <div className="mt-2 flex min-h-14 flex-wrap items-center gap-1">
              {state.hand.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  パレットから牌を追加してください
                </p>
              ) : (
                state.hand.map((notation, index) => (
                  <TileButton
                    key={`${notation}-${index}`}
                    notation={notation}
                    onClick={() => calculator.removeHandTile(index)}
                  />
                ))
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              手牌の牌をクリックすると削除します
            </p>
          </section>

          <section aria-label="副露" className={SECTION_CLASS}>
            <h2 className="font-semibold">副露</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.melds.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  副露なし(追加するにはパレットの追加先を「副露」にして基準牌を選択)
                </p>
              ) : (
                state.melds.map((meld, index) => (
                  <div
                    key={`${meld.type}-${meld.tiles[0]}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1"
                  >
                    <span className="text-xs font-semibold text-neutral-600">
                      {MELD_TYPE_LABELS[meld.type]}
                    </span>
                    <span className="text-sm">
                      {meld.tiles
                        .map((notation) => tileGlyph(notation).name)
                        .join("・")}
                    </span>
                    <button
                      type="button"
                      onClick={() => calculator.removeMeld(index)}
                      className="rounded px-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section aria-label="和了牌の選択" className={SECTION_CLASS}>
            <h2 className="font-semibold">和了牌</h2>
            <div className="mt-2 flex min-h-14 flex-wrap items-center gap-1">
              {winTileCandidates.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  手牌を追加すると和了牌を選べます
                </p>
              ) : (
                winTileCandidates.map((notation) => (
                  <TileButton
                    key={notation}
                    notation={notation}
                    selected={state.winTile === notation}
                    onClick={() => calculator.selectWinTile(notation)}
                  />
                ))
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              手牌の中から和了牌を1つ選択してください
            </p>
          </section>

          <section aria-label="牌パレット" className={SECTION_CLASS}>
            <h2 className="font-semibold">牌パレット</h2>
            <fieldset className="mt-2">
              <legend className="text-xs font-semibold text-neutral-500">
                追加先
              </legend>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {PALETTE_TARGET_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-1 text-sm"
                  >
                    <input
                      type="radio"
                      name="palette-target"
                      checked={state.paletteTarget === option.value}
                      disabled={
                        option.value === "uraDora" && state.riichi === "none"
                      }
                      onChange={() =>
                        calculator.setPaletteTarget(option.value)
                      }
                    />
                    {option.label}
                  </label>
                ))}
                {state.paletteTarget === "meld" && (
                  <label className="flex items-center gap-1 text-sm">
                    副露の種類
                    <select
                      value={state.meldType}
                      onChange={(event) =>
                        calculator.setMeldType(
                          event.target.value as MeldType,
                        )
                      }
                      className={SELECT_CLASS}
                    >
                      {MELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {MELD_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </fieldset>
            <div className="mt-3">
              <TilePalette onPick={calculator.pickTile} />
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              副露は基準牌(チーは最小の牌)を選ぶと1つ追加されます
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section aria-label="状況" className={SECTION_CLASS}>
            <h2 className="font-semibold">状況</h2>
            <div className="mt-2 space-y-3 text-sm">
              <fieldset>
                <legend className="text-xs font-semibold text-neutral-500">
                  和了方法
                </legend>
                <div className="mt-1 flex gap-4">
                  {WIN_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="radio"
                        name="win-type"
                        checked={state.winType === option.value}
                        onChange={() => calculator.setWinType(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  自風
                  <select
                    value={state.seatWind}
                    onChange={(event) =>
                      calculator.setSeatWind(event.target.value as Wind)
                    }
                    className={SELECT_CLASS}
                  >
                    {SEAT_WINDS.map((wind) => (
                      <option key={wind} value={wind}>
                        {WIND_LABELS[wind]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  場風
                  <select
                    value={state.roundWind}
                    onChange={(event) =>
                      calculator.setRoundWind(event.target.value as Wind)
                    }
                    className={SELECT_CLASS}
                  >
                    {ROUND_WINDS.map((wind) => (
                      <option key={wind} value={wind}>
                        {WIND_LABELS[wind]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  リーチ
                  <select
                    value={state.riichi}
                    onChange={(event) =>
                      calculator.setRiichi(event.target.value as RiichiType)
                    }
                    className={SELECT_CLASS}
                  >
                    {RIICHI_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={state.ippatsu}
                    disabled={state.riichi === "none"}
                    onChange={(event) =>
                      calculator.setIppatsu(event.target.checked)
                    }
                  />
                  一発
                </label>
              </div>

              <fieldset>
                <legend className="text-xs font-semibold text-neutral-500">
                  状況役
                </legend>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  {SITUATIONAL_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="checkbox"
                        checked={state.situational.includes(option.value)}
                        onChange={() =>
                          calculator.toggleSituational(option.value)
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  本場
                  <input
                    type="number"
                    min={0}
                    value={state.honba}
                    onChange={(event) =>
                      calculator.setHonba(Number(event.target.value))
                    }
                    className="w-16 rounded-md border border-neutral-300 px-2 py-1"
                  />
                </label>
                <label className="flex items-center gap-2">
                  供託
                  <input
                    type="number"
                    min={0}
                    value={state.kyotaku}
                    onChange={(event) =>
                      calculator.setKyotaku(Number(event.target.value))
                    }
                    className="w-16 rounded-md border border-neutral-300 px-2 py-1"
                  />
                </label>
              </div>
            </div>
          </section>

          <section aria-label="ドラ表示" className={SECTION_CLASS}>
            <h2 className="font-semibold">ドラ</h2>
            <div className="mt-2 space-y-2">
              <div>
                <h3 className="text-xs font-semibold text-neutral-500">
                  ドラ(そのもの)
                </h3>
                <div className="mt-1 flex min-h-12 flex-wrap items-center gap-1">
                  {state.dora.length === 0 ? (
                    <p className="text-xs text-neutral-400">
                      追加先を「ドラ」にして選択
                    </p>
                  ) : (
                    state.dora.map((notation, index) => (
                      <TileButton
                        key={`${notation}-${index}`}
                        notation={notation}
                        onClick={() => calculator.removeDora(index)}
                      />
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-neutral-500">
                  裏ドラ(リーチ時のみ)
                </h3>
                <div className="mt-1 flex min-h-12 flex-wrap items-center gap-1">
                  {state.uraDora.length === 0 ? (
                    <p className="text-xs text-neutral-400">
                      追加先を「裏ドラ」にして選択
                    </p>
                  ) : (
                    state.uraDora.map((notation, index) => (
                      <TileButton
                        key={`${notation}-${index}`}
                        notation={notation}
                        onClick={() => calculator.removeUraDora(index)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={calculator.calculate}
              disabled={!calculator.canCalculate}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              計算する
            </button>
            <button
              type="button"
              onClick={calculator.reset}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              クリア
            </button>
          </div>

          <section aria-label="計算結果" className={SECTION_CLASS}>
            <h2 className="font-semibold">計算結果</h2>
            <div className="mt-2">
              <ResultPanel result={state.result} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
