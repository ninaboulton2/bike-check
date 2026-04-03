# BikeCheck

Bike component wear & maintenance tracker. Connects to Strava, auto-tracks distance per component, accounts for ride conditions and trainer type, and alerts when replacement is due — saving cyclists hundreds in avoidable cascade damage.

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo |
| Web frontend | Next.js 15 (App Router, Turbopack) |
| Styling | Tailwind CSS 4 + shadcn/ui v4 (base-ui) |
| Database | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| Auth | Strava OAuth + JWT (httpOnly cookie) |
| Validation | Zod (shared schemas) |
| i18n | Custom hook + shared dictionaries (EN/FR) |
| Testing | Vitest (25 unit tests) |
| Language | TypeScript throughout |

## Monorepo Structure

```
bike-check/
├── apps/
│   └── web/                     # Next.js 15 webapp
│       ├── src/app/
│       │   ├── (marketing)/     # Landing page (SSR)
│       │   ├── (app)/           # Authenticated app (dashboard, bikes, components, rides, settings)
│       │   └── api/             # API route handlers
│       └── src/components/      # shadcn/ui components + feature dialogs
│
├── packages/
│   ├── core/                    # Business logic (wear engine, economic impact, Strava client)
│   ├── db/                      # Drizzle schema & migrations
│   ├── shared/                  # Types, Zod schemas, constants, enums, i18n dictionaries
│   └── email/                   # Email templates (stub)
│
├── turbo.json
└── package.json
```

## What's Been Built

### Phase 0 — Project Bootstrap
- [x] Turborepo monorepo, Next.js 15, Drizzle ORM, shadcn/ui v4, Zod schemas

### Phase 1 — Database & Auth
- [x] Full Drizzle schema: users, bikes, components, ride_logs, maintenance_events, component_relationships, sent_alerts
- [x] Strava OAuth flow (callback → JWT cookie), token refresh, auth middleware
- [x] Bike import from Strava with total distance

### Phase 2 — Wear Engine & Sync
- [x] `calculateWearDistance()` — condition multipliers + trainer wear matrix
- [x] `getComponentStatus()` — alert levels with percentage calculation
- [x] `getEconomicImpactMessage()` — cost-aware alert messages (chain→cassette, pads→rotors)
- [x] `getBikeTemplate()` — templates for road, gravel, mountain, commuter bikes
- [x] 25 unit tests (vitest) — wear engine, status, templates, indoor detection
- [x] Strava sync + webhook for real-time ride processing
- [x] Daily cron endpoint for calendar-based component checks

### Phase 3 — Web Frontend
- [x] **Dashboard** — bike tabs, component cards, search + multi-select status filters, sort by (status/name/km/date), threshold info tooltips, condition-triggered care alerts
- [x] **Bikes list** — active + removed (soft-deleted) bikes with reactivate
- [x] **Bike detail** — component grid, search/filter/sort, maintenance timeline, edit/delete bike, add component, add maintenance
- [x] **Component detail** — inline editable fields (name, brand, model, install date, cost, thresholds), battery/care tracking status, related components, maintenance history, delete
- [x] **Rides** — last 10 rides, editable conditions with wear labels, add manual ride (indoor/outdoor), delete manual rides
- [x] **Maintenance** — bike tabs, search + multi-select type filters, sort, per-bike cost breakdown (purchase + maintenance + this year), collapsible related components, edit/delete events
- [x] **Settings** — Strava connection status, email alerts, currency, language (EN/FR), theme (light/dark), profile with editable email, danger zone (delete account)
- [x] **Onboarding** — import from Strava, configure bikes, preview components
- [x] **Landing page** — hero, features, pricing, FAQ, EN/FR toggle

### Home Trainer System
- [x] Trainers as first-class bike entities with hardware components
- [x] Add/edit trainer dialogs (type, linked bike, install date, purchase price, components)
- [x] Background sync UX with SyncingPlaceholder
- [x] Soft-delete & reactivation (prevents km duplication)

