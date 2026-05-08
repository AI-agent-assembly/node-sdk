import { createRequire } from "node:module";
import type { Adapter } from "../adapters/adapter.js";
import {
  AssemblyCallbackHandler,
  wrapToolWithAssembly,
  type WrapToolWithAssemblyOptions
} from "../adapters/langchain/index.js";
import { createNoopGatewayClient, type GatewayClient } from "../gateway/client.js";
import { createNativeClient, type NativeClient } from "../native/client.js";
import type { AssemblyConfig } from "../types/assembly-config.js";
import type { AssemblyContext } from "../types/assembly-context.js";
import type {
  LangChainCallbackHandlerLike,
  LangChainToolLike
} from "../types/langchain-adapter.js";
import { hasVercelAiSdk } from "../hooks/ai-sdk-detection.js";
import { patchVercelAiSdk } from "../hooks/ai-sdk.js";
import { hasOpenAIAgentsSDK } from "../hooks/openai-agents-detection.js";
import { patchOpenAIAgents } from "../hooks/openai-agents.js";

const requireFromCwd = createRequire(`${process.cwd()}/`);

function buildRegistrationEvent(config: AssemblyConfig): Record<string, string> {
  const event: Record<string, string> = { event_type: "register" };
  if (config.parentAgentId !== undefined) event.parent_agent_id = config.parentAgentId;
  if (config.teamId !== undefined) event.team_id = config.teamId;
  if (config.delegationReason !== undefined) event.delegation_reason = config.delegationReason;
  if (config.spawnedByTool !== undefined) event.spawned_by_tool = config.spawnedByTool;
  return event;
}

export function createClient(config: AssemblyConfig): GatewayClient {
  const mode = config.mode ?? "auto";
  if (config.gatewayClient) {
    return config.gatewayClient;
  }

  return createNoopGatewayClient(mode);
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
  if (hasVercelAiSdk()) {
    detected.push("vercel-ai-sdk");
  }
  if (hasOpenAIAgentsSDK()) {
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

function ensureLangChainCallbacks(config: AssemblyConfig): LangChainCallbackHandlerLike[] {
  config.langchain ??= {};
  config.langchain.callbacks ??= [];

  return config.langchain.callbacks;
}

function ensureLangChainTools(config: AssemblyConfig): Record<string, LangChainToolLike> {
  config.langchain ??= {};
  config.langchain.tools ??= {};

  return config.langchain.tools;
}

function registerLangChainHandler(
  config: AssemblyConfig,
  client: GatewayClient,
  frameworks: readonly string[]
): AssemblyCallbackHandler | undefined {
  if (!frameworks.includes("langchain-js") && !config.langchain) {
    return undefined;
  }

  const callbacks = ensureLangChainCallbacks(config);
  const handler = new AssemblyCallbackHandler(client);
  callbacks.push(handler);
  return handler;
}

function wrapLangChainTools(
  config: AssemblyConfig,
  client: GatewayClient,
  frameworks: readonly string[]
): string[] {
  if (!frameworks.includes("langchain-js") && !config.langchain) {
    return [];
  }

  const tools = ensureLangChainTools(config);
  const wrapperOptions: WrapToolWithAssemblyOptions = {
    ...(config.langchain?.approvalTimeoutMs
      ? { approvalTimeoutMs: config.langchain.approvalTimeoutMs }
      : {})
  };

  for (const tool of Object.values(tools)) {
    wrapToolWithAssembly(tool, client, wrapperOptions);
  }

  return Object.keys(tools);
}

async function patchDetectedVercelAiSdk(
  client: GatewayClient,
  frameworks: readonly string[]
): Promise<boolean> {
  if (!frameworks.includes("vercel-ai-sdk")) {
    return false;
  }

  return patchVercelAiSdk({ gatewayClient: client });
}

async function patchDetectedOpenAIAgents(
  client: GatewayClient,
  frameworks: readonly string[]
): Promise<boolean> {
  if (!frameworks.includes("openai-agents")) {
    return false;
  }

  return patchOpenAIAgents({ gatewayClient: client });
}

export async function initAssembly(config: AssemblyConfig): Promise<AssemblyContext> {
  if (config.delegationReason !== undefined && config.delegationReason.length > 256) {
    throw new RangeError("delegationReason must be <= 256 characters");
  }
  const client = createClient(config);
  const frameworks = detectFrameworks();
  const adapters = await registerAdapters(frameworks);

  await startNetworkLayerIfNeeded(client, config);

  // Send topology registration event through the native transport on every boot
  // except sdk-only mode (which has no sidecar to register with).
  let nativeClient: NativeClient | undefined;
  if (config.mode !== "sdk-only") {
    nativeClient = createNativeClient({
      gateway: config.gatewayUrl,
      apiKey: config.apiKey,
      mode: config.mode === "napi-inprocess" ? "napi-inprocess" : "grpc-sidecar",
    });
    nativeClient.sendEvent(buildRegistrationEvent(config));
  }

  const langChainHandler = registerLangChainHandler(config, client, frameworks);
  const wrappedLangChainTools = wrapLangChainTools(config, client, frameworks);
  const vercelAiSdkPatched = await patchDetectedVercelAiSdk(client, frameworks);
  const openAIAgentsPatched = await patchDetectedOpenAIAgents(client, frameworks);

  return {
    activeAdapters: [
      ...new Set([
        ...adapters.map((adapter) => adapter.id),
        ...(langChainHandler ? ["langchain-js"] : []),
        ...(wrappedLangChainTools.length > 0 ? ["langchain-js"] : []),
        ...(vercelAiSdkPatched ? ["vercel-ai-sdk"] : []),
        ...(openAIAgentsPatched ? ["openai-agents"] : [])
      ])
    ],
    ...(config.parentAgentId !== undefined && { parentAgentId: config.parentAgentId }),
    ...(config.teamId !== undefined && { teamId: config.teamId }),
    ...(config.delegationReason !== undefined && { delegationReason: config.delegationReason }),
    ...(config.spawnedByTool !== undefined && { spawnedByTool: config.spawnedByTool }),
    shutdown: async () => {
      for (const adapter of adapters) {
        await adapter.shutdown?.();
      }
      await nativeClient?.close();
      await client.close();
    }
  };
}
