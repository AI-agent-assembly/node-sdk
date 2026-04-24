export type RuntimeMode = "grpc-sidecar" | "napi-inprocess";

export interface InitAssemblyOptions {
  gateway: string;
  apiKey: string;
  mode?: RuntimeMode;
}

export interface AssemblyRuntimeHandle {
  close: () => Promise<void>;
}
