import { buildMenuSnapshot, type IntentPlan, type PriceProvider } from '@waimai/engine';

/**
 * Endpoint of the serverless OpenAI proxy. Relative by default so it resolves to
 * the same origin the PWA is served from (works on Vercel web). For native builds
 * set EXPO_PUBLIC_INTERPRET_URL to the full https URL.
 */
const ENDPOINT = process.env.EXPO_PUBLIC_INTERPRET_URL ?? '/api/interpret';

/**
 * Ask the serverless matcher to interpret a craving into an engine plan. Returns
 * null on ANY failure (key unset → 501, network error, native with no base URL),
 * so the caller can fall back to the deterministic local matcher.
 */
export async function llmInterpret(
  text: string,
  providers: PriceProvider[],
): Promise<IntentPlan | null> {
  try {
    const menu = await buildMenuSnapshot(providers);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, menu }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { plan?: IntentPlan };
    if (!data?.plan || !Array.isArray(data.plan.matches) || data.plan.matches.length === 0) {
      return null;
    }
    return data.plan;
  } catch {
    return null;
  }
}
