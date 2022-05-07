import { RDSErrorPayload } from "../hmrPayload";

export const isRDSError = (v: any): v is RDSErrorPayload =>
  typeof v === "object" && v.rds === true;

export const RDSError = (props: Omit<RDSErrorPayload, "rds">) => ({
  rds: true,
  ...props,
});

export const codeToFrame = (code: string, line: number) =>
  `  |\n${line} | ${code}\n  |`;
