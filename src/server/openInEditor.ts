import { spawn } from "child_process";
import { resolve } from "path";

const positionRE = /:(\d+)(:(\d+))?$/;

export const openInEditor = (file: string) => {
  const match = file.match(positionRE);
  const args = [resolve(file.replace(positionRE, ""))];
  if (match?.[3]) args.unshift("--column", match[3]);
  if (match?.[1]) args.unshift("--line", match[1]);
  spawn("idea", args, { stdio: "inherit" });
};
