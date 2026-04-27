export interface AssemblyContext {
  readonly activeAdapters: readonly string[];
  shutdown: () => Promise<void>;
}
