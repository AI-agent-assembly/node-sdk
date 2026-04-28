import { createRequire } from "node:module";
import type { InitAssemblyOptions } from "../types/policy.js";

export interface PolicyResult {
  denied?: boolean;
  pending?: boolean;
  reason?: string;
}

interface NativeBinding {
  connect: (socketPath: string) => Promise<object>;
  sendEvent: (handle: object, event: unknown) => void;
  queryPolicy: (handle: object, action: unknown) => Promise<PolicyResult>;
  disconnect: (handle: object) => Promise<void>;
}

const ERROR_CONNECT = "AA_ERR_CONNECT";
const ERROR_SEND_EVENT = "AA_ERR_SEND_EVENT";
const ERROR_QUERY_POLICY = "AA_ERR_QUERY_POLICY";
const ERROR_DISCONNECT = "AA_ERR_DISCONNECT";

export class NativeConnectError extends Error {
  readonly code = ERROR_CONNECT;
}

export class NativeSendEventError extends Error {
  readonly code = ERROR_SEND_EVENT;
}

export class NativeQueryPolicyError extends Error {
  readonly code = ERROR_QUERY_POLICY;
}

export class NativeDisconnectError extends Error {
  readonly code = ERROR_DISCONNECT;
}

export interface NativeClient {
  readonly mode: "grpc-sidecar" | "napi-inprocess";
  close: () => Promise<void>;
  sendEvent: (event: unknown) => void;
  queryPolicy: (action: unknown) => Promise<PolicyResult>;
}

function mapNativeError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(String(error));
  }

  const [code, ...rest] = error.message.split(":");
  const detail = rest.join(":").trim() || error.message;

  if (code === ERROR_CONNECT) {
    return new NativeConnectError(detail);
  }
  if (code === ERROR_SEND_EVENT) {
    return new NativeSendEventError(detail);
  }
  if (code === ERROR_QUERY_POLICY) {
    return new NativeQueryPolicyError(detail);
  }
  if (code === ERROR_DISCONNECT) {
    return new NativeDisconnectError(detail);
  }

  return error;
}

function loadNativeBinding(): NativeBinding {
  const requireFromHere = createRequire(import.meta.url);
  const candidates = [
    "../../native/aa-ffi-node/index.cjs",
    "../../../native/aa-ffi-node/index.cjs",
    `${process.cwd()}/native/aa-ffi-node/index.cjs`
  ];

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return requireFromHere(candidate) as NativeBinding;
    } catch (error) {
      lastError = error;
    }
  }

  throw new NativeConnectError(
    `Failed to load native binding from known paths: ${String(lastError)}`
  );
}

export function createNativeClient(options: InitAssemblyOptions): NativeClient {
  const mode = options.mode ?? "grpc-sidecar";

  if (mode !== "napi-inprocess") {
    return {
      mode,
      close: async () => undefined,
      sendEvent: () => undefined,
      queryPolicy: async () => ({ denied: false, pending: false })
    };
  }

  const binding = loadNativeBinding();
  const socketPath = options.gateway;

  let handlePromise: Promise<object> | undefined;

  const getHandle = async (): Promise<object> => {
    if (!handlePromise) {
      handlePromise = binding.connect(socketPath).catch((error: unknown) => {
        handlePromise = undefined;
        throw mapNativeError(error);
      });
    }
    return handlePromise;
  };

  return {
    mode,
    close: async () => {
      if (!handlePromise) {
        return;
      }

      const handle = await getHandle();
      await binding.disconnect(handle).catch((error: unknown) => {
        throw mapNativeError(error);
      });
      handlePromise = undefined;
    },
    sendEvent: (event: unknown) => {
      void getHandle()
        .then((handle) => {
          binding.sendEvent(handle, event);
        })
        .catch((error: unknown) => {
          throw mapNativeError(error);
        });
    },
    queryPolicy: async (action: unknown) => {
      const handle = await getHandle();
      return binding.queryPolicy(handle, action).catch((error: unknown) => {
        throw mapNativeError(error);
      });
    }
  };
}
