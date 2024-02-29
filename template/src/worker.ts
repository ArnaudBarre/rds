import "./utils.ts";

globalThis.onmessage = (e) => {
  console.log(e.data);
}
