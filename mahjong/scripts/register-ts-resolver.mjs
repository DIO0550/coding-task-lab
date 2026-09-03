// CLI 実行用の ESM 解決フック(依存追加なし)。
// Node の型ストリップ実行では拡張子省略・ディレクトリ import・`@/` エイリアスを
// 解決できないため、tsconfig の paths(`@/*` → プロジェクトルート)と同じ規則で解決する。
import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

const isFile = (candidate) => existsSync(candidate) && statSync(candidate).isFile();

const resolveWithExtensions = (basePath) => {
  if (isFile(basePath)) return basePath;
  for (const ext of EXTENSIONS) {
    if (isFile(basePath + ext)) return basePath + ext;
  }
  for (const ext of EXTENSIONS) {
    const indexPath = path.join(basePath, `index${ext}`);
    if (isFile(indexPath)) return indexPath;
  }
  return undefined;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliased = specifier.startsWith("@/")
      ? path.join(projectRoot, specifier.slice(2))
      : undefined;
    const relative =
      (specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL
        ? path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
        : undefined;
    const target = aliased ?? relative;
    if (target === undefined) return nextResolve(specifier, context);
    const resolved = resolveWithExtensions(target);
    if (resolved === undefined) return nextResolve(specifier, context);
    return nextResolve(pathToFileURL(resolved).href, context);
  },
});
