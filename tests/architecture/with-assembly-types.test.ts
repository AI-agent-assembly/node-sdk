import { describe, expect, it } from "vitest";
import { createNoopGatewayClient } from "../../src/gateway/client.js";
import { withAssembly } from "../../src/wrappers/with-assembly.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

describe("withAssembly", () => {
  it("preserves the exact tool map type", () => {
    const tools = {
      searchWeb: {
        description: "Search the web",
        execute: async (args: { query: string }) => `result:${args.query}`
      },
      sendEmail: {
        description: "Send an email",
        execute: async (args: { to: string; body: string }) => `${args.to}:${args.body}`
      }
    };

    const wrapped = withAssembly(tools, {
      gatewayClient: createNoopGatewayClient("sdk-only"),
      agentId: "agent-1"
    });

    type _ExactTypePreserved = Expect<Equal<typeof wrapped, typeof tools>>;
    const _typeAssertion: _ExactTypePreserved = true;

    expect(_typeAssertion).toBe(true);
    expect(wrapped).toBe(tools);
  });
});
