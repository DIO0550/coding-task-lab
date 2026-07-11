import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // 対局全体を走らせる統合テスト(進行エンジン・CPU)は1件あたり数秒かかる。
    // 全ファイル並列実行時の CPU 競合で既定5秒を超えて偽陽性になるのを防ぐため延長する。
    testTimeout: 30000,
    hookTimeout: 30000,
    // 6コア環境での過飽和を避け、重いシミュレーションテストが CPU 飢餓に陥らないようにする。
    maxWorkers: 4,
  },
});
