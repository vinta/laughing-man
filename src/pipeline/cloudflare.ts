import Cloudflare from "cloudflare";

export function createClient(apiToken: string) {
  return new Cloudflare({ apiToken });
}

export function extractApexDomain(domain: string) {
  const parts = domain.split(".");
  return parts.slice(-2).join(".");
}

export async function verifyAuth(client: Cloudflare, accountId: string) {
  const account = await client.accounts.get({ account_id: accountId });
  return account.name;
}
