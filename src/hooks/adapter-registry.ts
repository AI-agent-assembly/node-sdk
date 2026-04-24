import type { NativeClient } from "../native/client.js";
import { patchLangChain } from "./langchain.js";
import { patchVercelAiSdk } from "./ai-sdk.js";

export async function registerFrameworkHooks(client: NativeClient): Promise<void> {
  await patchLangChain(client);
  await patchVercelAiSdk(client);
}
