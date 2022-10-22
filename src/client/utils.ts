import { RDS_OPEN_IN_EDITOR } from "../server/consts";

export const openInEditor = (file: string) => {
  fetch(`/${RDS_OPEN_IN_EDITOR}?file=${encodeURIComponent(file)}`);
};

export const newStyleSheet = (id: string, content: string) => {
  const newStyle = document.createElement("style");
  newStyle.setAttribute("type", "text/css");
  newStyle.setAttribute("data-id", id);
  newStyle.innerHTML = content;
  document.head.appendChild(newStyle);
  return newStyle;
};
