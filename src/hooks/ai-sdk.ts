import type { NativeClient } from "../native/client.js";

export async function patchVercelAiSdk(client: NativeClient): Promise<boolean> {
  void client;
  return false;
}
