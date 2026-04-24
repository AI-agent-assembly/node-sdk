import { createNativeClient } from "./native/client.js";
import { registerFrameworkHooks } from "./hooks/adapter-registry.js";
import type { AssemblyRuntimeHandle, InitAssemblyOptions } from "./types/policy.js";

export async function initAssembly(
  options: InitAssemblyOptions
): Promise<AssemblyRuntimeHandle> {
  const client = createNativeClient(options);
  await registerFrameworkHooks(client);

  return {
    close: async () => {
      await client.close();
    }
  };
}

export type { AssemblyRuntimeHandle, InitAssemblyOptions } from "./types/policy.js";
