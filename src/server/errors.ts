import { RDSErrorPayload } from "../hmrPayload";

export class RDSError extends Error {
  payload: RDSErrorPayload;

  constructor(payload: RDSErrorPayload) {
    super(payload.message);
    this.name = this.constructor.name;
    this.payload = payload;
  }
}

export const codeToFrame = (code: string, line: number | null) =>
  `  |\n${line ?? "?"} | ${code}\n  |`;
