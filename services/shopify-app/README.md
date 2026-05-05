# Shopify App Backend

Node.js + Express backend for Shopify installation, storefront attribution, hybrid order attribution, and commission calculation.

## Canonical Reference

For the cross-system implementation view, current user-flow mapping, and contradiction list, use:

- [`IMPLEMENTATION.md`](/Users/sam/Documents/Projects/atribe/IMPLEMENTATION.md)

This README is service-local. If it disagrees with exercised code paths or `IMPLEMENTATION.md`, runtime code wins.

## Core routes

- `GET /`
- `GET /health`
- `GET /auth?shop={shop}.myshopify.com`
- `GET /auth/callback`
- `POST /links/create`
- `GET /r/:creator_id/:link_id`
- `GET /u/:user_id/route?url={encoded_url}`
- `GET /storefront/atribe.js`
- `POST /webhooks/orders_create`
- `POST /webhooks/orders_paid`
- `POST /webhooks/orders_cancelled`
- `POST /webhooks/refunds_create`
- `POST /webhooks/app_uninstalled`
- `POST /webhooks/customers_data_request`
- `POST /webhooks/customers_redact`
- `POST /webhooks/shop_redact`

## Dashboard API routes

- `GET /creator/links?creator_id={creator_id}`
- `GET /creator/earnings?creator_id={creator_id}`
- `GET /creator/orders?creator_id={creator_id}`
- `GET /creator/brands?creator_id={creator_id}`
- `POST /creator/brands`
- `PATCH /creator/brands/:id`
- `DELETE /creator/brands/:id`
- `GET /brand/shopify/install-status?brand_id={brand_id}|shop_domain={shop_domain}`
- `GET /brand/orders?brand_id={brand_id}`
- `GET /brand/commissions?brand_id={brand_id}`
- `GET /brand/creators?brand_id={brand_id}`
- `GET /brand/clicks?brand_id={brand_id}|shop_domain={shop_domain}`
- `POST /brand/campaigns`

Creator and brand endpoints are wrapped in a minimal auth layer:

- optional bearer token parsing
- Supabase user lookup in `DB_PROVIDER=supabase`
- creator ownership checks on creator-scoped endpoints
- dev bypass outside production

Runtime implementation:

- `src/routes/dashboard-routes.js`
- `src/middleware/auth-context.js`

## Dev-only debug routes

These routes are only mounted when `NODE_ENV !== production`.

- `GET /debug/shops`
- `GET /debug/clicks/latest`
- `GET /debug/links/latest`
- `GET /debug/orders/latest`
- `GET /debug/attribution/latest`
- `GET /debug/storefront-script`
- `GET /debug/shopify-install-status`
- `GET /debug/user-creator-weights?user_id={user_id}`
- `GET /debug/user-route-clicks/latest`
- `GET /debug/user-value-distribution?user_id={user_id}`
- `GET /debug/snapshot/{snapshot_id}`

## Local run

