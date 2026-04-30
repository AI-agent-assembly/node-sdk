import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeCjsPackageJson } from "../../scripts/write-cjs-package-json.mjs";

const tempDirs: string[] = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.resolve(process.cwd(), ".tmp-write-cjs-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("write-cjs-package-json script", () => {
  it("creates dist/cjs/package.json with type commonjs", () => {
    const cwd = createTempDir();

    const outputPath = writeCjsPackageJson(cwd);

    expect(outputPath).toBe(path.join(cwd, "dist/cjs", "package.json"));
    expect(JSON.parse(fs.readFileSync(outputPath, "utf8"))).toEqual({
      type: "commonjs"
    });
  });
});
