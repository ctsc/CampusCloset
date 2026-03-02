# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CampusCloset is a student-focused secondhand clothing marketplace mobile app. Verified college students can buy, sell, and discover clothing within a trusted campus community. Targets iOS and Android from a single codebase, developed on Windows. Goal: deploy to both app stores for 1-2k users.

**Current state:** No source code exists yet. This file is the single source of truth for building the app.

## Tech Stack

- **Mobile App:** Expo SDK 52+ (React Native) + TypeScript
- **Navigation:** `@react-navigation/native` (stack + bottom tabs)
- **State:** React Query (TanStack Query) for server state, Zustand for UI state (auth, cart)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **Forms:** React Hook Form + Zod
- **Backend:** Supabase (PostgreSQL with RLS, Auth, Storage, Edge Functions in Deno)
- **Payments:** Stripe (Payment Sheet for buyers, Connect Express for seller payouts)
- **Auth:** Supabase Auth with .edu email restriction + email confirmation
- **Push:** Expo Push Notifications
- **Build/Deploy:** EAS Build (cloud iOS builds from Windows), EAS Submit, EAS Update
- **Monitoring:** Sentry (`sentry-expo`)

## GitHub Repository

**Remote:** https://github.com/ctsc/CampusCloset

**Branch strategy:** `main` is production. Feature work on `main` for solo dev, or short-lived feature branches if collaborating. Push after each completed phase.

