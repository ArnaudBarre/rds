import { execSync, spawn } from "node:child_process";
import { resolve } from "node:path";

const positionRE = /:(\d+)(:(\d+))?$/;

let editor: "code" | "cursor" | "idea" | undefined;

export const openInEditor = (file: string) => {
  if (editor === undefined) {
    try {
      const processes = execSync("ps x -o comm=", {
        stdio: ["pipe", "pipe", "ignore"],
      }).toString();
      editor =
        processes.includes("Cursor.app") || processes.includes("\ncursor")
          ? "cursor"
          : processes.includes("Visual Studio Code.app") ||
            processes.includes("\ncode")
          ? "code"
          : "idea";
    } catch (e) {
      console.log(e);
    }
  }
  const match = file.match(positionRE);
  const filename = resolve(file.replace(positionRE, ""));
  const lineNumber = match?.[1] ?? 1;
  const columnNumber = match?.[3] ?? 1;
  try {
    spawn(
      editor ?? "cursor",
      editor !== "idea"
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
  } catch (e) {
    console.log(e);
  }
};
