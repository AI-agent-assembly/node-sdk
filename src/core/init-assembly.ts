import type { GatewayClient } from "../gateway/client.js";
import type { AssemblyConfig } from "../types/assembly-config.js";

export function createClient(config: AssemblyConfig): GatewayClient {
  const mode = config.mode ?? "auto";

  return {
    mode,
    start: async () => undefined,
    close: async () => undefined
  };
}
