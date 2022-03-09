import { promises as fs } from "fs";
import { ESLint } from "eslint";
import { Chalk } from "chalk"; // chalk is used by eslint
const chalk = require("chalk") as Chalk; // Hack to avoid esbuild boilerplate

const { workerData, parentPort } = require("worker_threads");
const eslint = new ESLint(workerData);

parentPort.on("message", (path: string) => {
  eslint
    .isPathIgnored(path)
    .then(async (ignored) => {
      if (ignored) return;
      const [report] = await eslint.lintFiles(path);
      if (report.output !== undefined) await fs.writeFile(path, report.output);
      if (report.messages.length === 0) return;
      report.messages.forEach((m) => {
        const prettyPath = path.slice(path.indexOf("/src/") + 1);
        const location = `${prettyPath}(${m.line},${m.column})`;
        const rule = m.ruleId ? ` ${m.ruleId}` : "";
        console.log(
          `${location}: ${chalk[m.severity === 2 ? "red" : "yellow"](
            m.message,
          )}${rule}`,
        );
      });
    })
    .catch((e) => {
      if (e.messageTemplate === "file-not-found" && e.messageData?.pattern) {
        // Can happen when the file is deleted or moved
        console.log(
          `${chalk.yellow(`[eslint] File not found`)} ${chalk.dim(
            e.messageData.pattern,
          )}`,
        );
      } else {
        // Otherwise, log the full error
        console.error(e);
      }
    });
});
