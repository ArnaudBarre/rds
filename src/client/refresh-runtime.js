/**
 * This is simplified pure-js version of https://github.com/facebook/react/blob/main/packages/react-refresh/src/ReactFreshRuntime.js
 * without IE11 compatibility and functions for the babel plugin
 * @preserve Copyright (c) Facebook, Inc. and its affiliates.
 */

const REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
const REACT_MEMO_TYPE = Symbol.for("react.memo");

// We never remove these associations.
// It's OK to reference families, but use WeakMap/Set for types.
let allFamiliesByID = new Map();
let allFamiliesByType = new WeakMap();
let allSignaturesByType = new WeakMap();

// This WeakMap is read by React, so we only put families
// that have actually been edited here. This keeps checks fast.
let updatedFamiliesByType = new WeakMap();

// This is cleared on every performReactRefresh() call.
// It is an array of [Family, NextType] tuples.
let pendingUpdates = [];

// This is injected by the renderer via DevTools global hook.
let helpersByRendererID = new Map();
let helpersByRoot = new Map();

// We keep track of mounted roots so we can schedule updates.
let mountedRoots = new Set();

// If a root captures an error, we remember it so we can retry on edit.
let failedRoots = new Set();

// We also remember the last element for every root.
// It needs to be weak because we do this even for roots that failed to mount.
// If there is no WeakMap, we won't attempt to do retrying.
let rootElements = new WeakMap();
let isPerformingRefresh = false;

function computeFullKey(signature) {
  if (signature.fullKey !== null) {
    return signature.fullKey;
  }

  let fullKey = signature.ownKey;
  let hooks;

  try {
    hooks = signature.getCustomHooks();
  } catch (err) {
    // This can happen in an edge case, e.g. if expression like Foo.useSomething
    // depends on Foo which is lazily initialized during rendering.
    // In that case just assume we'll have to remount.
    signature.forceReset = true;
    signature.fullKey = fullKey;
    return fullKey;
  }

  for (let i = 0; i < hooks.length; i++) {
    let hook = hooks[i];

    if (typeof hook !== "function") {
      // Something's wrong. Assume we need to remount.
      signature.forceReset = true;
      signature.fullKey = fullKey;
      return fullKey;
    }

    let nestedHookSignature = allSignaturesByType.get(hook);

    if (nestedHookSignature === undefined) {
      // No signature means Hook wasn't in the source code, e.g. in a library.
      // We'll skip it because we can assume it won't change during this session.
      continue;
    }

    let nestedHookKey = computeFullKey(nestedHookSignature);

    if (nestedHookSignature.forceReset) {
      signature.forceReset = true;
    }

    fullKey += "\n---\n" + nestedHookKey;
  }

  signature.fullKey = fullKey;
  return fullKey;
}

function haveEqualSignatures(prevType, nextType) {
  let prevSignature = allSignaturesByType.get(prevType);
  let nextSignature = allSignaturesByType.get(nextType);

  if (prevSignature === undefined && nextSignature === undefined) {
    return true;
  }

  if (prevSignature === undefined || nextSignature === undefined) {
    return false;
  }

  if (computeFullKey(prevSignature) !== computeFullKey(nextSignature)) {
    return false;
  }

  if (nextSignature.forceReset) {
    return false;
  }

  return true;
}

function isReactClass(type) {
  return type.prototype && type.prototype.isReactComponent;
}

function canPreserveStateBetween(prevType, nextType) {
  if (isReactClass(prevType) || isReactClass(nextType)) {
    return false;
  }

  if (haveEqualSignatures(prevType, nextType)) {
    return true;
  }

  return false;
}

function resolveFamily(type) {
  // Only check updated types to keep lookups fast.
  return updatedFamiliesByType.get(type);
}

// This is a safety mechanism to protect against rogue getters and Proxies.
function getProperty(object, property) {
  try {
    return object[property];
  } catch (err) {
    // Intentionally ignore.
    return undefined;
  }
}

