"use client";

import { useMatchController } from "@/src/features/match/hooks";
import type { Tile } from "@/src/domains/mahjong";

const winds = {
  ton: "東",
  nan: "南",
  sha: "西",
  pei: "北",
} as const;

const cpuLevels = [
  { value: "beginner", label: "入門" },
  { value: "standard", label: "標準" },
  { value: "advanced", label: "上級" },
] as const;

export function MatchScreen() {
  const controller = useMatchController();
  const game = controller.state.game;
  const human = game?.players.find((player) => player.kind === "human");
  const handWithDraw =
    human === undefined ? [] : game?.drawnTile !== undefined && game.currentPlayerId === human.id ? [...human.hand, game.drawnTile] : human.hand;

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#1f2421]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 lg:px-6">
        <header className="flex flex-col gap-2 border-b border-[#c8c8bd] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#396b57]">4人リーチ麻雀</p>
            <h1 className="text-3xl font-bold">対戦卓</h1>
          </div>
          <button
            type="button"
            className="h-11 rounded-md bg-[#1f5f4a] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#184b3a]"
            onClick={controller.start}
          >
            対戦開始
          </button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <SettingsPanel controller={controller} />

          <div className="flex flex-col gap-4">
            <TableStatus game={game} />
            <PlayersView game={game} />
            <BoardView game={game} />
            <HumanHand
              tiles={handWithDraw}
              canDiscard={controller.availableActions.canDiscard}
              canRiichi={controller.availableActions.canRiichi}
              canTsumo={controller.availableActions.canTsumo}
              canRon={controller.availableActions.canRon}
              canPon={controller.availableActions.canPon}
              canChi={controller.availableActions.canChi}
              canKan={controller.availableActions.canKan}
              canPass={controller.availableActions.canPass}
              kanTile={game?.pendingDiscard?.tile ?? controller.kanTile}
              onDiscard={controller.discard}
              onRiichi={controller.riichi}
              onKan={controller.kan}
              onTsumo={controller.tsumo}
              onRon={controller.ron}
              onPon={controller.pon}
              onChi={controller.chi}
              onPass={controller.pass}
            />
            <ResultPanel game={game} onConfirm={controller.confirmResult} />
          </div>
        </section>
      </div>
    </main>
  );
}

