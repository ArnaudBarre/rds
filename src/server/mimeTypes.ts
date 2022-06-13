export const mimeTypes = {
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  ico: "image/x-icon",
  json: "application/json",
  map: "application/json",

  // images
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",

  // media
  mp3: "audio/mpeg",
  acc: "audio/aac",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",

  // font
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",

  // other
  txt: "text/plain",
  pdf: "application/pdf",
};
export type Extension = keyof typeof mimeTypes;

export const esbuildFilesLoaders: Record<
  `.${Exclude<
    Extension,
    "html" | "css" | "js" | "ico" | "json" | "map" | "svg"
  >}`,
  "file"
> = {
  ".jpg": "file",
  ".png": "file",
  ".gif": "file",
  ".webp": "file",
  ".avif": "file",
  ".mp3": "file",
  ".acc": "file",
  ".wav": "file",
  ".mp4": "file",
  ".webm": "file",
  ".woff": "file",
  ".woff2": "file",
  ".ttf": "file",
  ".otf": "file",
  ".txt": "file",
  ".pdf": "file",
};
