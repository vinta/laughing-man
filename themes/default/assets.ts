import { readFileSync } from "node:fs";

const stylesPath = new URL("assets/styles.css", import.meta.url).pathname;
const subscribeScriptPath = new URL("assets/subscribe.js", import.meta.url).pathname;
const FAVICON_FILE_NAME = "favicon.svg";

export function readStyles() {
  return readFileSync(stylesPath, "utf8");
}

export function readSubscribeScript() {
  return readFileSync(subscribeScriptPath, "utf8");
}

function publicSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

export { FAVICON_FILE_NAME };

export function faviconUrl(siteUrl: string): string {
  return `${publicSiteUrl(siteUrl)}/${FAVICON_FILE_NAME}`;
}

export function faviconLinkTags(siteUrl: string): string {
  return `<link rel="icon" type="image/svg+xml" href="${faviconUrl(siteUrl)}">`;
}
