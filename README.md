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

## LangChain Blocking Model

LangChain callback `handleToolStart` cannot preempt execution by return value, so
this SDK applies a two-layer model:

- callback layer (`AssemblyCallbackHandler`) tracks deferred denials and redacts at `handleToolEnd`
- wrapper layer (`wrapToolWithAssembly`) enforces true pre-execution deny/pending checks

`initAssembly()` auto-registers the callback handler and auto-wraps configured
LangChain tools.

## Current Architecture Layout

```text
src/
  index.ts
  core/
    init-assembly.ts
  adapters/
    adapter.ts
    adapter-registry.ts
    langchain/
      assembly-callback-handler.ts
      wrap-tool-with-assembly.ts
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
    gateway-governance.ts
    langchain-adapter.ts
    tool-map.ts
tests/
  architecture/
.github/workflows/
```

## Native napi-rs Binding (AAASM-60)

The `aa-ffi-node` Rust crate is located at `native/aa-ffi-node`.

Build commands:

- `pnpm native:build` (debug/local)
- `pnpm native:build:release` (release + platform artifact)
- `pnpm native:check-types` (strict check for generated napi `.d.ts`)

Native integration acceptance test:

- `AA_NATIVE_TEST=1 pnpm vitest run tests/native-napi-integration.test.ts`

The `build-addon` GitHub workflow produces prebuilt `index.node` artifacts
for Node 18/20/22 on Linux/macOS/Windows.

## Packaging Layout (AAASM-61)

The package now publishes dual module outputs with explicit conditional exports:

- ESM entry: `./dist/esm/index.js`
- CJS entry: `./dist/cjs/index.js`
- Type declarations: `./dist/types/index.d.ts`

Platform-native binaries are declared via `optionalDependencies` and selected
during `postinstall` based on `process.platform` and `process.arch`.

Package verification checks include:

- ESM and CJS entry smoke tests
- export `types` mapping assertion
- `npm pack` content and package size guard tests
