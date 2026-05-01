import type { VercelAiToolFactory } from "../types/vercel-ai-adapter.js";

export interface VercelAiSdkModule {
  tool: VercelAiToolFactory;
}

export interface VercelAiSdkPatchState {
  isPatched: boolean;
  originalToolFactory: VercelAiToolFactory | undefined;
  patchedModule: VercelAiSdkModule | undefined;
}

export const vercelAiSdkPatchState: VercelAiSdkPatchState = {
  isPatched: false,
  originalToolFactory: undefined,
  patchedModule: undefined
};

export function captureOriginalToolFactory(
  module: VercelAiSdkModule
): VercelAiToolFactory | undefined {
  const candidate = module.tool;
  if (typeof candidate !== "function") {
    return undefined;
  }

  if (!vercelAiSdkPatchState.originalToolFactory) {
    vercelAiSdkPatchState.originalToolFactory = candidate;
  }

  return vercelAiSdkPatchState.originalToolFactory;
}
