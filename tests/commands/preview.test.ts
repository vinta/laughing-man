import { describe, expect, it } from "bun:test";
import { getPreviewContentType } from "../../src/commands/preview";

describe("getPreviewContentType", () => {
  it("serves feed.xml as RSS", () => {
    expect(getPreviewContentType("/feed.xml", "/tmp/feed.xml")).toBe(
      "application/rss+xml; charset=utf-8",
    );
  });

  it("serves other XML files as generic XML", () => {
    expect(getPreviewContentType("/sitemap.xml", "/tmp/sitemap.xml")).toBe(
      "application/xml; charset=utf-8",
    );
  });
});
