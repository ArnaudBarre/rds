export const log: {
  debug: (message: string) => void;
  info: (message: string) => void;
} = {
  debug: process.argv.includes("--debug") ? console.log : () => undefined,
  info: console.log,
};