1. Copy `.env.example` to `.env`
2. Set:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SHOPIFY_APP_URL`
   - `SHOPIFY_CALLBACK_URL`
   - `ATRIBE_BASE_URL`
3. Install dependencies from the repo root:
   - `npm install`
4. Start the backend:
   - `npm --workspace @atribe/shopify-app run dev`

## Required scopes

Current required scopes:

- `read_products`
- `read_orders`
- `read_script_tags`
- `write_script_tags`

The live storefront path should use the theme app embed. ScriptTag registration remains available as a fallback.

## Attribution priority

Order attribution resolves in this order:

1. `click_id`
2. cart/order attributes:
   - `atribe_user`
   - `atribe_click`
   - `atribe_snapshot`
   - `atribe_creator`
3. creator coupon code
4. legacy `atribe_ref`

Coupon code format:

- `CREATOR_{creator_id}`

## Supporter routing

`GET /u/:user_id/route` is the canonical supporter router.

For external URLs it:

- filters to eligible selected creators for the destination domain
- chooses one creator using backend selection logic
- stores a click row and immutable snapshot
- redirects to the final URL with attribution params

For Atribe-controlled Shopify shops it:

- filters supporter creators by active creator↔shop links
- stores an immutable Shopify snapshot
- normalizes split weights inside the eligible set
- uses house fallback when no eligible creators exist for the shop

Runtime implementation:

- `src/routes/redirect-routes.js`
- `src/services/link-service.js`
- `src/services/external-selection-service.js`

The mobile app and extension now route through this backend path instead of performing client-side affiliate rewriting.

## Theme app embed

Preferred storefront injection path:

- Extension directory: `extensions/atribe-theme-extension`
- Embed block: `blocks/atribe-app-embed.liquid`
- Asset: `assets/atribe-app-embed.js`

After deploying the app version that contains the extension, enable it from:

- `Online Store -> Themes -> Customize -> App embeds -> Atribe Attribution`

## Final install flow

This app now supports the custom install entry flow used by Shopify Dev Dashboard custom distribution.

Flow:

1. Merchant opens the custom install link from Shopify Dev Dashboard
2. Shopify opens the app URL with `shop=...`
3. If the shop is not installed yet, the backend auto-redirects to `/auth?shop=...`
4. OAuth callback stores the offline token
5. Backend registers supported webhooks
6. Backend registers the legacy ScriptTag fallback
7. Merchant enables the theme app embed

Mobile brand setup can also pass `mobile_redirect` into `/auth` so the callback returns to the app after Shopify install completes.

Example:

- `GET /auth?shop={shop}.myshopify.com&mobile_redirect=atribe://brand/shopify-connected`

## Brand campaigns

Minimal brand campaign creation is available through:

- `POST /brand/campaigns`

Request body:

```json
{
  "brand_id": null,
  "shop_domain": "store.myshopify.com",
  "name": "Creator Launch",
  "shopper_offer_type": "percentage",
  "shopper_offer_value": "10",
  "commission_rate": 0.1,
  "duration": "always_on"
}
```

Commission precedence for Shopify split orders is:

1. latest active campaign commission rate for the shop
2. `shopify_brand_integrations.default_commission_rate`
3. backend default commission rate

## Uninstall cleanup

`app/uninstalled` now performs cleanup in a DB transaction and deletes dependent shop rows before deleting the shop record itself.

Cleanup includes:

- `shop_webhook_registrations`
- `shop_script_tags`
- `shopify_orders`
- `order_attributions`
- `order_commissions`
- `shops`

## Final test checklist

1. Start the backend locally.
2. Start your public tunnel and update:
   - `SHOPIFY_APP_URL`
   - `SHOPIFY_CALLBACK_URL`
   - `ATRIBE_BASE_URL`
3. Validate and deploy the Shopify app config if needed.
4. Generate a custom distribution install link in Shopify Dev Dashboard.
5. Install the app on the target store.
6. Confirm install state:
   - `GET /debug/shopify-install-status`
7. Open the theme editor and enable:
   - `Atribe Attribution`
8. Create or choose a test product available on Online Store.
9. Create a creator link with `POST /links/create`.
10. Open the returned tracking link.
11. Confirm final storefront URL includes:
   - `atribe_ref`
   - `atribe_click`
12. On the product page, verify in browser console:
   - `localStorage.getItem("atribe_ref")`
   - `localStorage.getItem("atribe_click")`
   - `localStorage.getItem("atribe_attribution")`
13. Add the product to cart.
14. Place a real test order.
15. Confirm backend results:
   - `GET /debug/orders/latest`
   - `GET /debug/attribution/latest`
   - `GET /creator/earnings?creator_id={creator_id}`
16. Success criteria:
   - `attributionSource = click`
   - `creatorId` matches the creator link
   - commission row exists for the order

## Proven outcome

The working path proven in the dev store is:

`click -> redirect -> storefront persistence -> Shopify order -> click attribution -> commission`
