import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const requireFromHere = createRequire(import.meta.url);

const SUPPORTED_PLATFORM_KEYS = {
  "darwin-arm64": "darwin-arm64",
  "darwin-x64": "darwin-x64",
  "linux-x64": "linux-x64-gnu",
  "win32-x64": "win32-x64-msvc"
};

const TARGET_NATIVE_DIR = path.resolve(process.cwd(), "native/aa-ffi-node");
const TARGET_BINARY_PATH = path.join(TARGET_NATIVE_DIR, "index.node");

export function detectPlatformKey(platform = process.platform, arch = process.arch) {
  return SUPPORTED_PLATFORM_KEYS[`${platform}-${arch}`] ?? null;
}

export function resolveBinaryPackageName(platform = process.platform, arch = process.arch) {
  const platformKey = detectPlatformKey(platform, arch);

  if (!platformKey) {
    return null;
  }

  return `@agent-assembly/${platformKey}`;
}

function findFirstNodeBinary(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const nested = findFirstNodeBinary(entryPath);
      if (nested) {
        return nested;
      }
    }

    if (entry.isFile() && entry.name.endsWith(".node")) {
      return entryPath;
    }
  }

  return null;
}

function resolveBinaryFromPackage(packageName) {
  const packageJsonPath = requireFromHere.resolve(`${packageName}/package.json`, {
    paths: [process.cwd()]
  });
  const packageDir = path.dirname(packageJsonPath);
  const binaryPath = findFirstNodeBinary(packageDir);

  if (!binaryPath) {
    throw new Error(`No .node file found in ${packageName}`);
  }

  return binaryPath;
}

function selectBinaryForCurrentPlatform() {
  const packageName = resolveBinaryPackageName();

  if (!packageName) {
    console.warn(
      `[agent-assembly] Unsupported platform: ${process.platform}-${process.arch}; skipping binary selection.`
    );
    return;
  }

  const sourceBinaryPath = resolveBinaryFromPackage(packageName);

  fs.mkdirSync(TARGET_NATIVE_DIR, { recursive: true });
  fs.copyFileSync(sourceBinaryPath, TARGET_BINARY_PATH);

  console.info(`[agent-assembly] Selected binary package ${packageName}`);
}

try {
  selectBinaryForCurrentPlatform();
} catch (error) {
  console.warn(
    `[agent-assembly] Failed to select native binary: ${error instanceof Error ? error.message : String(error)}`
  );
}
