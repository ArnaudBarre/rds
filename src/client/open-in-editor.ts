import { RDS_OPEN_IN_EDITOR } from "../server/consts";

export const openInEditor = (file: string) => {
  fetch(`/${RDS_OPEN_IN_EDITOR}?file=${encodeURIComponent(file)}`);
};
