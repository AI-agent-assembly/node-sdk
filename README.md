# @agent-assembly/sdk

TypeScript/Node.js SDK for Agent Assembly, licensed under Apache 2.0.

## Goal

Provide a thin wrapper around the Agent Assembly Rust runtime through:

- gRPC sidecar client (default)
- native in-process binding (napi-rs)

The primary entrypoint is `initAssembly()`, which prepares runtime governance and
registers framework hooks for supported tool ecosystems.

## Planned Source Layout

```text
src/
  index.ts
  native/
  hooks/
  types/
tests/
.github/workflows/
```
