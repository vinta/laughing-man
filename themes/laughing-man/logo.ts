import { readFileSync } from "node:fs";

const logoPath = new URL("assets/laughing-man.svg", import.meta.url).pathname;

export function readLaughingManLogo() {
  return readFileSync(logoPath, "utf8");
}
