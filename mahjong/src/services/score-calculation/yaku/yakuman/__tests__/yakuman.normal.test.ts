import { expect, test } from "vitest";

import {
  hanOf,
  winningHandOf,
  yakuNames,
} from "../../__tests__/winning-hand-fixture.ts";
import { YakumanDetection } from "../index.ts";

test("么九牌13種を揃えた単騎待ちの手では国士無双が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1m 1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun",
      winTile: "chun",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["kokushi_musou"]);
});

test("么九牌13種を揃えた十三面待ちの手では国士無双十三面待ちが成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1m 1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun",
      winTile: "1m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["kokushi_musou_juusanmen"]);
});

test("暗刻4つをツモで揃えると四暗刻が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 5p 5p 5p 8s 8s 8s ton ton ton 9m 9m",
      winTile: "2m",
      winBlock: "triplet:2m",
      winType: "tsumo",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["suuankou"]);
});

test("暗刻4つを単騎待ちで和了すると四暗刻単騎が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "2m 2m 2m 5p 5p 5p 8s 8s 8s ton ton ton 9m 9m",
      winTile: "9m",
      winBlock: "pair:9m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["suuankou_tanki"]);
});

test("三元牌の刻子が3つあると大三元が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "haku haku haku hatsu hatsu hatsu chun chun chun 2m 3m 4m 9s 9s",
      winTile: "4m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["daisangen"]);
});

test("風牌の刻子3つと風牌の雀頭で小四喜が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "ton ton ton nan nan nan sha sha sha pei pei 2m 3m 4m",
      winTile: "4m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["shousuushii"]);
});

test("風牌の刻子が4つあると大四喜が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "ton ton ton nan nan nan sha sha sha 5m 5m",
      melds: ["pon pei pei pei"],
      winTile: "5m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["daisuushii"]);
});

test("字牌だけで構成された手では字一色が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "ton ton ton nan nan nan haku haku haku chun chun",
      melds: ["pon sha sha sha"],
      winTile: "chun",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["tsuuiisou"]);
});

test("七対子形でも字牌だけなら字一色が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "ton ton nan nan sha sha pei pei haku haku hatsu hatsu chun chun",
      winTile: "chun",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["tsuuiisou"]);
});

test("老頭牌だけで構成された手では清老頭が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1m 1m 1m 9m 9m 9m 1p 1p 1p 1s 1s",
      melds: ["pon 9s 9s 9s"],
      winTile: "1s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chinroutou"]);
});

test("發を含まなくても緑の牌だけで構成されていれば緑一色が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "2s 2s 2s 3s 3s 3s 4s 4s 4s 8s 8s",
      melds: ["pon 6s 6s 6s"],
      form: "triplet:2s triplet:3s triplet:4s triplet:6s pair:8s",
      winTile: "8s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["ryuuiisou"]);
});

test("發を含む緑の牌だけの手でも緑一色が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "hatsu hatsu hatsu 2s 2s 2s 3s 3s 3s 4s 4s 6s 6s 6s",
      winTile: "6s",
      winBlock: "triplet:6s",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["ryuuiisou"]);
});

test("門前の清一色で1112345678999形を揃えると九蓮宝燈が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1m 1m 1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5m",
      winTile: "2m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chuuren_poutou"]);
});

test("和了牌を除いた13枚が1112345678999なら純正九蓮宝燈が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "1m 1m 1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5m",
      winTile: "5m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["junsei_chuuren_poutou"]);
});

test("槓子が4つあると四槓子が成立する", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "5m 5m",
      melds: [
        "ankan 2m 2m 2m 2m",
        "ankan 5p 5p 5p 5p",
        "ankan 8s 8s 8s 8s",
        "minkan 3s 3s 3s 3s",
      ],
      winTile: "5m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["suukantsu"]);
});

test("役満は13翻として扱われる", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "haku haku haku hatsu hatsu hatsu chun chun chun 2m 3m 4m 9s 9s",
      winTile: "4m",
    }),
  );
  expect(hanOf(yaku, "daisangen")).toBe(13);
});

test("ダブル役満は26翻として扱われる", () => {
  const yaku = YakumanDetection.detect(
    winningHandOf({
      concealed: "ton ton ton nan nan nan sha sha sha 5m 5m",
      melds: ["pon pei pei pei"],
      winTile: "5m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(hanOf(yaku, "daisuushii")).toBe(26);
});
