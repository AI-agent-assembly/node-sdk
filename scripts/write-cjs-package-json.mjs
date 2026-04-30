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

function isExecutedDirectly() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isExecutedDirectly()) {
  writeCjsPackageJson();
}
