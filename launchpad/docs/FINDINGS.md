# Findings from dev server logs

Based on logs like:

```
GET /token/0x96D00... 200 in 2.2s (compile: 1847ms, render: 339ms)
HEAD /token/0x96D00... 200 in 131ms (compile: 103ms, render: 29ms)
GET / 200 in 115ms (compile: 100ms, render: 15ms)
GET /tokens 200 in 124ms (compile: 112ms, render: 12ms)
GET /create 200 in 835ms (compile: 817ms, render: 18ms)
POST /api/upload/image 200 in 1978ms (compile: 115ms, render: 1863ms)
```

## What’s going on

| Request | Compile | Render | Notes |
|--------|--------|--------|--------|
| **GET /token/[address]** (first) | ~1847ms | ~339ms | Dynamic route compiles on first hit; main cost is Turbopack compiling the route + client bundle (wagmi, viem, TokenDetail). |
| **HEAD /token/[address]** (repeat) | ~103ms | ~29ms | Cached compile; much faster. |
| **GET /create** | ~817ms | ~18ms | Create page pulls in writeContract, useWaitForTransactionReceipt, decodeEventLog, form state — heavier client bundle. |
| **POST /api/upload/image** | ~115ms | **~1863ms** | Most of the 2s is **render** (handler work), i.e. **Pinata upload**, not Next.js. Compile is small. |

## What’s “wrong” (and what isn’t)

- **Nothing is broken.** These are normal **dev** behaviors:
  - **Compile** = time to build the route/chunk (happens once per route in dev; in production everything is prebuilt).
  - **Render** = server work (SSR or API handler). For the upload API, “render” is dominated by the call to Pinata (network + pin).

- **Why first token page is slow:** First request to `/token/0x...` triggers compilation of that dynamic route and its client deps. Later requests to the same or other token URLs reuse work, so they’re faster.

- **Why create is slower than home/tokens:** The create page has more client-side code (contract write, receipt waiting, event decoding, validation), so its chunk is bigger and takes longer to compile once.

- **Why image upload takes ~2s:** Almost all of that is **Pinata** (upload + pin to IPFS). The API route itself is cheap; to improve perceived speed you’d optimize the upload (e.g. client progress, or a faster pinning provider), not Next.js.

## Other dev warnings

### "Only plain objects can be passed to Client Components from Server Components. Set objects are not supported."

- We removed the only `Set` from our code (TokenList now uses an array). If this still appears, the `Set` is likely in **Next.js or React’s RSC payload** (e.g. router/cache internals), not in app code.
- If it persists, try disabling React Strict Mode in `next.config.ts`: `reactStrictMode: false` (dev only). Re-enable for production if you rely on strict mode.

### "WalletConnect Core is already initialized. Init() was called 2 times."

- Caused by **React Strict Mode** in dev, which double-mounts components. WalletConnect then initializes twice.
- Harmless in dev. To remove the warning you can set `reactStrictMode: false` in `next.config.ts` during development.

## If you want faster dev experience

- Use **Webpack** instead of Turbopack: `pnpm run dev:webpack` (can change compile characteristics).
- **Production** (`pnpm run build && pnpm run start`): no on-demand compile; first load is just network + render.
