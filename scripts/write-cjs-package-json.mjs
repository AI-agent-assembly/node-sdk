import fs from "node:fs";
import path from "node:path";

const cjsOutDir = path.resolve(process.cwd(), "dist/cjs");
const cjsPackageJsonPath = path.join(cjsOutDir, "package.json");

fs.mkdirSync(cjsOutDir, { recursive: true });
fs.writeFileSync(cjsPackageJsonPath, JSON.stringify({ type: "commonjs" }, null, 2));
