import { useState } from "react";
import Logo from "./react.svg";

export const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="h-full p-10 overflow-auto flex-col justify-center items-center space-y-8 text-center">
      <a href="https://reactjs.org" target="_blank" rel="noreferrer">
        <Logo
          className="h-24 w-24 drop-shadow motion-safe:animate-spin [animation-duration:20s]"
          style={{ filter: "drop-shadow(0 0 2em #61dafbaa)" }}
        />
      </a>
      <h1 className="text-5xl tracking-wide">RDS</h1>
      <button
        className="py-2 px-4 font-semibold rounded-lg shadow-md text-white bg-fuchsia-500 hover:bg-fuchsia-600 transition"
        onClick={() => setCount(() => count + 1)}
      >
        count is <span className="tabular-nums">{count}</span>
      </button>
      <p className="text-neutral-400">
        Edit <code>src/App.tsx</code> and save to test HMR
      </p>
    </div>
  );
};
