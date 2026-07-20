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
- **Free-text craving search.** A user types 「想吃辣的，20元以内，有点汤更好了」. Understanding the
  words and pricing the answer are split cleanly:
  - `IntentPlan` is the seam — *which* dishes matter (+ budget). Two matchers emit it: the deterministic
    `parseNaturalQuery` + `planFromNaturalQuery` (offline fallback: regex budget + tag matching), and an
    **OpenAI matcher** (`api/interpret.js` serverless proxy) that reads the real menu and picks dishes,
    handling synonyms/scenes/portions no tag list covers.
  - `rankByPlan` consumes the plan and does the exact part: enumerate combos, price across platforms,
    enforce budget, rank by fit then to-hand price. The LLM never does arithmetic.
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

### Enabling the OpenAI craving matcher

The free-text 说需求 search works offline via the deterministic matcher. To turn on the LLM matcher,
set an OpenAI key on the deployment (server-side only — it never reaches the browser):

```bash
vercel env add OPENAI_API_KEY production   # paste your sk-... key when prompted
vercel --prod                              # redeploy so the function picks it up
```

Without the key, `/api/interpret` returns 501 and the app silently falls back to the local matcher. The
serverless function (`api/interpret.js`) uses `gpt-4o-mini` and returns only dish ids + a budget; all
pricing stays in the deterministic engine.

## Real data on Android — the 实测 (live-capture) build

The mock engine proves the *concept*; the personalized real number only exists inside each app, behind
your login. No legal API exposes it. The honest way to read it is **on your own device, off your own
screen**: you log in, claim coupons and build the cart yourself, and an **Android Accessibility Service**
reads the price breakdown already displayed on the 结算 (checkout) page. No network interception, no
credential handling, nothing leaves the device — the app only reads what you can already see.

This is Android-only and needs a **real APK** (an Accessibility Service cannot exist in a PWA or in
Expo Go), so the app was prebuilt to a bare native project (`apps/mobile/android/`).

- `WaimaiCaptureService.kt` — watches a pinned allowlist of delivery apps (美团 / 饿了么 / 淘宝闪购 /
  京东), and when a checkout screen appears, walks the accessibility tree and records the visible text +
  a best-effort parsed breakdown (`AmountParser.kt`, amounts in fen). Stored locally in `CaptureStore.kt`.
- `LiveCaptureModule.kt` — the RN bridge: read captures, clear, check/enable the service, live events.
- `src/capture/*` + `src/screens/CaptureScreen.tsx` — the **实测** tab: enable the service, then see each
  app's real checkout total, ranked cheapest-first, with a raw-text view used to calibrate the parser.
- The 实测 tab only shows on an Android build (`isCaptureSupported`); the web PWA is unchanged.

```bash
cd apps/mobile
npx expo run:android            # build + install the dev APK on a USB-connected phone
# then: Settings → Accessibility → 外卖比价 · 读价服务 → enable
```

> **Personal-use tool.** Reading another app's screen via an accessibility service is against those
> apps' ToS and can trigger their 风控 (account-risk) systems. This is built for reading *your own*
> accounts on *your own* device — not a service for others, and it deliberately does **not** intercept
> traffic or defeat any app protection.

**Calibration is the last mile** (needs the phone): the real 美团外卖/淘宝闪购 package ids and the exact
label→amount layout of each checkout page must be confirmed against the live apps, then the allowlist in
`accessibility_service_config.xml` + `WaimaiCaptureService.TARGET_PACKAGES` and the rules in
`AmountParser.kt` refined from the raw-text dumps.

## Roadmap → real data (the legal, for-others path)

Implement a real `PriceProvider` behind the same interface (start with a *legal* 美团联盟/CPS affiliate
feed, which also earns commission) in a future `apps/api`; the engine and UI stay unchanged. That path
gives public deals + commission but never another user's personalized price — which is exactly why the
personal 实测 build above exists.
