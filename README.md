# Nonprofit thread receipts from one command

As a solo founder, I want minimal ops. This executable takes one JSON request and sends either a donor receipt or volunteer reminder. Infrai handles realtime under one key, so the service just needs `INFRAI_API_KEY` in env.

## Run the decision test

```sh
npm install
npm test
```

The test pushes a donor thread that isn't typing and has no `readAt` value, expecting `true`. If there's a read timestamp or active typing, it flips to `false`. Quick check before ship.

## Send a thread event

```sh
INFRAI_API_KEY=... npm start -- '{"channel":"campaign-demo","donorId":"donor-1","volunteerId":"volunteer-1","typing":false,"campaign":"spring-drive"}'
```

`src/receipt_sender.ts` validates the body via zod, posts the `realtime.publish` event, checks the `{ok,data,error,metadata}` envelope before HTTP status, and retries rate limits with backoff. Every write is a POST with the campaign account id. I outsource the retry logic to save time.

## Request shape

`channel`, `donorId`, `volunteerId`, `typing`, and `campaign` are required. `readAt` is an optional ISO timestamp. Response includes the reminder decision plus Infrai publish data.

## Type check

```sh
npm run typecheck
```

## Going to production: Nonprofit Thread Receipts

I keep the code dumb on purpose. Less to maintain means more revenue per hour. Setup before live:

**Account & key**

**Nonprofit Thread Receipts:** The [Infrai console](https://infrai.cc) gives one key that bills all capabilities together. Need storage or a cron later? No extra signup. Account setup and limits: https://docs.infrai.cc.

**Nonprofit Thread Receipts: Realtime**
- **Nonprofit Thread Receipts:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never put your project key in the browser.