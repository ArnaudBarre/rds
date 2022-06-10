import { BuildResult, formatMessagesSync } from "esbuild";
import { useColors, colors } from "./colors";
import { run } from "./utils";
import { RDSErrorPayload } from "../hmrPayload";

export const isDebug = process.argv.includes("--debug");

let editingLineId: string | undefined;

const ensureNewLine = () => {
  if (editingLineId) logger.endLine(editingLineId, "");
};

export const logger: {
  debug: (message: string) => void;
  info: (message: string) => void;
  startLine: (id: string, message: string) => void;
  updateLine: (id: string, message: string) => void;
  endLine: (id: string, message: string) => void;
  warn: (message: string) => void;
  rdsError: (error: RDSErrorPayload) => void;
  esbuildResult: (result: BuildResult) => void;
} = {
  debug: isDebug
    ? run(() => {
        ensureNewLine();
        const nextArg = process.argv[process.argv.indexOf("--debug") + 1];
        if (!nextArg || nextArg.startsWith("-")) return console.log;
        return (message) => message.startsWith(nextArg) && console.log(message);
      })
    : () => undefined,
  info: (message) => {
    ensureNewLine();
    console.log(message);
  },
  startLine: (id, message) => {
    editingLineId = id;
    process.stdout.write(message);
  },
  updateLine: (id, message) => {
    if (id === editingLineId) {
      process.stdout.write(message);
    } else {
      logger.info(message);
    }
  },
  endLine: (id, message) => {
    if (id === editingLineId) {
      process.stdout.write(`${message}\n`);
      editingLineId = undefined;
    } else {
      logger.info(message);
    }
  },
  warn: (message) => {
    ensureNewLine();
    console.log(colors.yellow(message));
  },
  rdsError: (error) => {
    ensureNewLine();
    console.log(
      // eslint-disable-next-line prefer-template
      colors.cyan(error.file.includes(":") ? error.file : `${error.file}:1:1`) +
        " " +
        colors.red(error.message),
    );
    if (error.frame) console.log(colors.yellow(error.frame));
  },
  esbuildResult: ({ errors, warnings }) => {
    ensureNewLine();
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
