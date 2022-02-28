import { useState } from "react";
import { add } from "./utils";
import Logo from "./logo.svg";
import "./App.css";
import logoUrl from "./logo.png";
import styles from "./app.module.css";

export const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="App bold">
      <header className="App-header">
        <p>Hello Vite + React!</p>
        <p>
          <button
            type="button"
            onClick={() => setCount((count) => add(count, 1))}
          >
            count is: {count}
          </button>
        </p>
        <p>
          Edit <code>App.tsx</code> and save to test HMR updates.
        </p>
        <Logo />
        <img src={logoUrl} className="App-logo" />
        <div className="logo-bg" />
        <p className="space-x-4">
          <a
            className="text-gray-500"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          {" | "}
          <a
            className={styles.someClass2}
            href="https://vitejs.dev/guide/features.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vite Docs
          </a>
        </p>
      </header>
    </div>
  );
};
