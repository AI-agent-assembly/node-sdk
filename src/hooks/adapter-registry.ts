import type { NativeClient } from "../native/client.js";
import { patchLangChain } from "./langchain.js";

export async function registerFrameworkHooks(client: NativeClient): Promise<void> {
  await patchLangChain(client);
}
