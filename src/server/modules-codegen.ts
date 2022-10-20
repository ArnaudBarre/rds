import { execSync } from "child_process";
import { CSSModuleExports, transform } from "lightningcss";
import { readFile } from "./utils";
import { writeFileSync } from "fs";

export const modulesCodegen = () => {
  const filenames = new Set<string>();
  const paths = execSync("find src | grep --color=never .module.css", {
    shell: "/bin/bash",
  })
    .toString()
    .trim()
    .split("\n");

  let output = "";
  for (const path of paths) {
    const filename = path.split("/").pop()!;
    if (filenames.has(filename)) {
      // Using relative imports + absolute module declaration doesn't work
      // So we need to use `*/name` and unsure names are unique
      throw new Error(
        `A CSS module named ${filename} already exist. Due to a limitation of import types in .d.ts files, filenames need to ne unique across the project`,
      );
    }
    filenames.add(filename);
    const classes = Object.keys(
      transform({
        cssModules: true,
        drafts: { nesting: true },
        filename: path,
        code: Buffer.from(
          readFile(path).replace(/@apply [^;}\n]+/g, "color: black"),
        ),
      }).exports as CSSModuleExports,
    );
    output += `declare module "*/${filename}" {
  const classes: { ${classes.map((c) => `${c}: string`).join(", ")} };
  export default classes
}\n`;
  }

  writeFileSync("src/generated/css-modules.d.ts", output);
};
