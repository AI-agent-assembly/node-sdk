import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Holds the current agent's ID for automatic lineage propagation.
 * When a framework spawns a child agent, the child's initAssembly reads
 * this store to auto-populate parentAgentId without manual threading.
 */
export const agentContextStore = new AsyncLocalStorage<string>();

/** Run fn within a context where the current agent ID is set. */
export function runWithAgentId<T>(agentId: string, fn: () => T): T {
  return agentContextStore.run(agentId, fn);
}

/** Return the current agent ID from the async context, or undefined if absent. */
export function currentAgentId(): string | undefined {
  return agentContextStore.getStore();
}
