import { describe, expect, it, mock } from "bun:test";
import { extractApexDomain, verifyAuth } from "../../src/pipeline/cloudflare";
import type Cloudflare from "cloudflare";

describe("extractApexDomain", () => {
  it("extracts apex from subdomain", () => {
    expect(extractApexDomain("newsletter.example.com")).toBe("example.com");
  });

  it("returns apex domain as-is", () => {
    expect(extractApexDomain("example.com")).toBe("example.com");
  });

  it("handles deeply nested subdomain", () => {
    expect(extractApexDomain("a.b.c.example.com")).toBe("example.com");
  });
});

describe("verifyAuth", () => {
  it("returns account name on success", async () => {
    const mockClient = {
      accounts: {
        get: mock(() => Promise.resolve({ name: "my-account" })),
      },
    } as unknown as Cloudflare;

    const name = await verifyAuth(mockClient, "acc_123");
    expect(name).toBe("my-account");
    expect(mockClient.accounts.get).toHaveBeenCalledWith({
      account_id: "acc_123",
    });
  });

  it("throws on invalid token", async () => {
    const mockClient = {
      accounts: {
        get: mock(() => Promise.reject(new Error("Unauthorized"))),
      },
    } as unknown as Cloudflare;

    await expect(verifyAuth(mockClient, "acc_123")).rejects.toThrow();
  });
});
