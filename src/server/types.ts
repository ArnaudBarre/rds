import type { Session } from "node:inspector";
import type { Extension } from "./mimeTypes.ts";

export type LoadedFile = {
  content: string | Buffer;
  type: Extension;
  browserCache: boolean;
};

export type GraphNode = {
  url: string;
  selfUpdate: boolean;
  srcAndCSSImports: string[];
  srcImports: string[];
  importers: Set<GraphNode>;
};
export type Graph = Map<string, GraphNode>;

declare global {
  /* eslint-disable no-var */
  var __rds_start: number;
  var __rds_profile_session: Session | undefined;
  /* eslint-enable no-var */
}
