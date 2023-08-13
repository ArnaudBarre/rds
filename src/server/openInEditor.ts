import { execSync, spawn } from "node:child_process";
import { resolve } from "node:path";

const positionRE = /:(\d+)(:(\d+))?$/;

let useVSCode: boolean | undefined;

export const openInEditor = (file: string) => {
  if (useVSCode === undefined) {
    useVSCode = execSync("ps x -o comm=", {
      stdio: ["pipe", "pipe", "ignore"],
    })
      .toString()
      .includes("Visual Studio Code.app");
  }
  const match = file.match(positionRE);
  const filename = resolve(file.replace(positionRE, ""));
  const lineNumber = match?.[1] ?? 1;
  const columnNumber = match?.[3] ?? 1;
  spawn(
    useVSCode ? "code" : "idea",
    useVSCode
      ? ["-r", "-g", `${filename}:${lineNumber}:${columnNumber}`]
      : [
          "--line",
          `${lineNumber}`,
          // Doesn't work on Apple Silicon builds :/
          // "--column",
          // `${columnNumber}`,
          filename,
        ],
    { stdio: "inherit" },
  );
};
