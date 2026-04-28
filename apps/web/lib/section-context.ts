import { headers } from "next/headers";

export async function getActiveSection(): Promise<string | null> {
  const h = await headers();
  return h.get("x-active-section") ?? null;
}
