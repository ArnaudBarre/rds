import { mimeTypes } from "./mimeTypes";

export type LoadedFile = {
  content: string | Buffer;
  type: keyof typeof mimeTypes;
  browserCache: boolean;
};

export type GraphNode = {
  url: string;
  selfUpdate: boolean;
  imports: [value: string, placeholder: string][];
  importers: Set<GraphNode>;
};
export type Graph = Map<string, GraphNode>;

export type CSSModule = false | { [key: string]: string };
