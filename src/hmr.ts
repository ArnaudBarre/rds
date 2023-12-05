export const HMR_HEADER = "rds-hmr";

export type HMRPayload =
  | { type: "connected" }
  | { type: "update"; paths: string[] }
  | { type: "css-list-update"; paths: string[] }
  | { type: "reload" }
  | { type: "error"; error: RDSErrorPayload };

export type RDSErrorPayload = {
  message: string;
  file: string;
  frame?: string;
};
