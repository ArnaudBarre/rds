import { HMRPayload } from "../hmrPayload";
import { mimeTypes } from "./mimeTypes";

export type LoadedFile = {
  content: string | Buffer;
  type: keyof typeof mimeTypes;
  browserCache: boolean;
};

export type HMRWebSocket = { send(payload: HMRPayload): void; close(): void };

export type GraphNode = {
  url: string;
  selfUpdate: boolean;
  imports: string[];
  importers: Set<GraphNode>;
};
export type Graph = Map<string, GraphNode>;
