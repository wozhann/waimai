/**
 * Vercel serverless function: interpret a free-text food craving with OpenAI and
 * return a dish-selection plan the pricing engine can rank.
 *
 * The OpenAI key lives ONLY here (server-side, from the OPENAI_API_KEY env var);
 * it never reaches the browser. If the key is unset the function returns 501 and
 * the app silently falls back to its deterministic local matcher.
 *
 * Request  (POST JSON): { text: string, menu: RestaurantMenu[] }
 * Response (200 JSON):  { plan: IntentPlan, source: 'llm' }
 */

const MODEL = 'gpt-4o-mini';
const MAX_TEXT = 400;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(501).json({ error: 'OPENAI_API_KEY not configured' });
    return;
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const text = typeof body?.text === 'string' ? body.text.slice(0, MAX_TEXT) : '';
  const menu = Array.isArray(body?.menu) ? body.menu : null;
  if (!text || !menu) {
    res.status(400).json({ error: 'Expected { text, menu }' });
    return;
  }

  // Flat id->name list keeps the prompt small and ids unambiguous.
  const dishes = [];
  for (const r of menu) {
    for (const d of r.dishes ?? []) {
      dishes.push({ dishId: d.dishId, name: d.name, restaurant: r.name, tags: d.tags ?? [] });
    }
  }
  const validIds = new Set(dishes.map((d) => d.dishId));

  const system =
    '你是外卖点单助手。给定菜单（每道菜有 dishId、名称、店铺、标签）和用户用中文描述的需求，' +
    '挑选最符合需求的菜品。理解口味、菜系、份量、场景等自然语言，不要只做字面匹配。' +
    '如果用户提到预算（如「20元以内」），提取为数字（元）。只能使用给定的 dishId。' +
    '严格返回 JSON：{"budgetYuan": number|null, "picks": [{"dishId": string, "relevance": 1|2|3}], ' +
    '"excludeDishIds": string[]}。relevance 越高越贴合需求。';

  const user = JSON.stringify({ craving: text, dishes });

  try {
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!completion.ok) {
      const detail = await completion.text();
      res.status(502).json({ error: 'OpenAI request failed', detail: detail.slice(0, 500) });
      return;
    }

    const data = await completion.json();
    const raw = data.choices?.[0]?.message?.content;
    const parsed = safeParse(raw) ?? {};

    // Normalize to the engine's IntentPlan (money in fen), dropping unknown ids.
    const picks = Array.isArray(parsed.picks) ? parsed.picks : [];
    const matches = picks
      .filter((p) => p && validIds.has(p.dishId))
      .map((p) => ({
        dishId: p.dishId,
        relevance: clampRelevance(p.relevance),
        aspects: [],
      }));
    const excludeDishIds = Array.isArray(parsed.excludeDishIds)
      ? parsed.excludeDishIds.filter((id) => validIds.has(id))
      : [];
    const budget =
      typeof parsed.budgetYuan === 'number' && parsed.budgetYuan > 0
        ? Math.round(parsed.budgetYuan * 100)
        : undefined;

    res.status(200).json({ source: 'llm', plan: { budget, matches, excludeDishIds } });
  } catch (err) {
    res.status(500).json({ error: 'Interpretation failed', detail: String(err).slice(0, 300) });
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function clampRelevance(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(3, v));
}
