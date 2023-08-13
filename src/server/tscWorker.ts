import { relative } from "node:path";
import ts from "typescript";

ts.createWatchProgram(
  ts.createWatchCompilerHost(
    "tsconfig.json",
    undefined,
    ts.sys,
    undefined,
    (log) => {
      const message =
        typeof log.messageText === "string"
          ? log.messageText
          : log.messageText.messageText;
      if (log.file) {
        const position = log.file.getLineAndCharacterOfPosition(log.start!);
        const name = relative("", log.file.fileName);
        const line = position.line + 1;
        const char = position.character + 1;
        console.log(`${name}:${line}:${char} ${message}`);
      } else {
        console.log(message);
      }
    },
    () => undefined, // Don't report file watcher status (Starting incremental, Watching for file changes, ...)
  ),
);
