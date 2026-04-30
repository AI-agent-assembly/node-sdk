import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectPlatformKey,
  isExecutedDirectly,
  resolveBinaryPackageName,
  runPostinstallEntrypoint,
  runPostinstall,
  selectBinaryForCurrentPlatform
} from "../../scripts/postinstall.mjs";

const tempDirs: string[] = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.resolve(process.cwd(), ".tmp-postinstall-"));
  tempDirs.push(dir);
  return dir;
}

function seedPlatformPackage(
  cwd: string,
  packageName: string,
  options: { withBinary: boolean }
) {
  const packageDir = path.join(cwd, "node_modules", ...packageName.split("/"));
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, "package.json"), JSON.stringify({ name: packageName }, null, 2));

  if (options.withBinary) {
    const binaryDir = path.join(packageDir, "prebuilds");
    fs.mkdirSync(binaryDir, { recursive: true });
    fs.writeFileSync(path.join(binaryDir, "index.node"), "fake-native-binary");
  }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("postinstall script", () => {
  it("maps platform and arch to supported package names", () => {
    expect(detectPlatformKey("linux", "x64")).toBe("linux-x64-gnu");
    expect(detectPlatformKey("darwin", "arm64")).toBe("darwin-arm64");
    expect(resolveBinaryPackageName("win32", "x64")).toBe("@agent-assembly/win32-x64-msvc");
    expect(resolveBinaryPackageName("sunos", "x64")).toBeNull();
  });

  it("copies the selected platform binary into native/aa-ffi-node/index.node", () => {
    const cwd = createTempDir();
    seedPlatformPackage(cwd, "@agent-assembly/linux-x64-gnu", { withBinary: true });

    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    };

    const result = selectBinaryForCurrentPlatform({
      platform: "linux",
      arch: "x64",
      cwd,
      logger
    });

    expect(result?.packageName).toBe("@agent-assembly/linux-x64-gnu");
    expect(result?.targetBinaryPath).toBe(
      path.join(cwd, "native/aa-ffi-node", "index.node")
    );
    expect(fs.readFileSync(result!.targetBinaryPath, "utf8")).toBe("fake-native-binary");
    expect(logger.info).toHaveBeenCalledWith(
      "[agent-assembly] Selected binary package @agent-assembly/linux-x64-gnu"
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("returns null and warns for unsupported platforms", () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    };

    const result = selectBinaryForCurrentPlatform({
      platform: "freebsd",
      arch: "arm64",
      logger
    });

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      "[agent-assembly] Unsupported platform: freebsd-arm64; skipping binary selection."
    );
  });

  it("returns true for successful postinstall selection", () => {
    const cwd = createTempDir();
    seedPlatformPackage(cwd, "@agent-assembly/darwin-arm64", { withBinary: true });

    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    };

    const ok = runPostinstall({
      platform: "darwin",
      arch: "arm64",
      cwd,
      logger
    });

    expect(ok).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("returns false and warns when package exists but no binary is found", () => {
    const cwd = createTempDir();
    seedPlatformPackage(cwd, "@agent-assembly/linux-x64-gnu", { withBinary: false });

    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    };

    const ok = runPostinstall({
      platform: "linux",
      arch: "x64",
      cwd,
      logger
    });

    expect(ok).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0]?.[0]).toContain(
      "[agent-assembly] Failed to select native binary: No .node file found in @agent-assembly/linux-x64-gnu"
    );
  });

  it("detects direct execution and runs entrypoint only in main mode", () => {
    const modulePath = path.resolve("tmp-postinstall-entrypoint.mjs");
    const moduleUrl = pathToFileURL(modulePath).href;
    const otherPath = path.resolve("tmp-postinstall-other.mjs");

    expect(isExecutedDirectly(moduleUrl, modulePath)).toBe(true);
    expect(isExecutedDirectly(moduleUrl, otherPath)).toBe(false);

    const runSpy = vi.fn(() => true);

    expect(
      runPostinstallEntrypoint({
        moduleUrl,
        entryPath: modulePath,
        run: runSpy
      })
    ).toBe(true);
    expect(runSpy).toHaveBeenCalledTimes(1);

    expect(
      runPostinstallEntrypoint({
        moduleUrl,
        entryPath: otherPath,
        run: runSpy
      })
    ).toBeNull();
    expect(runSpy).toHaveBeenCalledTimes(1);
  });
});
