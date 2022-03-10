import { Extension } from "./mimeTypes";

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