**CI/CD (GitHub Actions):** `.github/workflows/ci.yml` runs on push/PR to `main`:
- Install dependencies
- TypeScript type check (`npx tsc --noEmit`)
- ESLint (`npx eslint .`)
- EAS builds remain manual (30/month budget — don't burn on CI)

### Git Push Checkpoints

Push to GitHub after completing each phase:

| When | Commit message pattern |
|------|----------------------|
| Sprint 0 Phase 1 complete | `feat: project scaffold with navigation, styling, state, env config` |
| Sprint 0 Phase 2 complete | `feat: EAS build pipeline validated (iOS + Android)` |
| Sprint 0 Phase 3 complete | `feat: Supabase schema, auth, RLS, storage, image upload` |
| Sprint 0 Phase 4 complete | `feat: auth screens, feed shell, profile shell` |
| Sprint 1 complete | `feat: listings, feed, filters, favorites, profiles` |
| Sprint 2 Phase 1 complete | `feat: Stripe spikes + transactions schema` |
| Sprint 2 Phase 2 complete | `feat: Stripe Connect + cart` |
| Sprint 2 Phase 3 complete | `feat: checkout, payments, orders` |
| Sprint 3 Phase 1 complete | `feat: reviews, ratings, reports, account deletion` |
| Sprint 3 Phase 2 complete | `feat: store prep, privacy policy, listings` |
| Sprint 3 Phase 3 complete | `release: v1.0.0 — store submission` |

## Development Commands

```bash
npx expo install                        # Install dependencies
npx expo start                          # Start dev server
npx expo start --ios                    # Run on iOS
npx expo start --android                # Run on Android
eas build --platform ios --profile preview    # EAS iOS build (30/month free tier)
eas build --platform android --profile preview
eas build --platform all --profile production
eas submit --platform ios               # Submit to App Store
eas submit --platform android           # Submit to Play Store
npx supabase db push                    # Apply migrations
npx supabase functions serve            # Run Edge Functions locally
npx supabase gen types typescript       # Generate DB types
npx eslint .                            # Lint
```

**EAS build budget:** 30 builds/month free (iOS + Android combined). Use Expo Go for daily dev. Reserve EAS builds for milestones. Stripe config plugin breaks Expo Go — Payment Sheet testing requires EAS development builds.

## Architecture

```
┌─────────────────────────────────┐
│  Expo App (React Native + TS)   │
│  Auth, Feed, Cart, Checkout,    │
│  Profiles, Favorites, Reviews   │
└──────────────┬──────────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────────┐
│  Supabase (BaaS)                 │
│  Auth (.edu)  │  PostgreSQL+RLS  │
│  Storage      │  Edge Functions  │
└───────────────┼──────────────────┘
                │
                ▼
       ┌────────────────┐
       │  Stripe        │
       │  Payments +    │
       │  Connect       │
       └────────────────┘
```

**Client → Supabase:** App calls Supabase directly via PostgREST for all CRUD. Auth via Supabase Auth SDK. Images via Supabase Storage. RLS on every table enforces access control.

**Edge Functions (server-side only, Deno):** Used only where client can't operate: Stripe webhooks (`payment_intent.succeeded`), Connect account creation, PaymentIntent creation (needs secret key), push notifications (needs Expo Push API), account deletion (needs admin API).

**Payment flow:** Client → Edge Function (`create-payment-intent`, verifies listing still active) → Stripe PaymentIntent with `transfer_data` + `application_fee` → Payment Sheet → Stripe webhook → Edge Function (`stripe-webhook`, uses service role) → creates order + marks listing sold + records `platform_fee`.

## App Structure

```
app/
  api/                  # Supabase client (api/supabase.ts) + typed query helpers
  components/           # Shared: ListingCard, UserAvatar, EmptyState, LoadingSkeleton, FormField
  screens/              # Screen-level components
  hooks/                # Custom React hooks
  store/                # Zustand stores (useAuthStore, useCartStore)
  utils/                # Utility functions
  constants/            # App constants and config
supabase/
  migrations/           # SQL migrations (source of truth for schema)
  functions/            # Edge Functions
```

## Critical Design Constraints

These are non-negotiable for V1:

- **Single-seller cart only.** Cart limited to items from one seller. Multi-seller is V2.
- **RLS on every table from day one.** Supabase exposes PostgREST to client — without RLS, any authenticated user can read/write any row.
- **Account deletion required.** Apple mandates this for App Store approval. Edge Function must cascade-delete all user data.
- **.edu verification is intentionally broad.** Client-side regex + optional server-side trigger. Accepts all .edu (alumni, staff included for V1).
- **Stripe Payment Sheet (not IAP)** for physical goods — App Store compliant.
- **No staging environment.** Single Supabase project. Stripe Test Mode for dev, Live Mode for production.
- **Listing-active check at checkout.** `create-payment-intent` must verify listing is still `active` before creating PaymentIntent.
- **Clear cart on logout.** Prevents cross-user cart leakage with Zustand + AsyncStorage.
- **Stripe Connect decision gate:** If Express onboarding doesn't work by Sprint 2 day 2 (Spike S2), fall back to simple Stripe Checkout + manual seller payouts.

## Database Schema

### Migration 001 — Sprint 0 (profiles, listings, listing_images, favorites)

```sql
-- profiles: auto-created via trigger on auth.users insert
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  university TEXT,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES profiles NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  size TEXT,
  condition TEXT NOT NULL CHECK (condition IN ('new','like_new','good','fair')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles NOT NULL,
  listing_id UUID REFERENCES listings NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Profile trigger: auto-create on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**RLS Policies (Sprint 0):**
- `profiles`: SELECT any authenticated. UPDATE own row only (`auth.uid() = id`). INSERT via trigger.
- `listings`: SELECT active for any authenticated. INSERT/UPDATE/DELETE by seller only (`auth.uid() = seller_id`).
- `listing_images`: Same as parent listing — seller manages, anyone reads.
- `favorites`: SELECT/INSERT/DELETE own rows only (`auth.uid() = user_id`).

### Migration 002 — Sprint 2 (orders, seller_stripe_accounts)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES profiles NOT NULL,
  seller_id UUID REFERENCES profiles NOT NULL,
  listing_id UUID REFERENCES listings NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE seller_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles UNIQUE NOT NULL,
  stripe_account_id TEXT NOT NULL,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS:** `orders` readable by buyer or seller. Insert via service role only (webhook). `seller_stripe_accounts` readable by own user. Insert/update via service role.

### Migration 003 — Sprint 3 (reviews, reports, seller_ratings_view)

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders UNIQUE NOT NULL,
  reviewer_id UUID REFERENCES profiles NOT NULL,
  reviewee_id UUID REFERENCES profiles NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES profiles NOT NULL,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('listing','user')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE VIEW seller_ratings_view AS
SELECT
  reviewee_id AS seller_id,
  AVG(rating)::DECIMAL(2,1) AS avg_rating,
  COUNT(*) AS review_count,
  (AVG(rating) >= 4.0 AND COUNT(*) >= 3) AS has_trust_badge
FROM reviews
GROUP BY reviewee_id;
```

**RLS:** Reviews readable by all authenticated. Insert by buyer of delivered order only. Reports insertable by any authenticated user.

### Storage Buckets

- `listing-images`: public read, authenticated upload to `{user_id}/{listing_id}/*`
- `avatars`: public read, authenticated upload to `{user_id}/*`

### Edge Functions

| Function | Purpose |
|----------|---------|
| `create-connect-account` | Creates Stripe Express account, returns onboarding URL |
| `check-connect-status` | Verifies Connect account onboarding status via Stripe API |
| `create-payment-intent` | Verifies listing active + seller has Connect, creates PaymentIntent with `transfer_data` + `application_fee`, returns clientSecret |
| `stripe-webhook` | Handles `payment_intent.succeeded`, creates order, marks listing sold. Verifies Stripe signature. Uses service role. Idempotent via UNIQUE constraint. |
| `send-push-notification` | Accepts user_id + message, looks up push token, sends via Expo Push API |
| `delete-account` | Cascade-deletes all user data + auth record via admin API (Apple requirement) |

---

## Sprint Plan

### Sprint 0: Foundation (32 points)

**Goal:** "A developer can build the app on iOS and Android from Windows, sign up with a .edu email, and see an empty feed screen."

#### Phase 1 — Scaffold (start immediately)

| Task | Description | Depends On |
|------|-------------|------------|
| T-0.01 | Init Expo project with TypeScript. `app.config.ts` with name "CampusCloset", slug, bundle ID `com.campuscloset.app`. Strict mode. | — |
| T-0.02 | React Navigation: 5-tab bottom nav (Home, Search, Sell, Favorites, Profile) + stack navigators per tab + auth/main routing | T-0.01 |
| T-0.03 | NativeWind: install + `tailwind.config.js` + Babel preset + verify rendering | T-0.01 |
| T-0.04 | React Query: `QueryClientProvider` at root, `staleTime: 60_000`, `retry: 2` | T-0.01 |
| T-0.05 | Zustand: `useAuthStore` (session), `useCartStore` (items + AsyncStorage persist). Cart clears on logout. | T-0.01 |
| T-0.06 | ESLint + `.gitignore` (node_modules, .expo, build artifacts, .env files) | T-0.01 |
| T-0.07 | Stripe plugin: `@stripe/stripe-react-native` + `expo-stripe-config` in `app.config.ts`. Publishable key from env var. | T-0.01 |
| T-0.26 | Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY` in `app.config.ts`. `.env.example`. EAS env config. No secrets in client. | T-0.01 |
| T-0.27 | Git init + GitHub remote: `git init`, initial commit, `git remote add origin https://github.com/ctsc/CampusCloset.git`, push to `main` | T-0.06 |
| T-0.28 | GitHub Actions CI: `.github/workflows/ci.yml` — on push/PR: install deps, `tsc --noEmit`, `eslint .` | T-0.27 |

*T-0.02 through T-0.26 can run in parallel after T-0.01. T-0.27 + T-0.28 run last in Phase 1.*

#### Phase 2 — EAS Build Validation

| Task | Description | Depends On |
|------|-------------|------------|
| T-0.08 | EAS pipeline: `eas init`, `eas.json` with development/preview/production profiles, keystore + credentials | T-0.01, T-0.07 |
| T-0.09 | EAS Android build validation: `eas build --platform android --profile preview`, install APK, verify launch | T-0.08 |
| T-0.10 | EAS iOS build + TestFlight: `eas build --platform ios --profile preview`, `eas submit`, install via TestFlight | T-0.08 |

#### Phase 3 — Backend Setup

| Task | Description | Depends On |
|------|-------------|------------|
| T-0.11 | Init Supabase: `npx supabase init`, link to remote project, create folder structure | Supabase project exists |
| T-0.12 | Migration 001: create profiles, listings, listing_images, favorites with RLS enabled | T-0.11 |
| T-0.14 | Configure Supabase Auth: email/password, email confirmation, SMTP | T-0.11 |
| T-0.15 | .edu restriction: client-side regex `/@.+\.edu$/i` + server-side trigger/Edge Function | T-0.14 |
| T-0.16 | Profile auto-creation trigger: `auth.users` INSERT → `profiles` row with UUID + full_name from metadata | T-0.12, T-0.14 |
| T-0.13 | RLS policies for all 4 tables. Test with two auth tokens — authorized access works, unauthorized denied. | T-0.12, T-0.15 |
| T-0.24 | Storage buckets: `listing-images` + `avatars` with public read, authenticated upload policies | T-0.11 |
| T-0.25 | Image upload utility: `expo-image-picker` → `expo-image-manipulator` (800px, JPEG 80%) → Supabase Storage → public URL | T-0.24 |

*Phase 2 and Phase 3 can run in parallel.*

#### Phase 4 — Auth Screens + Shell

| Task | Description | Depends On |
|------|-------------|------------|
| T-0.17 | Supabase client: `api/supabase.ts` with `expo-secure-store`/AsyncStorage adapter. URL + anon key from env vars. | T-0.01, T-0.11 |
| T-0.18 | Sign Up screen: email (.edu validation), password (min 8), full name, university. React Hook Form + Zod. Shows "Check email" on success. | T-0.17, T-0.15 |
| T-0.19 | Login screen: email + password. "Resend confirmation" on unconfirmed email error. "Forgot Password?" link. | T-0.17 |
| T-0.20 | Forgot Password screen: email input → `supabase.auth.resetPasswordForEmail()` → confirmation message | T-0.17 |
| T-0.21 | Auth state persistence: `getSession()` on launch, `onAuthStateChange()` listener, Zustand auth store, auto-routing | T-0.05, T-0.17, T-0.02 |
| T-0.22 | Empty feed shell: "No listings yet" empty state + CTA to Sell tab + pull-to-refresh + loading skeleton | T-0.02 |
| T-0.23 | Profile shell: fetch + display own profile, avatar placeholder, logout button (clears stores, navigates to login) | T-0.17, T-0.02, T-0.16 |

**Sprint 0 Done When:**
- App builds on iOS (TestFlight) and Android (APK) from Windows via EAS
- Sign up with .edu email, confirm via email link, log in
- Login failure shows resend-confirmation option
- Logged-in user sees tab navigator with empty feed and profile
- All 4 tables exist with RLS enabled and tested
- Image upload utility works end-to-end

---

### Sprint 1: Core Marketplace (24 points)

**Goal:** "A student can list an item with photos and another student can browse, filter, and favorite it."

| Task | Description | Depends On |
|------|-------------|------------|
| T-1.13 | Data query helpers: `api/listings.ts`, `api/favorites.ts`, `api/profiles.ts` — typed CRUD helpers with Supabase queries, joins, pagination, error handling | T-0.17, T-0.12 |
| T-1.05 | `ListingCard` component: cover image, title, price ($X.XX), condition badge, seller username. Tap → detail screen. Image cached. | — |
| T-1.01 | Listing creation form (Sell tab): title (max 100), description (max 500), price (min $1), category picker (Tops/Bottoms/Dresses/Shoes/Accessories/Other), size picker, condition picker (New/Like New/Good/Fair). React Hook Form + Zod. | Sprint 0 |
| T-1.02 | Multi-image picker: up to 5 photos from camera/library via `expo-image-picker`. Thumbnails with delete (X). First = cover. Compressed via T-0.25. | T-0.25, T-1.01 |
| T-1.03 | Listing creation API: upload images to `listing-images/{user_id}/{listing_id}/`, insert listing + listing_images rows. Progress indicator. Success toast → detail page. | T-1.01, T-1.02 |
| T-1.04 | Feed screen (Home tab): `FlatList` of active listings by `created_at DESC`. Joined with first image + seller username. Pagination (20/page) + infinite scroll. Pull-to-refresh. Loading skeleton. Empty state. | T-0.12, T-0.17 |
| T-1.06 | Listing detail: image carousel with dots, all fields, seller info (tap → profile). Own listings: Edit + Delete (soft-delete to 'archived'). "Add to Cart" placeholder. Share button. | T-1.03 or T-1.04 |
| T-1.07 | Listing edit: pre-fill creation form with existing data. Edit all fields + photos. Save updates to DB. | T-1.01, T-1.06 |
| T-1.08 | Category filter + sort (Search tab or feed top): horizontal scrollable category chips (single-select). Sort dropdown: Newest / Price Low→High / Price High→Low. Applied as Supabase query params. | T-1.04 |
| T-1.09 | Favorites: heart toggle on cards + detail. Optimistic insert/delete on `favorites` table with rollback. Favorites tab with grid/list. Empty state. React Query cache invalidation. | T-0.12, T-1.05 |
| T-1.10 | Profile view: avatar, name, username, university, bio, member since, "My Listings" section, "Edit Profile" button | T-0.23 |
| T-1.11 | Profile edit: avatar picker (uploads to `avatars/{user_id}/`), full name, username (unique check), bio (max 200). Save to `profiles`. | T-1.10, T-0.25 |
| T-1.12 | Other user's profile: public view from listing detail → seller info tap. Shows info + active listings. No edit/logout. | T-1.06, T-1.10 |

**Sprint 1 Done When:**
- Seller can create listing with up to 5 photos, appears in feed
- Buyer can browse, filter by category, sort by price/date
- Buyer can favorite/unfavorite and view favorites tab
- Users can view/edit own profile including avatar
- Users can view other profiles from listing detail

---

### Sprint 2: Transactions (29 points)

**Goal:** "A student can buy an item, the seller gets paid via Stripe, and both see the order in their history."

#### Phase 1 — Spikes + Schema (first 2 days)

| Task | Description | Depends On |
|------|-------------|------------|
| T-2.01 | **Spike S2 — Stripe Connect (4hr hard cap, DECISION GATE).** Create Express account, onboard, test payment with transfer. If fails by day 2: switch to simple Checkout + manual payouts. | — |
| T-2.02 | **Spike S7 — Payment Sheet (2hr hard cap).** Create PaymentIntent via test Edge Function, present Payment Sheet in EAS dev build. | T-0.07 |
| T-2.03 | Migration 002: create orders + seller_stripe_accounts tables with RLS | T-0.12 |

#### Phase 2 — Stripe Connect + Cart

| Task | Description | Depends On |
|------|-------------|------------|
| T-2.04 | Edge Function `create-connect-account`: auth check, create Express account, generate onboarding link, insert `seller_stripe_accounts` row, return URL | T-2.01 (GO), T-2.03 |
| T-2.05 | Edge Function `check-connect-status`: fetch status from Stripe API, update `onboarding_complete` | T-2.04 |
| T-2.06 | Seller onboarding UI: "Set up payouts" button → call Edge Function → open URL in `expo-web-browser` → check status on return → "Payouts enabled" badge | T-2.04, T-2.05 |
| T-2.07 | Cart: Zustand store + screen. Add to Cart on detail. "In Cart" disabled state. Header icon with badge. Remove button. Total. Checkout button. Single-seller enforcement. Clear on logout. Empty state. | T-0.05, T-1.06 |

#### Phase 3 — Checkout + Orders

| Task | Description | Depends On |
|------|-------------|------------|
| T-2.08 | Edge Function `create-payment-intent`: verify listing active, verify seller Connect complete, create PaymentIntent with `transfer_data` + `application_fee_amount` (5%), return clientSecret + ephemeralKey | T-2.01, T-2.03 |
| T-2.09 | Checkout screen: order summary, Pay button → `create-payment-intent` → `initPaymentSheet()` + `presentPaymentSheet()`. Success/failure/cancel handling. Disable button on tap. Clear cart on success. | T-2.07, T-2.08, T-2.02 |
| T-2.10 | Edge Function `stripe-webhook`: verify signature, handle `payment_intent.succeeded`, create order row, update listing to 'sold', record platform_fee. Idempotent via UNIQUE constraint. Service role. | T-2.08, T-2.03 |
| T-2.11 | Order history: Purchase History + Sales History on profile. Order detail with full info + status badges. `api/orders.ts` helpers. | T-2.10 |
| T-2.12 | Seller order status update: paid → shipped → delivered buttons on order detail (seller view). Confirmation dialog. | T-2.11 |

**Sprint 2 Done When:**
- Seller can connect bank account via Stripe Express
- Buyer can add items to single-seller cart, checkout, pay via Payment Sheet
- On payment success, order created via webhook, listing marked sold
- Both buyer and seller see order in history
- Seller can update order status
- All payment flows tested in Stripe Test Mode end-to-end
- Cart cleared on logout

---

### Sprint 3: Trust, Polish & Launch (33 points, cut to ~29)

**Goal:** "App is polished with reviews, push notifications, content moderation, and submitted to both app stores."

#### Phase 1 — Features (week 1)

| Task | Description | Depends On |
|------|-------------|------------|
| T-3.01 | Migration 003: create reviews, reports, seller_ratings_view | T-2.03 |
| T-3.02 | Review submission: on delivered orders without review, show star rating (1-5) + optional comment (max 300). Insert to `reviews`. One per order. | T-3.01, T-2.11 |
| T-3.03 | Ratings display on profiles: avg star rating, count, review list (username, stars, comment, date) from `seller_ratings_view` | T-3.01, T-3.02 |
| T-3.04 | Ratings on listing cards + detail: small star + number next to seller username | T-3.01 |
| T-3.05 | **Trust badge (CUT CANDIDATE):** shield icon if `has_trust_badge = true` (avg >= 4.0, count >= 3). On profiles, cards, detail. Tooltip on tap. | T-3.03 |
| T-3.06 | Report button: on listings + profiles. Modal with reason picker (Inappropriate/Fraudulent/Spam/Offensive/Other). Insert to `reports`. Confirmation. | T-3.01 |
| T-3.07 | Account deletion (Apple requirement): "Delete my account" in settings → confirmation → Edge Function `delete-account` → cascade delete all data + auth record → navigate to login | T-0.17 |
| T-3.08 | **Spike S6 — Push notifications (2hr cap, CUT CANDIDATE).** Register Expo push token, store in DB, send test from Edge Function. | — |
| T-3.09 | **Push integration (CUT CANDIDATE):** request permissions on login, store token, `send-push-notification` Edge Function, trigger on order creation + status change, tap opens order detail | T-3.08, T-2.10 |
| T-3.10 | **Sentry (CUT CANDIDATE):** install `sentry-expo`, configure DSN, test error, source maps for EAS | T-0.01 |
| T-3.13 | App icon (1024x1024 PNG, no alpha) + splash screen in `app.config.ts` | — |

#### Phase 2 — Store Prep (parallel with Phase 1)

| Task | Description | Depends On |
|------|-------------|------------|
| T-3.14 | Privacy policy + terms of service: write, host as static pages (GitHub Pages), link in app + store listings | — |
| T-3.11 | App Store listing: name, subtitle, description, keywords, category (Shopping), age 12+, screenshots (6.5" + 5.5", 3+ each), privacy policy URL | T-3.14 |
| T-3.12 | Google Play listing: title, descriptions, screenshots, feature graphic (1024x500), content rating, privacy policy URL | T-3.14 |

#### Phase 3 — Test, Fix, Ship (week 2)

| Task | Description | Depends On |
|------|-------------|------------|
| T-3.15 | E2E testing: full flow on both platforms. Sign up → Browse → List → Cart → Checkout → Pay → Order → Deliver → Review. Edge cases: empty states, network errors, back nav, long text. Log all bugs. | All features |
| T-3.16 | P0 + P1 bug fixes. P2 logged for V2. | T-3.15 |
| T-3.17 | Production EAS build: version 1.0.0, `eas build --platform all --profile production` | T-3.16 |
| T-3.18 | Store submission: `eas submit` to both stores | T-3.17, T-3.11, T-3.12 |
| T-3.19 | Handle rejections + resubmit (if needed). Common: missing privacy policy, account deletion, content moderation evidence. | T-3.18 |

**Sprint 3 Cut Candidates (in priority order if over capacity):**
1. T-3.05 (Trust Badge) → V1.1 OTA
2. T-3.09 (Push Notifications) → V1.1 OTA
3. T-3.10 (Sentry) → V1.1 OTA

---

## Manual Tasks (Human-Required)

These cannot be automated and must be done by a team member at specific points.

### Pre-Sprint 0 (before any code)

| Task | What | Blocks |
|------|------|--------|
| **M-0.01** | Create Apple Developer Account ($99/yr). Verification takes 24-48hrs. | All iOS builds |
| **M-0.02** | Create Google Play Developer Account ($25 one-time). | Play Store listing |
| **M-0.03** | Create Supabase project. Note project URL, anon key, service role key. | All backend tasks |
| **M-0.04** | Create Stripe account + enable Connect. Test Mode keys. | Stripe plugin + Sprint 2 |
| **M-0.05** | Confirm physical device availability (iPhone iOS 15+, Android API 23+). | TestFlight testing |
| **M-0.06** | Create rough UI wireframes for core screens. | Helpful for all frontend |
| **M-0.07** | Set team conventions (branch naming, PR process, comms). | Helpful for collaboration |

### Sprint 0

| Task | What | Blocks |
|------|------|--------|
| **M-0.08** | Configure SMTP for auth emails in Supabase dashboard. Built-in = 4 emails/hr. | Auth confirmation |
| **M-0.09** | Create Storage buckets (`listing-images`, `avatars`) via dashboard. | Image upload |
| **M-0.10** | Provide Apple Developer credentials to EAS (Apple ID, app-specific password). | iOS build |
| **M-0.11** | Install TestFlight on iOS device. | iOS testing |

### Sprint 2

| Task | What | Blocks |
|------|------|--------|
| **M-2.01** | Configure Stripe webhook endpoint in dashboard. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`. Add signing secret to Edge Function env. | Order creation |
| **M-2.02** | Test Stripe Connect end-to-end manually in Test Mode. | Verification |
| **M-2.03** | **Stripe Connect decision gate:** GO or FALLBACK after Spike S2. Document decision. | Sprint 2 scope |

### Sprint 3

| Task | What | Blocks |
|------|------|--------|
| **M-3.01** | Write privacy policy (data collected, third parties: Stripe/Supabase, deletion rights). | Store listings |
| **M-3.02** | Write terms of service (eligibility, acceptable use, prohibited items, disputes). | Store listings |
| **M-3.03** | Host privacy policy + ToS as static pages (GitHub Pages). Stable URLs. | App + store links |
| **M-3.04** | iOS screenshots (1284x2778 + 1242x2208, 3+ each). Realistic data, no debug banners. | App Store listing |
| **M-3.05** | Android screenshots + feature graphic (1024x500). | Play Store listing |
| **M-3.06** | Write app store descriptions, keywords, category (Shopping), age 12+. | Store listings |
| **M-3.07** | Design app icon (1024x1024 PNG, no alpha, readable at 60x60). | App icon |
| **M-3.08** | Switch Stripe to Live Mode. Update keys + webhook secret in env. Verify account fully verified. | Production build |
| **M-3.09** | Handle Apple review response (1-3 day cycle). | App Store approval |
| **M-3.10** | Handle Google Play review response. | Play Store approval |

### Ongoing

| Task | What |
|------|------|
| **M-X.01** | Monitor Supabase usage (1GB storage free tier, API counts). Check each sprint. |
| **M-X.02** | Monitor EAS build count (30/month). Plan builds strategically. |
| **M-X.03** | Seed test data: 2-3 .edu accounts, 5+ listings with photos. |

---

## V2 Features (NOT in V1)

1. Point system / promotions
2. Analytics / recommendation engine
3. Admin/moderator dashboard (web-based)
4. In-app messaging / chat
5. SheerID student verification
6. Advanced search (full-text via tsvector)
7. Multi-seller cart
8. Social features (comments, likes)
9. Full filter panel (text search, multi-select, price range)
