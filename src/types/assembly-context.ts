export interface AssemblyContext {
  readonly activeAdapters: readonly string[];
  readonly parentAgentId?: string;
  readonly teamId?: string;
  readonly delegationReason?: string;
  shutdown: () => Promise<void>;
}
