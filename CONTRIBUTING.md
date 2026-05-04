# Contributing to @agent-assembly/sdk

Thank you for considering a contribution! This guide explains how to set up your local
environment and start hacking on the Node.js SDK for Agent Assembly.

## Development environment setup

### Prerequisites

- Node.js ≥ 18.18.0 (LTS)
- pnpm ≥ 10
- Git
- Rust toolchain (only required when rebuilding the native `aa-ffi-node` binding)

### Clone and install

```bash
git clone https://github.com/AI-agent-assembly/node-sdk.git
cd node-sdk
pnpm install
pnpm build
```

`pnpm install` runs `scripts/postinstall.mjs` to wire in the prebuilt native binding for
your platform. `pnpm build` produces both ESM (`dist/esm/`) and CJS (`dist/cjs/`) outputs
from a single TypeScript source.

If you intend to modify the native Rust crate (`native/aa-ffi-node/`), rebuild it with:

```bash
pnpm native:build               # debug build, local
pnpm native:build:release       # release build, per-platform artifact
pnpm native:check-types         # validate generated index.d.ts
```

## Adding a framework adapter

Framework adapters are the integration points between Agent Assembly and a third-party
agent framework (LangChain, OpenAI Agents, Vercel AI SDK, etc.). Each adapter implements
the `Adapter` interface in `src/adapters/adapter.ts`:

```ts
export interface Adapter {
  readonly id: string;
  apply: () => Promise<void>;
  shutdown?: () => Promise<void>;
}
```

To add a new adapter for `<framework>`:

1. **Create a new directory** under `src/adapters/<framework>/` for the integration's
   surface area (callback handlers, wrappers, type bridges).
2. **Implement the `Adapter` interface** — `apply()` performs framework-specific
   registration; `shutdown()` (optional) cleans up subscriptions or globals.
3. **Register the adapter** with the `AdapterRegistry` from `init-assembly.ts`. The
   registry is constructed during `initAssembly()` and `applyAll()` is invoked on every
   registered adapter.
4. **Add types** — public types belong in `src/types/`; framework-private types stay
   inside the adapter directory.
5. **Write tests** under `tests/adapters/<framework>/` covering both the wrapper layer
   (pre-execution checks) and any callback layer (post-execution redaction).

Refer to `src/adapters/langchain/` for a reference implementation that demonstrates the
two-layer enforcement model required when a framework's hook surface cannot preempt
execution.
