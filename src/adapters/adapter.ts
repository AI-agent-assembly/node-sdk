export interface Adapter {
  readonly id: string;
  apply: () => Promise<void>;
  shutdown?: () => Promise<void>;
}
