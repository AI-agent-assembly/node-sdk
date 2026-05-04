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