function performReactRefresh() {
  if (pendingUpdates.length === 0) {
    return null;
  }

  if (isPerformingRefresh) {
    return null;
  }

  isPerformingRefresh = true;

  try {
    let staleFamilies = new Set();
    let updatedFamilies = new Set();
    let updates = pendingUpdates;
    pendingUpdates = [];
    updates.forEach(function (_ref) {
      let family = _ref[0],
        nextType = _ref[1];
      // Now that we got a real edit, we can create associations
      // that will be read by the React reconciler.
      let prevType = family.current;
      updatedFamiliesByType.set(prevType, family);
      updatedFamiliesByType.set(nextType, family);
      family.current = nextType;

      // Determine whether this should be a re-render or a re-mount.
      if (canPreserveStateBetween(prevType, nextType)) {
        updatedFamilies.add(family);
      } else {
        staleFamilies.add(family);
      }
    });

    let update = {
      updatedFamilies: updatedFamilies,
      // Families that will re-render preserving state
      staleFamilies: staleFamilies, // Families that will be remounted
    };
    helpersByRendererID.forEach(function (helpers) {
      // Even if there are no roots, set the handler on first update.
      // This ensures that if *new* roots are mounted, they'll use the resolve handler.
      helpers.setRefreshHandler(resolveFamily);
    });
    let didError = false;
    let firstError = null;

    // We snapshot maps and sets that are mutated during commits.
    // If we don't do this, there is a risk they will be mutated while
    // we iterate over them. For example, trying to recover a failed root
    // may cause another root to be added to the failed list -- an infinite loop.
    let failedRootsSnapshot = new Set(failedRoots);
    let mountedRootsSnapshot = new Set(mountedRoots);
    let helpersByRootSnapshot = new Map(helpersByRoot);
    failedRootsSnapshot.forEach(function (root) {
      let helpers = helpersByRootSnapshot.get(root);

      if (helpers === undefined) {
        throw new Error(
          "Could not find helpers for a root. This is a bug in React Refresh.",
        );
      }

      if (!failedRoots.has(root)) {
        // No longer failed.
      }

      if (!rootElements.has(root)) {
        return;
      }

      let element = rootElements.get(root);

      try {
        helpers.scheduleRoot(root, element);
      } catch (err) {
        if (!didError) {
          didError = true;
          firstError = err;
        }
        // Keep trying other roots.
      }
    });
    mountedRootsSnapshot.forEach(function (root) {
      let helpers = helpersByRootSnapshot.get(root);

      if (helpers === undefined) {
        throw new Error(
          "Could not find helpers for a root. This is a bug in React Refresh.",
        );
      }

      if (!mountedRoots.has(root)) {
        // No longer mounted.
      }

      try {
        helpers.scheduleRefresh(root, update);
      } catch (err) {
        if (!didError) {
          didError = true;
          firstError = err;
        }
        // Keep trying other roots.
      }
    });

    if (didError) {
      throw firstError;
    }

    return update;
  } finally {
    isPerformingRefresh = false;
  }
}

function debounce(fn, delay) {
  let handle;
  return () => {
    clearTimeout(handle);
    handle = setTimeout(fn, delay);
  };
}

const enqueueUpdate = debounce(performReactRefresh, 16);

function register(type, id) {
  if (type === null) {
    return;
  }

  if (typeof type !== "function" && typeof type !== "object") {
    return;
  }

  // This can happen in an edge case, e.g. if we register
  // return value of a HOC but it returns a cached component.
  // Ignore anything but the first registration for each type.
  if (allFamiliesByType.has(type)) {
    return;
  }

  // Create family or remember to update it.
  // None of this bookkeeping affects reconciliation
  // until the first performReactRefresh() call above.
  let family = allFamiliesByID.get(id);

  if (family === undefined) {
    family = {
      current: type,
    };
    allFamiliesByID.set(id, family);
  } else {
    pendingUpdates.push([family, type]);
  }

  allFamiliesByType.set(type, family); // Visit inner types because we might not have registered them.

  if (typeof type === "object" && type !== null) {
    switch (getProperty(type, "$$typeof")) {
      case REACT_FORWARD_REF_TYPE:
        register(type.render, id + "$render");
        break;

      case REACT_MEMO_TYPE:
        register(type.type, id + "$type");
        break;
    }
  }
}

