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
