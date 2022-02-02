import { HMRPayload } from "../hmrPayload";
import { mimeTypes } from "./mimeTypes";

export type LoadedFile = { content: string; type: keyof typeof mimeTypes };
export type HMRWebSocket = { send(payload: HMRPayload): void; close(): void };
