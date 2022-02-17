export const isDebug = process.argv.includes("--debug");

export const log: {
  debug: (message: string) => void;
  info: (message: string) => void;
} = {
  debug: isDebug ? console.log : () => undefined,
  info: console.log,
};
