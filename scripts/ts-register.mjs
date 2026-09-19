// 让 Node 能直接 import .ts（自测脚本用），复用 vite 自带的 esbuild。
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { transform } from "esbuild";

export async function resolve(specifier, context, nextResolve) {
  // TS bundler 风格的无扩展名相对导入：尝试补 .ts / /index.ts。
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.[a-zA-Z0-9]+$/.test(specifier)
  ) {
    const base = context.parentURL ?? pathToFileURL(process.cwd() + "/").href;
    const abs = new URL(specifier, base);
    const path = fileURLToPath(abs);
    const candidates = [`${path}.ts`, `${path}/index.ts`];
    for (const cand of candidates) {
      if (existsSync(cand)) {
        return { url: pathToFileURL(cand).href, shortCircuit: true, format: "module" };
      }
    }
  }
  if (specifier.endsWith(".ts")) {
    const parentURL = context.parentURL ?? pathToFileURL(process.cwd() + "/").href;
    return {
      url: new URL(specifier, parentURL).href,
      shortCircuit: true,
      format: "module",
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts")) {
    const path = new URL(url).pathname;
    const code = readFileSync(path, "utf8");
    const out = await transform(code, {
      loader: "ts",
      format: "esm",
      target: "es2021",
    });
    return { format: "module", source: out.code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
