import { BuildResult, formatMessagesSync } from "esbuild";
import { useColors, colors } from "./colors";
import { run } from "./utils";

export const isDebug = process.argv.includes("--debug");

export const logger: {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  esbuildResult: (result: BuildResult) => void;
} = {
  debug: isDebug
    ? run(() => {
        const nextArg = process.argv[process.argv.indexOf("--debug") + 1];
        if (!nextArg || nextArg.startsWith("-")) return console.log;
        return (message) => message.startsWith(nextArg) && console.log(message);
      })
    : () => undefined,
  info: console.log,
  warn: (m) => console.log(colors.yellow(m)),
  esbuildResult: ({ errors, warnings }) => {
    if (errors.length) {
      console.log(
        formatMessagesSync(errors, { kind: "error", color: useColors }).join(
          "\n",
        ),
      );
    } else if (warnings.length) {
      console.log(
        formatMessagesSync(warnings, {
          kind: "warning",
          color: useColors,
        }).join("\n"),
      );
    }
  },
};
