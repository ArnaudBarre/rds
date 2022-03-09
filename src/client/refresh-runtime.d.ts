export const enqueueUpdate: () => void;
export const getRefreshReg: (filename: string) => void;
export const injectIntoGlobalHook: (window: Window) => void;
export const createSignatureFunctionForTransform: () => void;

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    $RefreshReg$: () => void;
    $RefreshSig$: () => (type: string) => string;
  }
}
