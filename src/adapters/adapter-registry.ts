import type { Adapter } from "./adapter.js";

export interface AdapterRegistry {
  register: (adapter: Adapter) => void;
  list: () => readonly Adapter[];
  applyAll: () => Promise<void>;
}