function getRefreshReg(filename) {
  return (type, id) => register(type, filename + " " + id);
}

function setSignature(type, key, forceReset = false, getCustomHooks) {
  if (!allSignaturesByType.has(type)) {
    allSignaturesByType.set(type, {
      forceReset: forceReset,
      ownKey: key,
      fullKey: null,
      getCustomHooks:
        getCustomHooks
        || function () {
          return [];
        },
    });
  }

  // Visit inner types because we might not have signed them.
  if (typeof type === "object" && type !== null) {
    switch (getProperty(type, "$$typeof")) {
      case REACT_FORWARD_REF_TYPE:
        setSignature(type.render, key, forceReset, getCustomHooks);
        break;

      case REACT_MEMO_TYPE:
        setSignature(type.type, key, forceReset, getCustomHooks);
        break;
    }
  }
}

// This is lazily called during first render for a type.
// It captures Hook list at that time so inline requires don't break comparisons.
function collectCustomHooksForSignature(type) {
  let signature = allSignaturesByType.get(type);

  if (signature !== undefined) {
    computeFullKey(signature);
  }
}

function injectIntoGlobalHook(globalObject) {
  // For React Native, the global hook will be set up by require('react-devtools-core').
  // That code will run before us. So we need to monkeypatch functions on existing hook.
  // For React Web, the global hook will be set up by the extension.
  // This will also run before us.
  let hook = globalObject.__REACT_DEVTOOLS_GLOBAL_HOOK__;

  if (hook === undefined) {
    // However, if there is no DevTools extension, we'll need to set up the global hook ourselves.
    // Note that in this case it's important that renderer code runs *after* this method call.
    // Otherwise, the renderer will think that there is no global hook, and won't do the injection.
    let nextID = 0;
    globalObject.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook = {
      renderers: new Map(),
      supportsFiber: true,
      inject: function (injected) {
        return nextID++;
      },
      onScheduleFiberRoot: function (id, root, children) {},
      onCommitFiberRoot: function (id, root, maybePriorityLevel, didError) {},
      onCommitFiberUnmount: function () {},
    };
  }

  if (hook.isDisabled) {
    // This isn't a real property on the hook, but it can be set to opt out
    // of DevTools integration and associated warnings and logs.
    // Using console['warn'] to evade Babel and ESLint
    console["warn"](
      "Something has shimmed the React DevTools global hook (__REACT_DEVTOOLS_GLOBAL_HOOK__). "
        + "Fast Refresh is not compatible with this shim and will be disabled.",
    );
    return;
  }

  // Here, we just want to get a reference to scheduleRefresh.
  let oldInject = hook.inject;

  hook.inject = function (injected) {
    let id = oldInject.apply(this, arguments);

    if (
      typeof injected.scheduleRefresh === "function"
      && typeof injected.setRefreshHandler === "function"
    ) {
      // This version supports React Refresh.
      helpersByRendererID.set(id, injected);
    }

    return id;
  };

  // Do the same for any already injected roots.
  // This is useful if ReactDOM has already been initialized.
  // https://github.com/facebook/react/issues/17626
  hook.renderers.forEach(function (injected, id) {
    if (
      typeof injected.scheduleRefresh === "function"
      && typeof injected.setRefreshHandler === "function"
    ) {
      // This version supports React Refresh.
      helpersByRendererID.set(id, injected);
    }
  });

  // We also want to track currently mounted roots.
  let oldOnCommitFiberRoot = hook.onCommitFiberRoot;

  let oldOnScheduleFiberRoot = hook.onScheduleFiberRoot || function () {};

  hook.onScheduleFiberRoot = function (id, root, children) {
    if (!isPerformingRefresh) {
      // If it was intentionally scheduled, don't attempt to restore.
      // This includes intentionally scheduled unmounts.
      failedRoots.delete(root);

      rootElements.set(root, children);
    }

    return oldOnScheduleFiberRoot.apply(this, arguments);
  };

  hook.onCommitFiberRoot = function (id, root, maybePriorityLevel, didError) {
    let helpers = helpersByRendererID.get(id);

    if (helpers !== undefined) {
      helpersByRoot.set(root, helpers);
      let current = root.current;
      let alternate = current.alternate;

      // We need to determine whether this root has just (un)mounted.
      // This logic is copy-pasted from similar logic in the DevTools backend.
      // If this breaks with some refactoring, you'll want to update DevTools too.
      if (alternate !== null) {
        let wasMounted =
          alternate.memoizedState != null
          && alternate.memoizedState.element != null;
        let isMounted =
          current.memoizedState != null
          && current.memoizedState.element != null;

        if (!wasMounted && isMounted) {
          // Mount a new root.
          mountedRoots.add(root);
          failedRoots.delete(root);
        } else if (wasMounted && isMounted) {
          // Update an existing root.
          // This doesn't affect our mounted root Set.
        } else if (wasMounted && !isMounted) {
          // Unmount an existing root.
          mountedRoots.delete(root);

          if (didError) {
            // We'll remount it on future edits.
            failedRoots.add(root);
          } else {
            helpersByRoot.delete(root);
          }
        } else if (!wasMounted && !isMounted) {
          if (didError) {
            // We'll remount it on future edits.
            failedRoots.add(root);
          }
        }
      } else {
        // Mount a new root.
        mountedRoots.add(root);
      }
    }

    // Always call the decorated DevTools hook.
    return oldOnCommitFiberRoot.apply(this, arguments);
  };
}

