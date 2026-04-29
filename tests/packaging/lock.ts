import fs from "node:fs";
import path from "node:path";

const PACKAGING_LOCK_PATH = path.resolve(process.cwd(), ".packaging-test.lock");
const LOCK_RETRY_INTERVAL_MS = 25;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withPackagingLock<T>(
  callback: () => Promise<T> | T
): Promise<T> {
  let lockFd: number | undefined;

  while (lockFd === undefined) {
    try {
      lockFd = fs.openSync(PACKAGING_LOCK_PATH, "wx");
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") {
        throw error;
      }

      await sleep(LOCK_RETRY_INTERVAL_MS);
    }
  }

  try {
    return await callback();
  } finally {
    fs.closeSync(lockFd);
    fs.rmSync(PACKAGING_LOCK_PATH, { force: true });
  }
}
