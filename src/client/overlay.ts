import type { RDSErrorPayload } from "../hmr";
import { openInEditor } from "./utils";

const template = /* html */ `
<style>
:host {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  margin: 0;
  background: rgba(0, 0, 0, 0.66);
  --monospace: 'SFMono-Regular', Consolas,
              'Liberation Mono', Menlo, Courier, monospace;
  --red: #ff5555;
  --yellow: #e2aa53;
  --cyan: #2dd9da;
}

.window {
  font-family: var(--monospace);
  font-size: 16px;
  line-height: 1.3;
  width: 800px;
  margin: 30px auto;
  padding: 25px 40px;
  position: relative;
  background: #181818;
  border-radius: 6px 6px 8px 8px;
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
  overflow: hidden;
  border-top: 8px solid var(--red);
  direction: ltr;
  text-align: left;
}

.message {
  margin-bottom: 15px;
  white-space: pre-wrap;
  color: var(--red);
  font-weight: 600;
}

.file {
  display: block;
  margin-bottom: 15px;
  color: var(--cyan);
  text-decoration: underline;
  cursor: pointer;
}

.frame {
  margin-bottom: 15px;
  white-space: pre;
  color: var(--yellow);
}

.tip {
  border-top: 1px dotted #999;
  padding-top: 13px;
  font-size: 13px;
  color: #999;
}
</style>
<div class="window">
  <div class="message"></div>
  <a class="file"></a>
  <div class="frame"></div>
  <div class="tip">Click outside or fix the code to dismiss.</div>
</div>
`;

export class ErrorOverlay extends HTMLElement {
  root: ShadowRoot;

  constructor(err: RDSErrorPayload) {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = template;
    this.root.querySelector(".message")!.textContent = err.message;
    if (err.frame) this.root.querySelector(".frame")!.textContent = err.frame;
    const fileLink = this.root.querySelector<HTMLLinkElement>(".file")!;
    fileLink.textContent = err.file;
    fileLink.onclick = () => {
      openInEditor(err.file);
    };

    this.root.querySelector(".window")!.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    this.addEventListener("click", () => {
      this.close();
    });
  }

  close(): void {
    this.parentNode!.removeChild(this);
  }
}

export const overlayId = "rds-error-overlay";

if (!customElements.get(overlayId)) {
  customElements.define(overlayId, ErrorOverlay);
}
