import { RDSErrorPayload } from "../hmr";

export class RDSError extends Error {
  payload: RDSErrorPayload;

  constructor(payload: RDSErrorPayload) {
    super(payload.message);
    this.name = this.constructor.name;
    this.payload = payload;
  }
}

export const codeToFrame = (code: string, line: number | null) => {
  const length = Math.trunc(Math.log10(line ?? 1)) + 1;
  const padding = " ".repeat(length + 1);
  return `${padding}|\n${line ?? "?"} | ${code}\n${padding}|`;
};
