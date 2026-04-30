import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isExecutedDirectly,
  runWriteCjsEntrypoint,
  writeCjsPackageJson
} from "../../scripts/write-cjs-package-json.mjs";

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

  it("runs cjs writer only for direct execution entrypoint", () => {
    const modulePath = path.resolve("tmp-write-cjs-entrypoint.mjs");
    const moduleUrl = pathToFileURL(modulePath).href;
    const otherPath = path.resolve("tmp-write-cjs-other.mjs");

    expect(isExecutedDirectly(moduleUrl, modulePath)).toBe(true);
    expect(isExecutedDirectly(moduleUrl, otherPath)).toBe(false);

    const runSpy = vi.fn(() => "/tmp/dist/cjs/package.json");

    expect(
      runWriteCjsEntrypoint({
        moduleUrl,
        entryPath: modulePath,
        run: runSpy
      })
    ).toBe("/tmp/dist/cjs/package.json");
    expect(runSpy).toHaveBeenCalledTimes(1);

    expect(
      runWriteCjsEntrypoint({
        moduleUrl,
        entryPath: otherPath,
        run: runSpy
      })
    ).toBeNull();
    expect(runSpy).toHaveBeenCalledTimes(1);
  });
});
