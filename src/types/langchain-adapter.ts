export interface LangChainRunConfig {
  runId?: string;
  [key: string]: unknown;
}

export interface LangChainToolLike<TInput = unknown, TOutput = unknown> {
  name: string;
  invoke: (input: TInput, config?: LangChainRunConfig) => Promise<TOutput>;
}

export interface LangChainCallbackHandlerLike {
  name: string;
  handleToolStart?: (
    tool: { name?: string },
    input: unknown,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    runName?: string
  ) => Promise<void>;
  handleToolEnd?: (
    output: unknown,
    runId: string,
    parentRunId?: string,
    tags?: string[]
  ) => Promise<unknown>;
  handleLLMStart?: (
    llm: { name?: string },
    prompts: string[],
    runId: string,
    parentRunId?: string,
    extraParams?: Record<string, unknown>,
    tags?: string[],
    metadata?: Record<string, unknown>,
    runName?: string
  ) => Promise<void>;
  handleLLMEnd?: (
    output: unknown,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    extraParams?: Record<string, unknown>
  ) => Promise<void>;
}

export interface LangChainAdapterConfig {
  tools?: Record<string, LangChainToolLike>;
  callbacks?: LangChainCallbackHandlerLike[];
  approvalTimeoutMs?: number;
}
