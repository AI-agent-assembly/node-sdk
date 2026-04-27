# @agent-assembly/sdk
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=AI-agent-assembly_node-sdk&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=AI-agent-assembly_node-sdk)
[![codecov](https://codecov.io/gh/AI-agent-assembly/node-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/AI-agent-assembly/node-sdk)

TypeScript/Node.js SDK for Agent Assembly, licensed under Apache 2.0.

## Goal

Provide a thin wrapper around the Agent Assembly Rust runtime through:

- gRPC sidecar client (default)
- native in-process binding (napi-rs)

The primary entrypoint is `initAssembly()`, which prepares runtime governance and
registers framework hooks for supported tool ecosystems.

## Public Entrypoints

- `initAssembly(config)`
- `withAssembly(tools, options)`

## Policy Matching Constraint

Vercel AI SDK tools do not expose a `.name` field. Governance policies must match
by tool description content (or tool map key in wrapper context), not by strict
framework-level tool name.

## Current Architecture Layout

```text
src/
  index.ts
  core/
    init-assembly.ts
  adapters/
    adapter.ts
    adapter-registry.ts
  gateway/
    client.ts
  wrappers/
    with-assembly.ts
  errors/
    policy-violation-error.ts
  types/
    assembly-mode.ts
    assembly-config.ts
    assembly-context.ts
    tool-map.ts
tests/
  architecture/
.github/workflows/
```
