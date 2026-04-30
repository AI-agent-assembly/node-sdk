declare module "../../scripts/postinstall.mjs" {
  export function detectPlatformKey(platform?: string, arch?: string): string | null;
  export function resolveBinaryPackageName(platform?: string, arch?: string): string | null;
  export function findFirstNodeBinary(dirPath: string): string | null;
  export function resolveBinaryFromPackage(
    packageName: string,
    options?: { cwd?: string }
  ): string;
  export function selectBinaryForCurrentPlatform(options?: {
    platform?: string;
    arch?: string;
    cwd?: string;
    targetNativeDir?: string;
    logger?: { info: (message: string) => void; warn: (message: string) => void };
  }):
    | {
        packageName: string;
        sourceBinaryPath: string;
        targetBinaryPath: string;
      }
    | null;
  export function runPostinstall(options?: {
    platform?: string;
    arch?: string;
    cwd?: string;
    targetNativeDir?: string;
    logger?: { info: (message: string) => void; warn: (message: string) => void };
  }): boolean;
}

declare module "../../scripts/write-cjs-package-json.mjs" {
  export function writeCjsPackageJson(cwd?: string): string;
}