function SettingsPanel({ controller }: Readonly<{ controller: ReturnType<typeof useMatchController> }>) {
  const settings = controller.state.settings;
  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-md border border-[#d4d2c4] bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">対戦開始設定</h2>
        <div className="mt-3 flex flex-col gap-3">
          {settings.players.map((player, index) => (
            <div key={index} className="rounded-md border border-[#e1dfd1] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{winds[["ton", "nan", "sha", "pei"][index] as keyof typeof winds]}家</span>
                <select
                  className="h-9 rounded-md border border-[#c8c8bd] bg-white px-2 text-sm"
                  value={player.kind}
                  onChange={(event) => controller.setPlayerKind(index, event.target.value === "human" ? "human" : "cpu")}
                >
                  <option value="human">人間</option>
                  <option value="cpu">CPU</option>
                </select>
              </div>
              <input
                className="mt-2 h-9 w-full rounded-md border border-[#c8c8bd] px-2 text-sm"
                value={player.name}
                aria-label={`${index + 1}番席 表示名`}
                onChange={(event) => controller.setPlayerName(index, event.target.value)}
              />
              <select
                className="mt-2 h-9 w-full rounded-md border border-[#c8c8bd] bg-white px-2 text-sm"
                value={player.cpuLevel}
                disabled={player.kind !== "cpu"}
                aria-label={`${index + 1}番席 CPUレベル`}
                onChange={(event) =>
                  controller.setCpuLevel(
                    index,
                    event.target.value === "beginner" ? "beginner" : event.target.value === "advanced" ? "advanced" : "standard",
                  )
                }
              >
                {cpuLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-[#d4d2c4] bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">ルール設定</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <button
            type="button"
            className={segmented(settings.rules.length === "tonpu")}
            onClick={() => controller.setMatchLength("tonpu")}
          >
            東風戦
          </button>
          <button
            type="button"
            className={segmented(settings.rules.length === "hanchan")}
            onClick={() => controller.setMatchLength("hanchan")}
          >
            半荘戦
          </button>
          <button
            type="button"
            className={segmented(settings.rules.startingPoints === 25000)}
            onClick={() => controller.setStartingPoints(25000)}
          >
            25,000点
          </button>
          <button
            type="button"
            className={segmented(settings.rules.startingPoints === 30000)}
            onClick={() => controller.setStartingPoints(30000)}
          >
            30,000点
          </button>
          <button
            type="button"
            className={segmented(settings.rules.returnPoints === 30000)}
            onClick={() => controller.setReturnPoints(30000)}
          >
            返し30,000
          </button>
          <button
            type="button"
            className={segmented(settings.rules.returnPoints === "none")}
            onClick={() => controller.setReturnPoints("none")}
          >
            返しなし
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            ["kuitan", "喰いタン"],
            ["atozuke", "後付け"],
            ["redDora", "赤ドラ"],
            ["cpuAutoWin", "CPU自動和了"],
          ].map(([key, label]) => (
            <label key={key} className="flex min-h-10 items-center gap-2 rounded-md border border-[#d4d2c4] px-3">
              <input
                type="checkbox"
                checked={settings.rules[key as "kuitan" | "atozuke" | "redDora" | "cpuAutoWin"]}
                onChange={() => controller.toggleRule(key as "kuitan" | "atozuke" | "redDora" | "cpuAutoWin")}
              />
              {label}
            </label>
          ))}
        </div>
      </section>
    </aside>
  );
}

function TableStatus({ game }: Readonly<{ game?: NonNullable<ReturnType<typeof useMatchController>["state"]["game"]> }>) {
  const round = game === undefined ? "東一局" : `${game.roundWind === "ton" ? "東" : "南"}${game.handNumber}局`;
  const dealer = game?.players[game.dealerIndex]?.name ?? "東家";
  return (
    <section className="grid grid-cols-2 gap-3 rounded-md border border-[#d4d2c4] bg-white p-4 shadow-sm md:grid-cols-5">
      <StatusItem label="局" value={round} />
      <StatusItem label="本場" value={`${game?.honba ?? 0}本場`} />
      <StatusItem label="供託" value={`${game?.riichiSticks ?? 0}本`} />
      <StatusItem label="親" value={dealer} />
      <StatusItem label="残り山" value={`${game?.wall.length ?? 70}枚`} />
    </section>
  );
}

function StatusItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#66706a]">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function PlayersView({ game }: Readonly<{ game?: NonNullable<ReturnType<typeof useMatchController>["state"]["game"]> }>) {
  const players =
    game?.players ??
    [
      { id: 0, wind: "ton", name: "あなた", points: 25000, kind: "human", riichi: false },
      { id: 1, wind: "nan", name: "CPU 南", points: 25000, kind: "cpu", riichi: false },
      { id: 2, wind: "sha", name: "CPU 西", points: 25000, kind: "cpu", riichi: false },
      { id: 3, wind: "pei", name: "CPU 北", points: 25000, kind: "cpu", riichi: false },
    ];
  return (
    <section className="grid gap-3 md:grid-cols-4">
      {players.map((player) => (
        <article key={player.id} className="rounded-md border border-[#d4d2c4] bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="rounded bg-[#e4eee8] px-2 py-1 text-sm font-bold text-[#24523f]">{winds[player.wind]}</span>
            <span className="text-xs font-semibold text-[#66706a]">{player.id === game?.dealerIndex ? "親" : "子"}</span>
          </div>
          <h3 className="mt-3 text-base font-bold">{player.name}</h3>
          <p className="text-xl font-bold tabular-nums">{player.points.toLocaleString()}点</p>
          <p className="mt-1 text-xs text-[#66706a]">{player.kind === "human" ? "人間" : "CPU"} {player.riichi ? "リーチ" : ""}</p>
        </article>
      ))}
    </section>
  );
}

function BoardView({ game }: Readonly<{ game?: NonNullable<ReturnType<typeof useMatchController>["state"]["game"]> }>) {
  return (
    <section className="rounded-md border border-[#d4d2c4] bg-[#1f5f4a] p-4 text-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">ドラ表示牌</span>
        {(game?.doraIndicators ?? ["3m"]).map((tile, index) => (
          <TileButton key={`${tile}-${index}`} tile={tile} disabled />
        ))}
        <span className="ml-auto">現在の手番: {game?.players[game.currentPlayerId]?.name ?? "対戦開始前"}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(game?.players ?? []).map((player) => (
          <div key={player.id} className="rounded-md bg-white/10 p-3">
            <p className="text-sm font-semibold">{player.name}の河</p>
            <div className="mt-2 flex min-h-10 flex-wrap gap-1">
              {player.discards.map((tile, index) => (
                <TileButton key={`${tile}-${index}`} tile={tile} disabled />
              ))}
            </div>
            <p className="mt-2 text-xs">鳴き面子: {player.melds.length === 0 ? "なし" : player.melds.map((meld) => meld.tiles.join(" ")).join(" / ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HumanHand({
  tiles,
  canDiscard,
  canRiichi,
  canTsumo,
  canRon,
  canPon,
  canChi,
  canKan,
  canPass,
  kanTile,
  onDiscard,
  onRiichi,
  onKan,
  onTsumo,
  onRon,
  onPon,
  onChi,
  onPass,
}: Readonly<{
  tiles: readonly Tile[];
  canDiscard: boolean;
  canRiichi: boolean;
  canTsumo: boolean;
  canRon: boolean;
  canPon: boolean;
  canChi: boolean;
  canKan: boolean;
  canPass: boolean;
  kanTile?: Tile;
  onDiscard: (tile: Tile) => void;
  onRiichi: (tile: Tile) => void;
  onKan: (tile: Tile) => void;
  onTsumo: () => void;
  onRon: () => void;
  onPon: () => void;
  onChi: () => void;
  onPass: () => void;
}>) {
  const resolvedKanTile =
    kanTile ??
    tiles.find(
      (tile) =>
        tiles.filter(
          (candidate) =>
            candidate === tile ||
            (candidate.startsWith("0") ? `5${candidate[1]}` : candidate) === (tile.startsWith("0") ? `5${tile[1]}` : tile),
        ).length >= 4,
    );
  return (
    <section className="rounded-md border border-[#d4d2c4] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">人間の手牌</h2>
        <div className="flex gap-2">
          <button type="button" className={actionButton(canTsumo)} disabled={!canTsumo} onClick={onTsumo}>
            ツモ
          </button>
          <button type="button" className={actionButton(canChi)} disabled={!canChi} onClick={onChi}>
            チー
          </button>
          <button type="button" className={actionButton(canPon)} disabled={!canPon} onClick={onPon}>
            ポン
          </button>
          <button type="button" className={actionButton(canKan)} disabled={!canKan || resolvedKanTile === undefined} onClick={() => resolvedKanTile !== undefined && onKan(resolvedKanTile)}>
            カン
          </button>
          <button type="button" className={actionButton(canRon)} disabled={!canRon} onClick={onRon}>
            ロン
          </button>
          <button type="button" className={actionButton(canPass)} disabled={!canPass} onClick={onPass}>
            パス
          </button>
        </div>
      </div>
      <div className="mt-4 flex min-h-16 flex-wrap gap-2">
        {tiles.length === 0 ? (
          <p className="text-sm text-[#66706a]">対戦開始で配牌されます。</p>
        ) : (
          tiles.map((tile, index) => (
            <div key={`${tile}-${index}`} className="flex flex-col items-center gap-1">
              <TileButton tile={tile} disabled={!canDiscard} onClick={() => onDiscard(tile)} />
              <button
                type="button"
                className="h-7 rounded-md border border-[#b7b5a7] px-2 text-xs disabled:opacity-40"
                disabled={!canRiichi || !canDiscard}
                onClick={() => onRiichi(tile)}
              >
                リーチ
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ResultPanel({ game, onConfirm }: Readonly<{ game?: NonNullable<ReturnType<typeof useMatchController>["state"]["game"]>; onConfirm: () => void }>) {
  if (game?.phase === "finished") {
    return (
      <section className="rounded-md border border-[#d4d2c4] bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">最終順位</h2>
        <ol className="mt-3 grid gap-2">
          {game.rankings?.map((player, index) => (
            <li key={player.id} className="flex justify-between rounded-md bg-[#f0f3ec] px-3 py-2">
              <span>{index + 1}位 {player.name}</span>
              <span>{player.points.toLocaleString()}点</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  if (game?.phase !== "result" || game.result === undefined) {
    return null;
  }
  return (
    <section className="rounded-md border border-[#d4d2c4] bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold">{game.result.type === "win" ? "和了結果" : "流局結果"}</h2>
      {game.result.type === "win" ? (
        <div className="mt-3 grid gap-2 text-sm">
          <p>和了者: {game.players[game.result.winnerId]?.name}</p>
          <p>放銃者: {game.result.loserId === undefined ? "なし" : game.players[game.result.loserId]?.name}</p>
          <p>和了種別: {game.result.winType === "tsumo" ? "ツモ" : "ロン"}</p>
          <p>成立役: {game.result.score.yaku.map((yaku) => `${yaku.name} ${yaku.han}翻`).join(" / ")}</p>
          <p>
            翻数・符: {game.result.score.han}翻 {game.result.score.fu}符
          </p>
          <p>点数: {game.result.pointDeltas.map((delta, index) => `${game.players[index]?.name}:${delta}`).join(" / ")}</p>
          <p>親継続: {game.result.dealerContinues ? "連荘" : "輪荘"}</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 text-sm">
          <p>テンパイ: {game.result.tenpaiPlayerIds.map((id) => game.players[id]?.name).join(" / ") || "なし"}</p>
          <p>点数移動: {game.result.pointDeltas.map((delta, index) => `${game.players[index]?.name}:${delta}`).join(" / ")}</p>
          <p>親継続: {game.result.dealerContinues ? "連荘" : "輪荘"}</p>
        </div>
      )}
      <button type="button" className="mt-4 h-10 rounded-md bg-[#1f5f4a] px-4 text-sm font-semibold text-white" onClick={onConfirm}>
        結果確定
      </button>
    </section>
  );
}

function TileButton({ tile, disabled, onClick }: Readonly<{ tile: Tile; disabled?: boolean; onClick?: () => void }>) {
  return (
    <button
      type="button"
      className="h-12 min-w-9 rounded-md border border-[#b7b5a7] bg-[#fffdf6] px-2 text-base font-bold text-[#1f2421] shadow-sm disabled:cursor-default disabled:opacity-90"
      disabled={disabled}
      onClick={onClick}
      aria-label={`牌 ${tile}`}
    >
      {tile}
    </button>
  );
}

const segmented = (active: boolean): string =>
  `h-10 rounded-md border px-3 font-semibold ${active ? "border-[#1f5f4a] bg-[#dcebe3] text-[#184b3a]" : "border-[#d4d2c4] bg-white text-[#323832]"}`;

const actionButton = (enabled: boolean): string =>
  `h-9 rounded-md px-3 text-sm font-semibold ${enabled ? "bg-[#1f5f4a] text-white" : "bg-[#d9d8ce] text-[#70756f]"}`;
