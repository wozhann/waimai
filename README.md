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
- **`PriceProvider`** — the seam for data. Today: `MockProvider` overlays a per-platform pricing
  "personality" (Meituan leans on 满减, Ele.me on 会员+cheap delivery, JD on a big flat subsidy) onto a
  shared canonical catalog — so the cheapest platform genuinely flips with cart size and membership.

### Run the tests

```bash
npm install
npm test            # runs the engine's vitest suite
```

## The app (`apps/mobile`)

Four screens: **搜索** (search shops/dishes across platforms) → **选菜** (build a cart) →
**比价** (ranked results with expandable per-platform breakdowns) and **我的** (set membership tier and
toggle coupons — the ranking recomputes from your profile).

```bash
npm run mobile      # expo start  (press w for web, or scan the QR with Expo Go)
```

## Roadmap → real data

Implement a real `PriceProvider` behind the same interface (start with a *legal* 美团联盟/CPS affiliate
feed, which also earns commission) in a future `apps/api`; the engine and UI stay unchanged. Truly
personalized real prices would require the user's logged-in platform session — out of scope here; the
profile screen stands in for it.
