import { Extension } from "./mimeTypes";
import { Session } from "inspector";

export type LoadedFile = {
  content: string | Buffer;
  type: Extension;
  browserCache: boolean;
} | null;

export type GraphNode = {
  url: string;
  selfUpdate: boolean;
  imports: [value: string, placeholder: string][];
  importers: Set<GraphNode>;
};
export type Graph = Map<string, GraphNode>;

export type CSSModule = false | { [key: string]: string };

declare global {
  // eslint-disable-next-line no-var
  var __rds_start: number;
  var __rds_profile_session: Session | undefined;
}
