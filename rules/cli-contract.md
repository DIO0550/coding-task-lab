# 点数計算エンジンのCLI入出力契約

`mahjong/` で以下を実行すると、標準入力のJSONを評価して結果JSONを1行で標準出力に書き出す。

```bash
echo '<入力JSON>' | pnpm --silent calc
```

実装は `src/cli/calc.ts`(標準入出力のみ)→ `src/services/score-io`(検証と整形)→
`src/services/score-calculation`(点数計算)の順に委譲する。
外部ランタイム依存はなく、Node.js の型剥がし(`node --experimental-strip-types`)で動作する。

## 入力

```jsonc
{
  "hand": ["1m", "2m", "3m", "4p", "5p", "6p", "7s", "8s", "9s", "ton", "ton", "ton", "5m"],
  "melds": [{ "type": "chi", "tiles": ["1m", "2m", "3m"] }],
  "winTile": "5m",
  "winType": "ron",
  "seatWind": "ton",
  "roundWind": "ton",
  "dora": ["3m"],
  "uraDora": [],
  "riichi": "none",
  "ippatsu": false,
  "situational": [],
  "honba": 0,
  "riichiSticks": 0
}
```

| 項目 | 必須 | 内容 |
|---|---|---|
| `hand` | ✓ | 純手牌(副露を除く)。**和了牌を含む14枚形**と、**和了牌を含まない13枚形**の両方を受け付ける(`docs/assumptions.md` 1.2)。槓を含む場合は `hand + melds*3` が14になるように数える |
| `melds` | | 副露。省略時は `[]` |
| `winTile` | ✓ | 和了牌 |
| `winType` | ✓ | `tsumo` / `ron` |
| `seatWind` | ✓ | `ton` / `nan` / `sha` / `pei`。`ton` が親 |
| `roundWind` | ✓ | `ton` / `nan` |
| `dora` | | ドラ**そのもの**(表示牌ではない)。同じ牌を複数指定すると枚数分だけ重なる |
| `uraDora` | | 裏ドラそのもの。`riichi` が `none` のときは無視する |
| `riichi` | | `none` / `riichi` / `double`。省略時 `none` |
| `ippatsu` | | 真偽値。省略時 `false` |
| `situational` | | `haitei` / `houtei` / `rinshan` / `chankan` / `tenhou` / `chihou` の配列 |
| `honba` | | 本場数(0以上の整数)。省略時 `0` |
| `riichiSticks` | | 供託リーチ棒の本数(0以上の整数)。省略時 `0` |

### 牌表記

- 数牌: `1m`〜`9m`(萬子) / `1p`〜`9p`(筒子) / `1s`〜`9s`(索子)
- 字牌: `ton` `nan` `sha` `pei` `haku` `hatsu` `chun`
- 赤5: `0m` `0p` `0s`

### 副露の形式

| `type` | 枚数 | 条件 |
|---|---|---|
| `chi` | 3 | 同色の連続する3枚 |
| `pon` | 3 | 同じ牌3枚 |
| `kan` | 4 | 同じ牌4枚(明槓。加槓を含む) |
| `ankan` | 4 | 同じ牌4枚(暗槓。門前を崩さない) |

## 出力(和了時)

```jsonc
{
  "valid": true,
  "yaku": [{ "name": "yakuhai_round_wind", "han": 1 }, { "name": "yakuhai_seat_wind", "han": 1 }],
  "han": 2,
  "fu": 40,
  "score": {
    "total": 3900,
    "limit": "none",
    "payments": [{ "from": "discarder", "amount": 3900 }]
  }
}
```

- `yaku`: 成立した役と翻数。ドラは `dora` / `ura_dora` / `aka_dora` として枚数分の `han` を持つ項目で含む
- `han`: 合計翻数。役満は `13 × 倍数`
- `fu`: 符
- `score.total`: 和了者の収入合計(**本場・供託を含む**)
- `score.limit`: `none` / `mangan` / `haneman` / `baiman` / `sanbaiman` / `kazoe_yakuman` / `yakuman`
- `score.payments`: 支払い内訳(**本場を含み、供託は含まない**)
  - `from`: `discarder`(ロンの放銃者) / `dealer`(親) / `non_dealer`(子)
  - `total == sum(payments.amount) + 1000 * riichiSticks`

### 役名一覧

| 分類 | `name` |
|---|---|
| 1翻 | `riichi` `ippatsu` `menzen_tsumo` `pinfu` `tanyao` `iipeiko` `yakuhai_haku` `yakuhai_hatsu` `yakuhai_chun` `yakuhai_round_wind` `yakuhai_seat_wind` `rinshan_kaihou` `chankan` `haitei_raoyue` `houtei_raoyui` |
| 2翻 | `double_riichi` `chiitoitsu` `chanta` `ittsu` `sanshoku_doujun` `sanshoku_doukou` `toitoi` `sanankou` `sankantsu` `shousangen` `honroutou` |
| 3翻 | `honitsu` `junchan` `ryanpeikou` |
| 6翻 | `chinitsu` |
| 役満 | `kokushi_musou` `suuankou` `daisangen` `shousuushii` `tsuuiisou` `chinroutou` `ryuuiisou` `chuuren_poutou` `suukantsu` `tenhou` `chihou` |
| ダブル役満 | `kokushi_musou_juusanmen` `suuankou_tanki` `daisuushii` `junsei_chuuren_poutou` |
| ドラ | `dora` `ura_dora` `aka_dora` |

`chanta` `ittsu` `sanshoku_doujun` `honitsu` `junchan` `chinitsu` は副露時に1翻下がる。
`riichi` `double_riichi` `ippatsu` `menzen_tsumo` `pinfu` `iipeiko` `ryanpeikou` `chiitoitsu` は門前限定。

## 出力(和了不成立)

```jsonc
{ "valid": false, "reason": "no_yaku" | "not_winning_hand" | "invalid_input" }
```

| `reason` | 条件 |
|---|---|
| `invalid_input` | JSONとして解釈できない / 必須項目の欠落 / 牌表記や副露の形が不正 / 枚数が13でも14でもない / 同じ牌が5枚以上 / 和了牌が14枚形の手牌に含まれない |
| `not_winning_hand` | 入力は正しいが和了形(通常形・七対子・国士無双)が成立しない |
| `no_yaku` | 和了形は成立するがドラを除く役が1つもない |

## 採用ルール

喰いタンあり / 後付けあり / 平和ツモ20符 / 七対子25符固定 / 切り上げ満貫なし /
役満の複合あり(ダブル役満まで) / 数え役満は13翻以上 / 人和なし / 緑一色に發は不要 /
複数解釈がある手は高点法。

細部の判断は [docs/assumptions.md](../docs/assumptions.md) を参照。
