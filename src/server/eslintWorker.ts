import { writeFileSync } from "node:fs";
import { parentPort, workerData } from "node:worker_threads";
import chalk from "chalk"; // chalk is used by eslint
import { ESLint } from "eslint";

const eslint = new ESLint(workerData);

parentPort!.on("message", (path: string) => {
  eslint
    .isPathIgnored(path)
    .then(async (ignored) => {
      if (ignored) return;
      const [report] = await eslint.lintFiles(path);
      if (report.output !== undefined) writeFileSync(path, report.output);
      if (report.messages.length === 0) return;
      for (const m of report.messages) {
        const prettyPath = path.slice(path.indexOf("/src/") + 1);
        const location = `${prettyPath}(${m.line},${m.column})`;
        const rule = m.ruleId ? ` ${m.ruleId}` : "";
        console.log(
          `${location}: ${(m.severity === 2 ? chalk.red : chalk.yellow)(
            m.message,
          )}${rule}`,
        );
      }
    })
    .catch((e) => {
      if (e.messageTemplate === "file-not-found" && e.messageData?.pattern) {
        // Can happen when the file is deleted or moved
        console.log(
          `${chalk.yellow("[eslint] File not found")} ${chalk.dim(
            e.messageData.pattern,
          )}`,
        );
      } else {
        // Otherwise, log the full error
        console.error(e);
      }
    });
});
