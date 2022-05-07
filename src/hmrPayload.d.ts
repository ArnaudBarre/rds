export type HMRPayload =
  | { type: "connected" }
  | { type: "update"; paths: string[] }
  | { type: "prune-css"; paths: string[] }
  | { type: "reload" }
  | { type: "error"; error: RDSErrorPayload };

export type RDSErrorPayload = {
  rds: true;
  message: string;
  file: string;
  frame: string;
};
