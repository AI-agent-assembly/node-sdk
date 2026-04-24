import type { InitAssemblyOptions } from "../types/policy.js";

export interface NativeClient {
  readonly mode: "grpc-sidecar" | "napi-inprocess";
  close: () => Promise<void>;
}

export function createNativeClient(options: InitAssemblyOptions): NativeClient {
  const mode = options.mode ?? "grpc-sidecar";

  return {
    mode,
    close: async () => {
      return Promise.resolve();
    }
  };
}
