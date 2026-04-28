export interface GatewayCheckRequest {
  action: "tool_call" | "llm_start" | "llm_end" | "other";
  toolName?: string;
  args?: unknown;
  runId: string;
}

export interface GatewayDecision {
  denied?: boolean;
  pending?: boolean;
  reason?: string;
}

export interface GatewayApprovalResult {
  denied?: boolean;
  reason?: string;
}

export interface GatewayRecordEvent {
  action: string;
  runId: string;
  reason?: string;
  output?: unknown;
}

export interface GatewayPromptScan {
  prompts: readonly string[];
  runId: string;
  modelName?: string;
}

export interface GatewayResultRecord {
  runId: string;
  output: unknown;
}
