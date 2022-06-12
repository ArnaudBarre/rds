import { spawn } from "child_process";
import { resolve } from "path";

const positionRE = /:(\d+)(:\d+)?$/;

export const openInEditor = (file: string) => {
  const match = file.match(positionRE);
  const args = match
    ? ["--line", match[1], resolve(file.replace(positionRE, ""))]
    : [resolve(file)];
  spawn("idea", args, { stdio: "inherit" });
};
