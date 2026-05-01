export interface VercelAiToolExecutionOptions {
  toolCallId?: string;
  messages?: readonly unknown[];
  abortSignal?: AbortSignal;
}

export interface VercelAiToolDefinition<TArgs = unknown, TResult = unknown> {
  description?: string;
  parameters?: unknown;
  execute?: (args: TArgs, options: VercelAiToolExecutionOptions) => Promise<TResult>;
}

export type VercelAiToolFactory = <TArgs, TResult>(
  definition: VercelAiToolDefinition<TArgs, TResult>
) => VercelAiToolDefinition<TArgs, TResult>;
