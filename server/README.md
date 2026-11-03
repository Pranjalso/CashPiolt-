# CashPilot — Cash Flow Management + Expense Claims (Web + Mobile)

For every type of business (retail, restaurant, manufacturing, trading, services, IT, construction,
healthcare, education, transport, agriculture, freelancer, NGO …). One login can run several businesses.

```
cashflow/
  server/   Next.js 14 + PostgreSQL — REST API + desktop web app
  mobile/   React Native (Expo SDK 58) — Android & iOS app using the same API
```

## 1. Server + web app
```bash
cd server
createdb cashflow
cp .env.example .env            # set DATABASE_URL, JWT_SECRET, CORS_ORIGINS, CRON_SECRET
npm install
export $(grep -v '^#' .env | xargs) && npm run db:init     # schema + demo data
npm run dev                     # http://localhost:3000
```
Demo logins (password `Admin@123`): owner@cash.local · accounts@cash.local · employee@cash.local · viewer@cash.local

Daily recurring entries: call `POST /api/recurring/run` with header `x-cron-secret: $CRON_SECRET` once a day.

## 2. Mobile app
```bash
cd mobile
npm install
cp .env.example .env            # EXPO_PUBLIC_API_URL=http://<your-PC-LAN-IP>:3000  (or https://your-domain)
npx expo start                  # scan QR with Expo Go (Android/iOS)
```
Store builds: `npm i -g eas-cli && eas build -p android` (AAB/APK) / `eas build -p ios`.

Full architecture, flows, API reference and source: CashPilot_CashFlow_ExpenseClaims_Blueprint.pdf
