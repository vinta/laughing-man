import { marked } from "marked";

export function extractHeading(markdown: string): string {
  const stripped = markdown.replace(/^```[\s\S]*?^```/gm, "");
  const match = stripped.match(/^#\s+(.+)$/m);
  if (!match) return "";

  const html = marked.parseInline(match[1].trim()) as string;
  return html.replace(/<[^>]*>/g, "").trim();
}
