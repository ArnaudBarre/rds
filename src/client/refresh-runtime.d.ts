export const RefreshRuntime: {
  enqueueUpdate: () => void;
  getRefreshReg: (filename: string) => void;
  injectIntoGlobalHook: (window: Window) => void;
  createSignatureFunctionForTransform: () => void;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    $RefreshReg$: () => void;
    $RefreshSig$: () => (type: string) => string;
  }
}
