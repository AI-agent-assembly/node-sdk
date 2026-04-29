declare module "blocked-at" {
  export interface BlockedAtOptions {
    threshold?: number;
    trimFalsePositives?: boolean;
    resourcesCap?: number;
    debug?: boolean;
  }

  export interface BlockedAtController {
    stop: () => void;
  }

  const blockedAt: (
    onBlocked: (time: number, stack: string[]) => void,
    options?: BlockedAtOptions
  ) => BlockedAtController;

  export default blockedAt;
}
