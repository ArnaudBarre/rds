import { RDSErrorPayload } from "../hmrPayload";

const rdsErrorSymbol = Symbol("RDS error");

export const isRDSError = (v: any): v is RDSErrorPayload =>
  typeof v === "object" && v.rds === rdsErrorSymbol;

export const RDSError = (props: Omit<RDSErrorPayload, "rds">) => ({
  rds: rdsErrorSymbol,
  ...props,
});

export const codeToFrame = (code: string, line: number | null) =>
  `  |\n${line ?? "?"} | ${code}\n  |`;
