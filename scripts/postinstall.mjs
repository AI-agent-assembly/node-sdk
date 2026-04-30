import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const requireFromHere = createRequire(import.meta.url);

const SUPPORTED_PLATFORM_KEYS = {
  "darwin-arm64": "darwin-arm64",
  "darwin-x64": "darwin-x64",
  "linux-x64": "linux-x64-gnu",
  "win32-x64": "win32-x64-msvc"
};

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

export function findFirstNodeBinary(dirPath) {
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

export function resolveBinaryFromPackage(
  packageName,
  options = {}
) {
  const { cwd = process.cwd() } = options;

  const packageJsonPath = requireFromHere.resolve(`${packageName}/package.json`, {
    paths: [cwd]
  });
  const packageDir = path.dirname(packageJsonPath);
  const binaryPath = findFirstNodeBinary(packageDir);

  if (!binaryPath) {
    throw new Error(`No .node file found in ${packageName}`);
  }

  return binaryPath;
}

export function selectBinaryForCurrentPlatform(options = {}) {
  const {
    platform = process.platform,
    arch = process.arch,
    cwd = process.cwd(),
    targetNativeDir = path.resolve(cwd, "native/aa-ffi-node"),
    logger = console
  } = options;

  const packageName = resolveBinaryPackageName(platform, arch);

  if (!packageName) {
    logger.warn(
      `[agent-assembly] Unsupported platform: ${platform}-${arch}; skipping binary selection.`
    );
    return null;
  }

  const sourceBinaryPath = resolveBinaryFromPackage(packageName, { cwd });
  const targetBinaryPath = path.join(targetNativeDir, "index.node");

  fs.mkdirSync(targetNativeDir, { recursive: true });
  fs.copyFileSync(sourceBinaryPath, targetBinaryPath);

  logger.info(`[agent-assembly] Selected binary package ${packageName}`);

  return {
    packageName,
    sourceBinaryPath,
    targetBinaryPath
  };
}

export function runPostinstall(options = {}) {
  const { logger = console } = options;

  try {
    selectBinaryForCurrentPlatform(options);
    return true;
  } catch (error) {
    logger.warn(
      `[agent-assembly] Failed to select native binary: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

export function isExecutedDirectly(
  moduleUrl = import.meta.url,
  entryPath = process.argv[1]
) {
  return Boolean(entryPath) && moduleUrl === pathToFileURL(entryPath).href;
}

export function runPostinstallEntrypoint(options = {}) {
  const {
    moduleUrl = import.meta.url,
    entryPath = process.argv[1],
    run = () => runPostinstall(options)
  } = options;

  if (isExecutedDirectly(moduleUrl, entryPath)) {
    return run();
  }

  return null;
}

runPostinstallEntrypoint();
