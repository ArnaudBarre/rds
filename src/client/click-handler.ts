import { openInEditor } from "./open-in-editor";

/** Headless version of https://github.com/ericclemmons/click-to-component */

let altKey = false;

window.addEventListener("keydown", (event) => {
  if (event.altKey) altKey = true;
});

window.addEventListener("keyup", () => {
  altKey = false;
});

window.addEventListener(
  "click",
  (event) => {
    if (altKey && event.target instanceof HTMLElement) {
      event.preventDefault();
      const instance = getReactInstanceForElement(event.target);
      const path = getSourceForInstance(instance);

      if (!path) {
        console.warn(
          "Couldn't find a React instance for the element",
          event.target,
        );
        return;
      }

      openInEditor(path);
    }
  },
  { capture: true },
);

const getReactInstanceForElement = (element: Element) => {
  // Prefer React DevTools, which has direct access to `react-dom` for mapping `element` <=> Fiber
  if ("__REACT_DEVTOOLS_GLOBAL_HOOK__" in window) {
    const { renderers } = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

    for (const renderer of renderers.values()) {
      try {
        const fiber = renderer.findFiberByHostInstance(element);
        if (fiber) return fiber;
      } catch {
        // If React is mid-render, references to previous nodes may disappear during the click events
        // (This is especially true for interactive elements, like menus)
      }
    }
  }

  if ("_reactRootContainer" in element) {
    return (element as any)._reactRootContainer._internalRoot.current.child;
  }

  for (const key in element) {
    if (key.startsWith("__reactFiber")) return (element as any)[key];
  }
};

const getSourceForInstance = ({ _debugSource }: any) => {
  if (!_debugSource) return;
  const { columnNumber = 1, fileName, lineNumber = 1 } = _debugSource;
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${fileName}:${lineNumber}:${columnNumber}`;
};