// This is a wrapper over more primitive functions for setting signature.
// Signatures let us decide whether the Hook order has changed on refresh.
//
// This function is intended to be used as a transform target, e.g.:
// let _s = createSignatureFunctionForTransform()
//
// function Hello() {
//   const [foo, setFoo] = useState(0);
//   const value = useCustomHook();
//   _s(); /* Call without arguments triggers collecting the custom Hook list.
//          * This doesn't happen during the module evaluation because we
//          * don't want to change the module order with inline requires.
//          * Next calls are noops. */
//   return <h1>Hi</h1>;
// }
//
// /* Call with arguments attaches the signature to the type: */
// _s(
//   Hello,
//   'useState{[foo, setFoo]}(0)',
//   () => [useCustomHook], /* Lazy to avoid triggering inline requires */
// );
function createSignatureFunctionForTransform() {
  let savedType;
  let hasCustomHooks;
  let didCollectHooks = false;
  return function (type, key, forceReset, getCustomHooks) {
    if (typeof key === "string") {
      // We're in the initial phase that associates signatures
      // with the functions. Note this may be called multiple times
      // in HOC chains like _s(hoc1(_s(hoc2(_s(actualFunction))))).
      if (!savedType) {
        // We're in the innermost call, so this is the actual type.
        savedType = type;
        hasCustomHooks = typeof getCustomHooks === "function";
      }

      // Set the signature for all types (even wrappers!) in case
      // they have no signatures of their own. This is to prevent
      // problems like https://github.com/facebook/react/issues/20417.
      if (
        type != null
        && (typeof type === "function" || typeof type === "object")
      ) {
        setSignature(type, key, forceReset, getCustomHooks);
      }

      return type;
    } else {
      // We're in the _s() call without arguments, which means
      // this is the time to collect custom Hook signatures.
      // Only do this once. This path is hot and runs *inside* every render!
      if (!didCollectHooks && hasCustomHooks) {
        didCollectHooks = true;
        collectCustomHooksForSignature(savedType);
      }
    }
  };
}

export const RefreshRuntime = {
  enqueueUpdate,
  getRefreshReg,
  injectIntoGlobalHook,
  createSignatureFunctionForTransform,
};
