import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function writeCjsPackageJson(cwd = process.cwd()) {
  const cjsOutDir = path.resolve(cwd, "dist/cjs");
  const cjsPackageJsonPath = path.join(cjsOutDir, "package.json");

  fs.mkdirSync(cjsOutDir, { recursive: true });
  fs.writeFileSync(cjsPackageJsonPath, JSON.stringify({ type: "commonjs" }, null, 2));

  return cjsPackageJsonPath;
}

export function isExecutedDirectly(
  moduleUrl = import.meta.url,
  entryPath = process.argv[1]
) {
  return Boolean(entryPath) && moduleUrl === pathToFileURL(entryPath).href;
}

export function runWriteCjsEntrypoint(options = {}) {
  const {
    moduleUrl = import.meta.url,
    entryPath = process.argv[1],
    run = () => writeCjsPackageJson()
  } = options;

  if (isExecutedDirectly(moduleUrl, entryPath)) {
    return run();
  }

  return null;
}

runWriteCjsEntrypoint();
