import type { AssemblyMode } from "../types/assembly-mode.js";

export interface GatewayClient {
  readonly mode: AssemblyMode;
  start: () => Promise<void>;
  close: () => Promise<void>;
}
