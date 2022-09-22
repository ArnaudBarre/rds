import { BuildResult } from "esbuild";
import { logEsbuildErrors } from "@arnaud-barre/config-loader";

import { RDSErrorPayload } from "../hmr";
import { colors } from "./colors";
import { run } from "./utils";

export const isDebug = process.argv.includes("--debug");

export const debugNow = () => (isDebug ? performance.now() : 0);

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
        const nextArg = process.argv[process.argv.indexOf("--debug") + 1];
        if (!nextArg || nextArg.startsWith("-")) {
          return (message) => {
            ensureNewLine();
            console.log(message);
          };
        }
        return (message) => {
          if (message.startsWith(nextArg)) {
            ensureNewLine();
            console.log(message);
          }
        };
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
  esbuildResult: (buildResult) => {
    ensureNewLine();
    logEsbuildErrors(buildResult);
  },
};