### Component Tracking
- [x] **Battery tracking** — charge reminders for electronic components (Di2, pedals)
- [x] **Care tracking** — maintenance reminders (oil, clean, wax) with condition-triggered alerts
- [x] **Backdated replacement** — wear-engine-aware km recalculation
- [x] **Related components** — chain↔cassette, brake pads↔rotors
- [x] **Economic impact messages** — "Replace your chain to protect your cassette"

### Internationalization
- [x] Full EN/FR translation (all pages, dialogs, component labels, threshold info)
- [x] Language selector in settings + landing page
- [x] Dark/light theme with user preference

### API Routes (35+ endpoints)

| Route | Methods | Description |
|---|---|---|
| `/api/auth/strava` | GET | Redirect to Strava OAuth |
| `/api/auth/strava/callback` | GET | OAuth callback, JWT cookie |
| `/api/auth/me` | GET, DELETE | Current user / delete account |
| `/api/auth/logout` | POST | Clear session |
| `/api/bikes` | GET, POST | List/create bikes |
| `/api/bikes/[id]` | GET, PATCH, DELETE | Get/update/soft-delete bike |
| `/api/bikes/[id]/components` | GET, POST | List/create components |
| `/api/bikes/[id]/recalculate` | POST | Rebuild component kms |
| `/api/bikes/import` | POST | Import from Strava |
| `/api/components/[id]` | GET, PATCH, DELETE | Get/update/remove component |
| `/api/components/[id]/replace` | POST | Record replacement |
| `/api/components/[id]/charge` | POST | Mark battery charged |
| `/api/components/[id]/care` | POST | Mark care done |
| `/api/dashboard` | GET | Aggregated dashboard data |
| `/api/maintenance` | GET, POST | List/create maintenance events |
| `/api/maintenance/[id]` | PATCH, DELETE | Edit/delete maintenance |
| `/api/rides` | GET, POST | List rides / add manual ride |
| `/api/rides/[id]` | PATCH, DELETE | Update/delete ride |
| `/api/settings` | PATCH | Update user settings |
| `/api/sync` | POST | Fetch Strava activities |
| `/api/webhooks/strava` | GET, POST | Webhook verification + handler |
| `/api/cron/daily-check` | GET | Daily threshold check |

### Wear Engine

- **25 component types**: chain, cassette, chainrings, pedals, electronic shifting, brake pads/rotors (front/rear), tires (front/rear), bar tape, tubeless sealant, bottom bracket, cables & housing, fork service (lower/full), rear shock (service/full), dropper post, wheel bearings (front/rear), derailleur pulleys, hydraulic brake bleed, cleats, other
- **5 condition multipliers**: dry (1.0x), wet (+50%), muddy (+100%), dusty (+50%), winter (+150%)
- **4 trainer types**: wheel-on, direct-drive, rollers, smart bike
- **3 threshold types**: distance (km), time (hours), calendar (days)
- **Battery tracking**: charge reminders based on hours
- **Care tracking**: maintenance reminders (oil/clean/wax) with condition-triggered alerts

## Not Yet Implemented

- [ ] Email alert system (React Email templates, Resend, dedup)
- [ ] Free/Pro plan gating (Stripe checkout, webhooks, feature gates)
- [ ] Wear history chart (component detail page, requires charting library)
- [ ] Cost-per-km analytics dashboard
- [ ] Strava webhook registration (requires production URL)
- [ ] Vercel cron registration
- [ ] E2E tests (Playwright)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npx vitest run packages/core

# Database
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply migrations
npm run db:studio     # Open Drizzle Studio

# Build
npm run build
```

### Environment Variables

Copy `.env.example` to `.env.local` (in both root and `apps/web/`):

```
DATABASE_URL=postgresql://...
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
JWT_SECRET=...
CRON_SECRET=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```
