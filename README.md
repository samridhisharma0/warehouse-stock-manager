# Stockroom — 3-Tier Inventory & Fulfillment Console

A full-stack inventory operations app built for the developer assessment. It covers
authentication, inventory CRUD, safe order fulfillment, and a shipping rate/routing
engine.

- **Frontend:** React 18 + TypeScript + Vite + React Router
- **Backend:** Node.js + Express + TypeScript
- **Storage:** a small in-memory store persisted to a JSON file (see [Storage choice](#storage-choice))
- **Auth:** JWT (signed with `jsonwebtoken`) + `bcryptjs` password hashing

---

## Quick start

Requires **Node 18+** (developed on Node 22). No database or native build tools needed.

```bash
# from the repo root
npm install      # installs root + client + server (via postinstall)
npm run dev      # starts the API (http://localhost:4000) and the app (http://localhost:5173)
```

Then open **http://localhost:5173** and sign in with the seeded demo account:

```
email:    demo@example.com
password: password123
```

You can also register a fresh account from the UI.

### Running the two halves separately

If you prefer two terminals (or the combined command misbehaves on your shell):

```bash
# terminal 1
cd server && npm install && npm run dev

# terminal 2
cd client && npm install && npm run dev
```

The Vite dev server proxies `/api/*` to the backend, so no CORS configuration is
needed in development.

### Tests

```bash
npm test          # runs the backend logic tests (order fulfillment + shipping engine)
```

---

## Project structure

```
inventory-assessment/
├── shared/types.ts        # types shared by client & server (single API contract)
├── server/
│   └── src/
│       ├── index.ts       # Express app + bootstrap
│       ├── db/            # JSON-file store + seed data
│       ├── middleware/    # JWT auth guard + error handling
│       ├── routes/        # auth, products, orders, calculate-shipping
│       ├── logic/         # fulfillment + shipping engine (pure, unit-tested)
│       ├── config/        # env + shipping rate/vehicle config
│       └── tests/         # node:test unit tests for the hard logic
└── client/
    └── src/
        ├── context/       # AuthContext (persistent login) + ToastContext
        ├── components/    # ProtectedRoute, Layout, Modal
        ├── pages/         # Login, Register, Dashboard, Products, Orders, Shipping
        └── api/client.ts  # fetch wrapper that attaches the JWT
```

---

## What's implemented

### Tier 1 — Auth & inventory CRUD
- Register / login / logout / `me`, with passwords hashed via bcrypt.
- JWT issued on auth; protected API routes reject requests without a valid token.
- Frontend `AuthContext` + `<ProtectedRoute>`; the session **survives a page refresh**
  (the stored token is re-validated against `/api/auth/me` on load).
- Full product CRUD with client- and server-side validation.
- Dashboard highlighting low-stock and out-of-stock items; toast notifications for all
  success/error states.

### Tier 2 — Order fulfillment
- `POST /api/orders` fulfils an order line by line against live stock.
- **No overselling:** each deduction is a guarded atomic operation
  (`quantity >= requested`), mirroring the Mongo `findOneAndUpdate({ quantity: { $gte } })`
  pattern from the brief. Requests beyond available stock are **partially fulfilled** and
  the remainder **backordered** rather than rejected or oversold.
- Order status is derived as `Fulfilled` / `Partially Fulfilled` / `Pending`.
- UI to build multi-line orders and an order-history table showing the fulfilled vs
  backordered split per line.
- Covered by a test that fires a burst of concurrent orders and asserts stock never goes
  negative.

### Tier 3 — Rate & routing engine
- `POST /api/calculate-shipping` computes:
  - **Volumetric weight** = `(L × W × H) / 5000`, and **chargeable weight** =
    `max(actual, volumetric)`.
  - **Zone** from the destination pincode (first-two-digit mapping, remote fallback).
  - **Vehicle assignment:** the cheapest vehicle that fits; if the load exceeds the
    largest vehicle, it is split across N of them.
  - **Total cost** = `(vehicleCount × dispatch cost) + (chargeable weight × zone rate)`.
- Returns a step-by-step `breakdown` plus a human-readable `justification` string.
- UI calculator that can prefill dimensions from a product or take custom input, with a
  clear cost breakdown.
- Covered by unit tests (volumetric-wins, vehicle-selection boundaries, multi-vehicle
  split, invalid pincode).

---

## API reference

| Method | Endpoint                   | Auth | Purpose                            |
| ------ | -------------------------- | ---- | ---------------------------------- |
| POST   | `/api/auth/register`       | –    | Create account, returns JWT        |
| POST   | `/api/auth/login`          | –    | Sign in, returns JWT               |
| POST   | `/api/auth/logout`         | –    | Client-side token drop             |
| GET    | `/api/auth/me`             | ✓    | Validate token, return user        |
| GET    | `/api/products`            | ✓    | List products                      |
| POST   | `/api/products`            | ✓    | Create product                     |
| PUT    | `/api/products/:sku`       | ✓    | Update product                     |
| DELETE | `/api/products/:sku`       | ✓    | Delete product                     |
| GET    | `/api/orders`              | ✓    | Order history                      |
| POST   | `/api/orders`              | ✓    | Place order (partial + backorder)  |
| POST   | `/api/calculate-shipping`  | ✓    | Shipping quote + justification     |

---

## Storage choice

The brief suggests MongoDB or Postgres. I deliberately used a **small JSON-file-backed
store** instead so the app runs with a single `npm install` — no database server, no
connection string, and no native build step (a real consideration: `better-sqlite3`
failed to compile in a clean environment during development).

The store lives behind a narrow, repository-shaped interface in
`server/src/db/store.ts`. Swapping in Mongoose or Prisma means reimplementing that one
file; nothing in the routes or business logic changes. The concurrency guarantee is
explained inline there: because Node runs JS on a single thread and the critical
sections don't `await` mid-update, the guarded stock decrement is atomic with respect to
overlapping requests.

Data persists to `server/data/db.json` (git-ignored). Delete it to reset to seed data.

---

## Assumptions made

- **Volumetric divisor is 5000** (standard courier value), configurable in
  `server/src/config/shipping.ts`.
- **Zones and vehicle capacities/rates are illustrative static config** (documented in
  the same file). Pincode→zone matching uses the first two digits with a remote fallback.
- **Partial fulfillment does not block the rest of the order** — each line is fulfilled
  as far as stock allows; unmet quantity is backordered.
- **"Base Rate" in the cost formula** is interpreted as the chosen vehicle's flat
  dispatch cost, charged once per vehicle deployed.
- **Auth uses a Bearer token in `localStorage`** for reliability across environments. The
  security trade-off vs httpOnly cookies is noted below.
- Currency is INR for display purposes only.

---

## Future improvements

- Move to Postgres (Prisma) or MongoDB (Mongoose) using the existing store interface.
- Switch JWT to an **httpOnly, SameSite cookie** to remove the token from JS-reachable
  storage (localStorage is XSS-exposed); add refresh tokens + server-side revocation.
- Zod request validation and OpenAPI docs.
- More tests: HTTP-level integration tests (supertest) and React component tests.
- Real per-order concurrency in a multi-process deployment would use DB transactions or
  row locks; the current guard is correct for a single Node process.
- Pagination and server-side search for large inventories.
```
