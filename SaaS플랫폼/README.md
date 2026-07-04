# ProjectRadar Prototype

Official-source opportunity radar for public procurement, power/gas/facility work, construction/civil work, and public large-company vendor notices.

## Run

```powershell
pnpm install
pnpm dev
```

The app works without API keys by seeding sample and public fallback data. Add keys to `.env.local` later:

```env
DATA_GO_KR_SERVICE_KEY=...
PPS_BID_SERVICE_BASE_URL=https://apis.data.go.kr/1230000/ad/BidPublicInfoService
PPS_AWARD_SERVICE_BASE_URL=https://apis.data.go.kr/1230000/as/ScsbidInfoService
PPS_LOOKBACK_DAYS=7
KEPCO_API_KEY=...
OPENAI_API_KEY=...
```

`DATA_GO_KR_SERVICE_KEY` is used for both PPS bid notices and PPS award results. If the API returns `403`, check the data.go.kr usage approval, service-specific permission, registered IP/domain, and key status.

## Modules

- `src/lib/sources`: source adapters for APIs and public pages.
- `src/lib/normalization.ts`: maps raw source records into one `Opportunity` shape.
- `src/lib/matching.ts`: rule-based fit scoring against the company profile.
- `src/lib/evidence.ts`: trust and recommendation evidence helpers.
- `src/lib/db.ts`: SQLite persistence using Node's built-in SQLite runtime.
