# Stripe Setup for CampusCloset

## 1. Create a Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up with your email
3. You do **not** need to activate your account (complete business verification) for development — Test Mode works immediately

## 2. Get Your Test Mode Keys

1. In the Stripe Dashboard, make sure **Test Mode** is toggled ON (top-right toggle)
2. Go to **Developers → API keys**
3. Copy these two keys:
   - **Publishable key** — starts with `pk_test_...`
   - **Secret key** — starts with `sk_test_...`

### Where they go in this project

| Key | Where | Used By |
|-----|-------|---------|
| `pk_test_...` (Publishable) | `.env` → `STRIPE_PUBLISHABLE_KEY` | Mobile app (Payment Sheet) |
| `sk_test_...` (Secret) | Supabase Edge Function secrets | Server-side only (create PaymentIntent, webhooks) |

Update your `.env` file:
```
STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
```

> **Never put the secret key in `.env` or client code.** It goes in Supabase Edge Function secrets (see step 5).

## 3. Enable Stripe Connect

CampusCloset uses **Connect Express** with the **Platform** model — sellers collect payments directly, and you take an application fee on each transaction. You never hold the money yourself.

1. Go to **Settings → Connect** (or search "Connect" in dashboard)
2. Click **Get started with Connect**
3. Choose **Platform** (buyers pay sellers directly, you collect an application fee)
4. For onboarding type, select **Express**
5. Under branding, set:
   - Platform name: `CampusCloset`
   - Icon: your app icon (optional for test mode)

## 4. Set Up a Webhook Endpoint

Webhooks let Stripe notify your backend when payments succeed.

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Set the URL to your Supabase Edge Function URL:
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```
   (Replace `your-project` with your actual Supabase project ID)
4. Select these events:
   - `payment_intent.succeeded`
   - `account.updated` (for Connect account status changes)
5. Click **Add endpoint**
6. Copy the **Webhook signing secret** — starts with `whsec_...`

## 5. Add Secrets to Supabase Edge Functions

In your Supabase dashboard or CLI, set these secrets for Edge Functions:

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_your-secret-key
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

## 6. Test Cards

Stripe provides test card numbers — no real charges:

| Card Number | Result |
|------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 3220` | Requires 3D Secure |
| `4000 0000 0000 9995` | Declined |

Use any future expiry date, any 3-digit CVC, any ZIP code.

## 7. Going Live

When ready for production:

1. Complete Stripe account activation (business verification)
2. Toggle **off** Test Mode in the dashboard
3. Get your **live** keys (`pk_live_...` and `sk_live_...`)
4. Create a **live** webhook endpoint pointing to the same Edge Function URL
5. Replace all test keys with live keys in `.env` and Supabase secrets
6. The Stripe React Native plugin in `app.config.ts` works with both test and live keys — no code changes needed

## Summary of All Stripe Values You'll Need

| Value | Starts With | Where to Put It |
|-------|------------|-----------------|
| Publishable key | `pk_test_` | `.env` → `STRIPE_PUBLISHABLE_KEY` |
| Secret key | `sk_test_` | Supabase secrets → `STRIPE_SECRET_KEY` |
| Webhook secret | `whsec_` | Supabase secrets → `STRIPE_WEBHOOK_SECRET` |
| Merchant ID | `merchant.com.campuscloset.app` | Already in `app.config.ts` |
