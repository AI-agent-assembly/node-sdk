import { createRequire } from "node:module";
import type { Adapter } from "../adapters/adapter.js";
import type { GatewayClient } from "../gateway/client.js";
import type { AssemblyConfig } from "../types/assembly-config.js";

const requireFromCwd = createRequire(`${process.cwd()}/`);

export function createClient(config: AssemblyConfig): GatewayClient {
  const mode = config.mode ?? "auto";

  return {
    mode,
    start: async () => undefined,
    close: async () => undefined
  };
}

function isPackageInstalled(packageName: string): boolean {
  try {
    requireFromCwd.resolve(packageName);
    return true;
  } catch {
    return false;
  }
}

export function detectFrameworks(): string[] {
  const detected: string[] = [];

  if (isPackageInstalled("@langchain/core")) {
    detected.push("langchain-js");
  }
  if (isPackageInstalled("ai")) {
    detected.push("vercel-ai-sdk");
  }
  if (isPackageInstalled("@openai/agents")) {
    detected.push("openai-agents");
  }

  return detected;
}

function createAdapter(id: string): Adapter {
  return {
    id,
    apply: async () => undefined
  };
}

export async function registerAdapters(frameworks: readonly string[]): Promise<Adapter[]> {
  const adapters = frameworks.map((framework) => createAdapter(framework));
  for (const adapter of adapters) {
    await adapter.apply();
  }
  return adapters;
}

export async function startNetworkLayerIfNeeded(
  client: GatewayClient,
  config: AssemblyConfig
): Promise<void> {
  if (config.mode === "sdk-only") {
    return;
  }

  await client.start();
}
