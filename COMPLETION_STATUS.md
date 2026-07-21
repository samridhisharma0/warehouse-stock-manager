# Completion Status

This maps the original `developer_assessment_execution_plan.md` to what is actually
implemented in this codebase. **All three tiers are complete and working.** Git and
deployment (Phase 4's deploy steps) were intentionally skipped per instruction — the
README (setup, assumptions, future improvements) is done.

Legend: ✅ done · 🔁 done differently (explained) · ⏭️ intentionally skipped

---

## Tech Stack & Architecture
- ✅ Frontend: React + Vite + TypeScript
- ✅ Backend: Node + Express + TypeScript
- 🔁 Database: **JSON-file-backed store** instead of Mongo/Postgres, behind a swappable
  repository interface. Reason: zero-setup, no native build step (`better-sqlite3`
  wouldn't compile in a clean env). See README → *Storage choice*.
- 🔁 Auth: JWT + bcrypt as specified, but token stored in **localStorage (Bearer)** rather
  than an httpOnly cookie, for cross-environment reliability. Trade-off documented.
- ⏭️ Deployment targets (Vercel/Render/Atlas) — left for you to do.

## Phase 0 — Project Setup & Git Hygiene
- 🔁 Monorepo structure (`/client`, `/server`, plus `/shared`). ✅
- ⏭️ Git init / commits — you'll handle.
- ✅ Shared types folder (`/shared/types.ts`) used by both sides.
- 🔁 ESLint/Prettier not wired as separate tooling, but the whole codebase compiles under
  **strict TypeScript** (client and server both typecheck clean) and is consistently
  formatted.

## Phase 1 — Tier 1: Foundation (Auth & Inventory CRUD) ✅
Backend
- ✅ `User` (email unique, passwordHash) and `Product` (sku unique, name, quantity,
  category, lowStockThreshold — plus optional dimensions for Tier 3) models.
- ✅ `POST /api/auth/register` (bcrypt hash + JWT), `POST /api/auth/login`,
  `POST /api/auth/logout`, `GET /api/auth/me`.
- ✅ Protected inventory API: `GET/POST /api/products`, `PUT/DELETE /api/products/:sku`,
  behind JWT auth middleware.

Frontend
- ✅ `AuthContext` with `user` / `isAuthenticated` / `isLoading`.
- ✅ Public routes `/login`, `/register`; `<ProtectedRoute>` redirects; protected
  `/dashboard`, `/products`, `/orders`, `/shipping`.
- ✅ Dashboard shows low-stock (`quantity <= lowStockThreshold`) and out-of-stock items.
- ✅ Reusable create/edit product form with client-side validation (no negatives, etc.).
- ✅ Toast notifications for success/error; loading states throughout.

## Phase 2 — Tier 2: Logic (Order Fulfillment) ✅
Backend
- ✅ `Order` model with per-line `requestedQty` / `fulfilledQty` / `backorderedQty` and
  `status` (Fulfilled / Partially Fulfilled / Pending).
- ✅ Atomic, guarded stock deduction (`quantity >= requested`) — never oversells; the
  same conditional-update pattern the brief shows for Mongo. Documented concurrency
  reasoning in `server/src/db/store.ts` and `logic/fulfillment.ts`.
- ✅ Partial fulfillment + backorder calculation exactly as specified.
- ✅ Unit test fires a burst of concurrent orders and asserts stock never goes negative.

Frontend
- ✅ Multi-line order creation UI (pick products, set quantities).
- ✅ Order history table showing fulfilled vs backordered per line.

## Phase 3 — Tier 3: Hard (Rate & Routing Engine) ✅
Backend
- ✅ Static config: zone-rate matrix (by pincode prefix) + vehicle capacity limits.
- ✅ Volumetric weight `(L×W×H)/5000`; chargeable = `max(actual, volumetric)`.
- ✅ Constraint-satisfaction engine: zone lookup → total chargeable weight → cheapest
  vehicle that fits, or split into N of the largest vehicle → final cost.
- ✅ `POST /api/calculate-shipping` returns chosen vehicle(s), total cost, a structured
  `breakdown`, and a `justification` string.
- ✅ Unit tests for volumetric-wins, vehicle boundaries, multi-vehicle split, bad pincode.

Frontend
- ✅ Shipping calculator: add items (prefill from a product or custom), enter pincode,
  see the full cost breakdown and justification.

## Phase 4 — Final Polish & Deployment
- ⏭️ Deployment — left for you.
- ✅ README with setup steps, `.env` template (`server/.env.example`), assumptions, and
  future improvements.
- ✅ Final bug checks from the brief:
  - ✅ Signing up with an existing email returns a clear `409` error.
  - ✅ App survives a page refresh without logging out (token re-validated on load).
  - ✅ TypeScript is strict and clean on both client and server.

---

## How it was verified
- Backend: 11 unit tests pass (`npm test`).
- Manual/HTTP smoke tests confirmed: auth guard (401), duplicate register (409), bad
  login (401), partial order fulfillment + stock deduction, and shipping math
  (e.g. 2×max(2kg, 12kg vol) = 24kg → Van → INR 1020).
- Client builds clean under strict TS; full stack verified through the Vite dev proxy
  (HTML served, `/api/*` proxied, login round-trip works).
