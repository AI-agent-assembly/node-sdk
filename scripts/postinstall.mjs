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

// TODO(AAASM-61): postinstall resolution flow will be implemented in follow-up commit.
