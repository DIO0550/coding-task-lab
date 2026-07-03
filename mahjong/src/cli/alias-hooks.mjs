// Node で TypeScript ソース(@/ エイリアス・拡張子なし import)を直接実行するための
// resolve フック。tsconfig の paths (@/* → プロジェクトルート) と同じ解決を行う。
import { access } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";

const PROJECT_ROOT = new URL("../../", import.meta.url);

const exists = async (url) => {
  try {
    await access(fileURLToPath(url));
    return true;
  } catch {
    return false;
  }
};

const resolveTsUrl = async (baseUrl) => {
  const candidates = [
    baseUrl,
    `${baseUrl}.ts`,
    `${baseUrl}.tsx`,
    `${baseUrl}/index.ts`,
  ];
  for (const candidate of candidates) {
    if (candidate.endsWith(".ts") || candidate.endsWith(".tsx") || candidate.endsWith(".mjs")) {
      if (await exists(new URL(candidate))) {
        return candidate;
      }
    }
  }
  return null;
};

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), PROJECT_ROOT).href;
    const resolved = await resolveTsUrl(base);
    if (resolved !== null) {
      return { url: resolved, shortCircuit: true };
    }
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL !== undefined &&
    context.parentURL.startsWith(pathToFileURL(fileURLToPath(PROJECT_ROOT)).href)
  ) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      const base = new URL(specifier, context.parentURL).href;
      const resolved = await resolveTsUrl(base);
      if (resolved !== null) {
        return { url: resolved, shortCircuit: true };
      }
      throw error;
    }
  }
  return nextResolve(specifier, context);
}
