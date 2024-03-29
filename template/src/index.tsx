import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "virtual:@downwind/base.css";
import "./index.css";
import { App } from "./App.tsx";
import "virtual:@downwind/utils.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
