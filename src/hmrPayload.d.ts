export type HMRPayload =
  | { type: "connected" }
  | { type: "update"; paths: string[] }
  | { type: "prune"; paths: string[] }
  | { type: "reload" }
  | { type: "error"; error: HMRError };

export type HMRError = {
  [name: string]: any;
  message: string;
  stack: string;
  id?: string;
  frame?: string;
  plugin?: string;
  pluginCode?: string;
  loc?: { file?: string; line: number; column: number };
};
