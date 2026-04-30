export function writeCjsPackageJson(cwd?: string): string;

export function isExecutedDirectly(
  moduleUrl?: string,
  entryPath?: string
): boolean;

export function runWriteCjsEntrypoint(options?: {
  moduleUrl?: string;
  entryPath?: string;
  run?: () => string;
}): string | null;
