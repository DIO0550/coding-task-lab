import { TileButton } from "./tile-button.tsx";

const PALETTE_ROWS: ReadonlyArray<ReadonlyArray<string>> = [
  ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "0m"],
  ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "0p"],
  ["1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s", "0s"],
  ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"],
];

type Props = Readonly<{
  onPick: (notation: string) => void;
}>;

/** 全34種+赤5の牌パレット。クリックした牌を onPick に通知する */
export const TilePalette = ({ onPick }: Props) => (
  <div className="space-y-1.5">
    {PALETTE_ROWS.map((row) => (
      <div key={row[0]} className="flex flex-wrap gap-1">
        {row.map((notation) => (
          <TileButton
            key={notation}
            notation={notation}
            onClick={() => onPick(notation)}
          />
        ))}
      </div>
    ))}
  </div>
);
