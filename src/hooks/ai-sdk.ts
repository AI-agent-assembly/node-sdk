import type { NativeClient } from "../native/client.js";

export async function patchVercelAiSdk(client: NativeClient): Promise<boolean> {
  if (client.mode === "grpc-sidecar" || client.mode === "napi-inprocess") {
    return false;
  }
  return false;
}
