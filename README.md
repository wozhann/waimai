# 外卖比价 · Waimai Price Compare

Compare your **personalized** food-delivery (外卖) price across 美团 (Meituan), 饿了么 (Ele.me) and
京东外卖 (JD Waimai) in one app. The same dish from the same shop is often priced very differently once
满减 / 红包 / 配送费 / 会员 / 平台补贴 are stacked — this app computes each platform's true to-hand
price for *your* memberships and coupons and ranks them.

> **Data note:** this is a learning / portfolio project. Prices are **simulated** behind a clean
> `PriceProvider` interface. No live scraping is performed — a real, legal adapter (e.g. an affiliate
> API) can be dropped in later without touching the engine or UI. See "Design" below.

## Structure

```
packages/engine   Pure-TypeScript pricing engine (the core). No UI, fully unit-tested.
apps/mobile       Expo / React Native app (iOS + Android + web) that consumes the engine.
```

## The engine (`packages/engine`)

The interesting part. All money is integer 分 (fen) to avoid float drift.

- **`computePrice`** — an ordered discount/fee pipeline that mirrors how Chinese platforms actually
  price an order: subtotal → 满减 → 店铺红包 / 用户券 → 配送费 + 打包费 → 会员优惠 → 平台补贴.
  Invariant: `final === sum(steps)`, so the UI can render the itemization and trust the total.
- **`rankPlatforms`** — prices the same cart on every provider that carries the shop, applies the
  user's personalization, and ranks by final price.
- **`suggestCombos`** — enumerates *every* dish combination at a restaurant, prices each across all
  platforms, and sorts by cheapest personalized 到手价. Because 满减 thresholds are non-linear, this
  surfaces combos where adding a dish *lowers* the total — deals a human scrolling one app never spots.
- **`parseNaturalQuery` + `suggestByIntent`** — free-text craving search. A user types
  「想吃辣的，20元以内，有点汤更好了」; the parser pulls out the budget and negations, then every
  restaurant's best-fitting combo (by distinct taste-tags covered) is priced across platforms and ranked
  by fit then price. The matching is the one fuzzy step and is isolated so an LLM matcher can replace it.
- **`parseSmartQuery` + `smartSearch`** — 要/不要 dish search (「要汉堡 不要可乐」) that auto-builds a
  comparable cart.
- **`PriceProvider`** — the seam for data. Today: `MockProvider` overlays a per-platform pricing
  "personality" (Meituan leans on 满减, Ele.me on 会员+cheap delivery, JD on a big flat subsidy) onto a
  shared canonical catalog — so the cheapest platform genuinely flips with cart size and membership.

### Run the tests

```bash
npm install
npm test            # runs the engine's vitest suite
```

## The app (`apps/mobile`)

Screens: **搜索** — two modes: 找店铺 (search shops/dishes, incl. 要/不要 smart carts) and 说需求
(free-text craving → ranked suggestions) — → **选菜** (build a cart, with a 智能配单 combo explorer) →
**比价** (ranked results with expandable per-platform breakdowns) and **我的** (set membership tier and
toggle coupons — the ranking recomputes from your profile).

```bash
npm run mobile      # expo start  (press w for web, or scan the QR with Expo Go)
```

### Web / PWA deploy

```bash
npm run build:web   # builds engine + exports a static PWA to apps/mobile/dist
npx vercel --prod   # deploy (vercel.json is preconfigured)
```

The exported site is an installable PWA (manifest + icons + iOS/Android home-screen tags), so users can
「添加到主屏幕」and run it fullscreen — no app store, no APK, works on iPhone too.

## Roadmap → real data

Implement a real `PriceProvider` behind the same interface (start with a *legal* 美团联盟/CPS affiliate
feed, which also earns commission) in a future `apps/api`; the engine and UI stay unchanged. Truly
personalized real prices would require the user's logged-in platform session — out of scope here; the
profile screen stands in for it.
