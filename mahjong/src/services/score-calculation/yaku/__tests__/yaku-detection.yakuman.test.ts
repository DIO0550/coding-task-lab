import { expect, test } from "vitest";

import { YakuDetection } from "../index.ts";
import { totalHan, winningHandOf, yakuNames } from "./winning-hand-fixture.ts";

test("役満が成立した手では通常役も状況役も返さない", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "haku haku haku hatsu hatsu hatsu chun chun chun 2m 3m 4m 9s 9s",
      winTile: "4m",
      riichi: "riichi",
      ippatsu: true,
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["daisangen"]);
});

test("役満が成立した手では対々和や三暗刻も返さない", () => {
  const yaku = YakuDetection.detect(
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

test("複数の役満が成立する手ではすべての役満を返す", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "ton ton ton nan nan nan sha sha sha pei pei pei 5m 5m",
      winTile: "5m",
      winBlock: "pair:5m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["daisuushii", "suuankou_tanki"]);
});

test("大四喜と四暗刻単騎の複合は合計52翻になる", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "ton ton ton nan nan nan sha sha sha pei pei pei 5m 5m",
      winTile: "5m",
      winBlock: "pair:5m",
      roundWind: "nan",
      seatWind: "sha",
    }),
  );
  expect(totalHan(yaku)).toBe(52);
});

test("天和が成立した手では天和のみを返す", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s 5s 5s",
      winTile: "4s",
      winType: "tsumo",
      seatWind: "ton",
      situational: ["tenhou"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["tenhou"]);
});

test("地和が成立した手では地和のみを返す", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "1m 2m 3m 4p 5p 6p 7p 8p 9p 2s 3s 4s 5s 5s",
      winTile: "4s",
      winType: "tsumo",
      situational: ["chihou"],
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["chihou"]);
});

test("国士無双が成立した手では混老頭などの通常役を返さない", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 9m 1p 9p 1s 9s ton nan sha pei haku hatsu chun",
      winTile: "chun",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["kokushi_musou"]);
});

test("純正九蓮宝燈が成立した手では清一色を返さない", () => {
  const yaku = YakuDetection.detect(
    winningHandOf({
      concealed: "1m 1m 1m 2m 3m 4m 5m 6m 7m 8m 9m 9m 9m 5m",
      winTile: "5m",
    }),
  );
  expect(yakuNames(yaku)).toStrictEqual(["junsei_chuuren_poutou"]);
});
