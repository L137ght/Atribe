# Atribe Implementation Source of Truth

## Purpose and Source-of-Truth Hierarchy

This file documents the app as it works today. It is the canonical implementation reference for humans and AI agents.

For current user journeys, screen paths, and UX/backend mismatch mapping, also use:

- `FLOW.md`

Source-of-truth hierarchy:

`Runtime truth > database truth > README truth > design/mockup truth`

When these sources disagree, the higher level wins. In practice:

- Running code and exercised behavior outrank schema assumptions.
- Database tables and repository access patterns outrank README prose.
- READMEs outrank design-system mockups only when code and database evidence are absent.
- Design and mockup files are not implementation authority.

Documentation-only rule:

- Do not modify app behavior.
- Do not fix routing.
- Do not refactor backend.
- This file documents current reality and contradictions only.

## Repository Reality Map

### Active subsystems

- `apps/client` is the current supporter-facing, creator-facing, and brand-facing product surface.
  - Implemented in: `apps/client/App.js`
  - Implemented in: `apps/client/src/navigation/AppNavigator.js`
  - Implemented in: `apps/client/src/context/AppContext.js`
  - Active screens: `LandingScreen`, `LoginScreen`, `IntentSelectionScreen`, `HomeScreen`, `CreatorDiscoveryScreen`, `CreatorSelectionScreen`, `ShareRouteScreen`, `SettingsScreen`, `FallbackStateScreen`, `FeedbackScreen`, `CreatorOnboardingScreen`, `CreatorDashboardScreen`, `ConnectBrandsScreen`, `ConnectSocialAccountsScreen`, `BrandProgramWebViewScreen`, `AddAffiliateLinksScreen`, `WebViewScreen`, `BrandOnboardingScreen`, `BrandConnectingScreen`, `BrandShopifySuccessScreen`, `CampaignGateScreen`, `CreateCampaignScreen`, `CampaignSuccessScreen`, `BrandHomeScreen`

- `services/shopify-app` — Shopify integration layer (OAuth, webhooks, storefront scripts). Requires `SHOPIFY_API_KEY` etc.
  - Entry point: `services/shopify-app/src/createShopifyApp.js`
  - Standalone server: `services/shopify-app/src/server.js`
  - Legacy monolithic app (for backward compatibility): `services/shopify-app/src/app.js`

- `services/api` — Business & domain API server (dashboard, creator/brand endpoints, price history). Boots WITHOUT Shopify credentials.
  - Entry point: `services/api/src/createApp.js`
  - Standalone server: `services/api/src/server.js`

- `services/redirect` — Link routing & redirect server (link creation, supporter routing, click tracking). Boots WITHOUT Shopify credentials.
  - Entry point: `services/redirect/src/createApp.js`
  - Standalone server: `services/redirect/src/server.js`

- `services/backend` — Phase 1 composition layer. Mounts api + redirect + shopify-app into a single Express server for `api.atribe.io`. Contains zero business logic. Phase 2: each service moves to its own Render deployment; this file is removed.
  - Entry point: `services/backend/src/createApp.js`
  - Render-facing server: `services/backend/src/server.js`

- Shared source tree for domain logic, data access, and HTTP utilities:
  - Source of truth: `services/shopify-app/src/` (shared across all services)
  - Config split: `src/config/shared-env.js` (no Shopify deps) and `src/config/shopify-env.js` (Shopify required)
  - Package barrel re-exports for clean service boundaries: `packages/config/`, `packages/data/`, `packages/http/`, `packages/domain/`, `packages/shopify/`

### Service Boundary Summary

| Service | Owns | Requires Shopify Env |
|---------|------|---------------------|
| `services/api` | Dashboard routes, debug routes, price history | No |
| `services/redirect` | Link creation, supporter routing, redirect handling | No |
| `services/shopify-app` | OAuth, webhooks, storefront scripts | Yes |
| `services/backend` | Composition only (no domain logic) | Yes (composes Shopify) |

### Route Topology through `services/backend`

- `api.atribe.io/api/price-history/lookup` → `services/api`
- `api.atribe.io/creator/*` → `services/api`
- `api.atribe.io/brand/*` → `services/api`
- `api.atribe.io/links/create` → `services/redirect`
- `api.atribe.io/u/:user_id/route` → `services/redirect`
- `api.atribe.io/r/:creator_id/:link_id` → `services/redirect`
- `api.atribe.io/auth/*` → `services/shopify-app`
- `api.atribe.io/webhooks/*` → `services/shopify-app`
- `api.atribe.io/storefront/*` → `services/shopify-app`

- `atribe-extension` exists as a minimal backend-driven routing client for Amazon product pages. It is configured with a backend base URL and supporter user id, then redirects through backend `/u` routing.
  - Implemented in: `atribe-extension/content.js`
  - Implemented in: `atribe-extension/options.html`
  - Implemented in: `atribe-extension/options.js`
  - Not currently used by mobile UI: `apps/client/src/screens/HomeScreen.js`
  - Not currently used by mobile UI: `apps/client/src/screens/ShareRouteScreen.js`

- Supabase is the live app data source for mobile identity, tribe selection, creator profiles, social accounts, affiliate links, domain requests, routing events, and brand roles.
  - Implemented in: `apps/client/src/context/AppContext.js`
  - Implemented in: `apps/client/src/lib/supabase.js`
  - Implemented in: `services/shopify-app/src/db/supabase.js`

- SQLite remains a backend-local fallback provider for the backend.
  - Implemented in: `services/shopify-app/src/db/database.js`
  - Implemented in: `services/shopify-app/src/repositories/*.js`

### Non-authoritative or incomplete surfaces

- `atribe_design_system` contains mockups and product/design references. It is not runtime authority.
  - Design/mockup truth only: `atribe_design_system/atribe_prd.md`
  - Design/mockup truth only: `atribe_design_system/*/code.html`

- `services/api` and `services/redirect` now have live implementations via their `createApp.js` entrypoints, sharing the source tree under `services/shopify-app/src/`.
  - Runtime authority: `services/api/src/createApp.js`
  - Runtime authority: `services/redirect/src/createApp.js`

## Runtime Architecture

### Phase 1: Compatibility Backend

The Render-facing entry point is `services/backend/src/server.js`, which composes three modular service apps into a single Express server:

```
services/backend/src/createApp.js
  ├── createApiApp()       ← services/api/src/createApp.js
  │     ├── dashboardRouter (creator/brand endpoints)
  │     ├── debugRouter (dev-only)
  │     └── priceHistoryRouter
  ├── createRedirectApp()  ← services/redirect/src/createApp.js
  │     ├── linkRouter (POST /links/create)
  │     └── redirectRouter (GET /u/:user_id/route, GET /r/:creator_id/:link_id)
  └── createShopifyApp()   ← services/shopify-app/src/createShopifyApp.js
        ├── authRouter (GET /auth, GET /auth/callback)
        ├── storefrontRouter (GET /storefront/atribe.js)
        └── webhookRouter (POST /webhooks/*)
```

### Config Split

- **Shared** (`shared-env.js`): `DB_PROVIDER`, `PORT`, `HOST`, `NODE_ENV`, `LOG_LEVEL`, `ATRIBE_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SQLITE_DB_PATH`, `DEFAULT_COMMISSION_RATE`, `PLATFORM_FEE_RATE`, `ATRIBE_HOUSE_CREATOR_ID`, `CORS_ALLOWED_ORIGINS`
- **Shopify** (`shopify-env.js`): `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_APP_URL`, `SHOPIFY_CALLBACK_URL`, `SHOPIFY_API_VERSION` — required ONLY by `services/shopify-app` and `services/backend`

`services/api` and `services/redirect` boot without Shopify credentials.

### Primary runtime

The implemented backend mounts from `services/backend/src/createApp.js`. It serves:

- health
- Shopify app install/auth
- legacy creator redirect routing
- supporter `/u/:user_id/route` routing
- creator and brand reporting endpoints
- Shopify webhook ingestion
- storefront attribution script
- price history lookup for Amazon/Flipkart product links
- dev-only debug endpoints

Implemented in: `services/backend/src/createApp.js`
Legacy monolithic app for backward compat: `services/shopify-app/src/app.js`

### Provider model

The backend supports two persistence providers:

- `DB_PROVIDER=sqlite`
- `DB_PROVIDER=supabase`

Implement in: `services/shopify-app/src/config/shared-env.js`
Implemented in: `services/shopify-app/src/repositories/shop-repository.js`
Implemented in: `services/shopify-app/src/repositories/link-click-repository.js`
Implemented in: `services/shopify-app/src/repositories/order-attribution-repository.js`

### Proven active runtime paths

- Shopify attribution flow has been exercised end to end through `services/shopify-app`.
  - Implemented in: `services/shopify-app/src/services/link-service.js`
  - Implemented in: `services/shopify-app/src/services/storefront-script-service.js`
  - Implemented in: `services/shopify-app/src/services/order-attribution-service.js`
  - Implemented in: `services/shopify-app/src/services/commission-service.js`

- Supporter and creator UX currently run through the mobile app.
  - Implemented in: `apps/client/src/screens/HomeScreen.js`
  - Implemented in: `apps/client/src/screens/ShareRouteScreen.js`
  - Implemented in: `apps/client/src/screens/ConnectBrandsScreen.js`
  - Implemented in: `apps/client/src/screens/BrandProgramWebViewScreen.js`
  - Implemented in: `apps/client/src/screens/WebViewScreen.js`
  - Implemented in: `apps/client/src/screens/CreatorDiscoveryScreen.js`
  - Implemented in: `apps/client/src/screens/CreatorSelectionScreen.js`

### Local/demo or client-side-only paths

- Supporter tribe membership writes still happen directly from the mobile app into Supabase.
  - Implemented in: `apps/client/src/context/AppContext.js`
  - Writes: `tribe_memberships`

- External affiliate-link saves still happen directly from the mobile app into Supabase.
  - Implemented in: `apps/client/src/context/AppContext.js`
  - Writes: `creator_affiliate_links`

- Dev bypass remains active for backend auth guards outside production.
  - Implemented in: `services/shopify-app/src/middleware/auth-context.js`

## Backend Implementation

### App entry and install surface

- `GET /` and `GET /app` return backend status JSON and auto-bootstrap into `/auth` when Shopify opens the app with `shop=...` for a not-yet-installed store.
  - Implemented in: `services/shopify-app/src/app.js`
  - Reads: `shopify_shops` / `shops` via `shopRepository.findByShopDomain`
  - Used by: Shopify embedded app entry after install link open

- `GET /auth`
  - Starts Shopify OAuth install.
  - Implemented in: `services/shopify-app/src/routes/auth-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/auth-controller.js`
  - Implemented in: `services/shopify-app/src/services/oauth-service.js`
  - Used by: Shopify embedded app entry and brand mobile flow via `buildBrandShopifyInstallUrl` in `apps/client/src/lib/backend.js`

- `GET /auth/callback`
  - Exchanges code for offline token, stores shop install state, registers webhooks, registers legacy ScriptTag fallback.
  - Implemented in: `services/shopify-app/src/controllers/auth-controller.js`
  - Writes: `shopify_shops`, `shopify_brand_integrations`, `shopify_webhook_registrations`, `shopify_script_tags`
  - Writes in SQLite mode: `shops`, `brand_integrations`, `shop_webhook_registrations`, `shop_script_tags`
  - Not currently used by mobile UI directly: `apps/client/src/screens/*`

### Redirect and routing surface

- `GET /r/:creator_id/:link_id`
  - Legacy creator-owned redirect path.
  - Creates a click, sets `atribe_ref` and `atribe_click`, redirects to destination URL.
  - Implemented in: `services/shopify-app/src/routes/redirect-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/link-controller.js`
  - Implemented in: `services/shopify-app/src/services/link-service.js`
  - Writes: `shopify_link_clicks` / `link_clicks`
  - Used by: tracking links created through `POST /links/create`

- `GET /u/:user_id/route?url=...`
  - Supporter routing path.
  - Validates user, loads supporter creator weights, detects `external` vs `atribe_shopify`, creates immutable snapshot, creates click row, redirects with attribution params.
  - Implemented in: `services/shopify-app/src/routes/redirect-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/link-controller.js`
  - Implemented in: `services/shopify-app/src/services/link-service.js`
  - Reads: `profiles`, `tribe_memberships`, `creator_profiles`, `creator_affiliate_links`, `shopify_brand_integrations`, `shopify_creator_brand_links`, `shopify_shops`
  - Writes: `shopify_click_weight_snapshots`, `shopify_link_clicks`
  - Used by: `apps/client/src/screens/HomeScreen.js`
  - Used by: `apps/client/src/screens/ShareRouteScreen.js`
  - Used by: `atribe-extension/content.js`

- `POST /links/create`
  - Creates legacy creator-owned tracking links and ensures a creator coupon mapping exists.
  - Implemented in: `services/shopify-app/src/routes/link-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/link-controller.js`
  - Implemented in: `services/shopify-app/src/services/link-service.js`
  - Writes: `shopify_links`, `shopify_creator_coupon_mappings`
  - Not currently used by mobile UI: `apps/client/src/screens/*`

### Storefront attribution surface

- `GET /storefront/atribe.js`
  - Serves the backend storefront attribution script.
  - Implemented in: `services/shopify-app/src/routes/storefront-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/storefront-script-controller.js`
  - Implemented in: `services/shopify-app/src/services/storefront-script-service.js`
  - Used by: `services/shopify-app/extensions/atribe-theme-extension/assets/atribe-app-embed.js`

- Theme app embed
  - Preferred storefront injection path for Shopify attribution persistence.
  - Implemented in: `services/shopify-app/extensions/atribe-theme-extension/blocks/atribe-app-embed.liquid`
  - Implemented in: `services/shopify-app/extensions/atribe-theme-extension/assets/atribe-app-embed.js`

### Webhook ingestion surface

- `POST /webhooks/orders_create`
- `POST /webhooks/orders_paid`
  - Persist order, resolve attribution, persist attribution row, create commission rows.
  - Implemented in: `services/shopify-app/src/routes/webhook-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/webhook-controller.js`
  - Implemented in: `services/shopify-app/src/services/order-attribution-service.js`
  - Writes: `shopify_orders`, `shopify_order_attributions`, `shopify_order_commissions`, `shopify_user_creator_ledger`

- `POST /webhooks/orders_cancelled`
- `POST /webhooks/refunds_create`
  - Create reversal commission rows based on prior sale commission rows.
  - Implemented in: `services/shopify-app/src/controllers/webhook-controller.js`
  - Implemented in: `services/shopify-app/src/services/commission-service.js`
  - Writes: `shopify_order_commissions`

- `POST /webhooks/app_uninstalled`
  - Cleans up Shopify install-side backend state.
  - Implemented in: `services/shopify-app/src/controllers/webhook-controller.js`
  - Writes/deletes through: `services/shopify-app/src/repositories/shop-repository.js`

- GDPR-related webhooks are acknowledged/logged but do not drive product features.
  - Implemented in: `services/shopify-app/src/controllers/webhook-controller.js`

### Price history surface

- `GET /price-history/lookup?url=...` and `GET /api/price-history/lookup?url=...`
  - Looks up price history data from ProductHistory.in (primary) and falls back to PriceHistoryApp.com for Amazon and Flipkart product links.
  - Extracts marketplace, product title, and product ID from URL. Resolves ProductHistory product pages through search (never guesses unique suffixes). Falls back to PriceHistoryApp via direct slug and search.
  - Returns normalized response with provider, product title, price stats (as formatted strings), deal verdict, recommendation text, chart data, confidence score, and cache metadata.
  - In-memory cache with 6-hour TTL for successes and 30-minute TTL for empty results.
  - 8s per-request timeout, 12s total provider timeout, 1 retry max.
  - Only fetches from producthistory.in and pricehistoryapp.com (SSRF-safe).
  - Implemented in: `services/shopify-app/src/routes/price-history-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/price-history-controller.js`
  - Implemented in: `services/shopify-app/src/services/priceHistory/index.js` (orchestrator)
  - Implemented in: `services/shopify-app/src/services/priceHistory/productInfo.js` (URL parsing)
  - Implemented in: `services/shopify-app/src/services/priceHistory/productHistoryProvider.js` (primary)
  - Implemented in: `services/shopify-app/src/services/priceHistory/priceHistoryAppProvider.js` (fallback)
  - Implemented in: `services/shopify-app/src/services/priceHistory/htmlParsers.js` (HTML parsing)
  - Implemented in: `services/shopify-app/src/services/priceHistory/confidence.js` (candidate scoring)
  - Implemented in: `services/shopify-app/src/services/priceHistory/cache.js` (in-memory cache)
  - Implemented in: `services/shopify-app/src/services/priceHistory/providers.js` (shared fetch)
  - Used by: `apps/client/src/lib/priceHistory.js`
  - Used by: `apps/client/src/screens/HomeScreen.js` (via `PriceHistoryCard`)

### Creator-facing endpoints

- `GET /creator/links?creator_id=...`
  - Returns creator-owned link rows from backend link storage.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/dashboard-controller.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_links`
  - Not currently used by mobile UI: `apps/client/src/screens/CreatorDashboardScreen.js`

- `GET /creator/earnings?creator_id=...`
  - Returns creator commission totals and commission rows from backend ledger.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/dashboard-controller.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_order_commissions`
  - Not currently used by mobile UI: `apps/client/src/screens/CreatorDashboardScreen.js`

- `GET /creator/orders?creator_id=...`
  - Returns creator commission rows as order-facing data.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/dashboard-controller.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_order_commissions`
  - Not currently used by mobile UI: `apps/client/src/screens/CreatorDashboardScreen.js`

- `GET /creator/brands?creator_id=...`
- `POST /creator/brands`
- `PATCH /creator/brands/:id`
- `DELETE /creator/brands/:id`
  - Backend CRUD surface for creator↔shop associations.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/dashboard-controller.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads/writes: `shopify_creator_brand_links`, `shopify_brand_integrations`
  - `PATCH` and `DELETE` guarded by `requireCreatorBrandLinkOwnership` middleware.
  - Implemented in: `services/shopify-app/src/middleware/auth-context.js`
  - Used by: `apps/client/src/context/AppContext.js`
  - Used by: `apps/client/src/screens/AddAffiliateLinksScreen.js`
  - Used by: `apps/client/src/screens/BrandProgramWebViewScreen.js`

### Brand-facing endpoints

- `GET /brand/shopify/install-status?brand_id=...|shop_domain=...`
  - Returns install status, webhook registrations, script tags, app URL, base URL, default commission rate, and active campaign data.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_brand_integrations`, `shopify_shops`, `shopify_script_tags`, `shopify_webhook_registrations`, `shopify_campaigns`
  - Used by: `apps/client/src/screens/BrandOnboardingScreen.js`
  - Used by: `apps/client/src/screens/BrandConnectingScreen.js`
  - Used by: `apps/client/src/screens/BrandShopifySuccessScreen.js`

- `GET /brand/orders?brand_id=...|shop_domain=...`
  - Returns order attribution rows filtered by brand or shop.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_order_attributions`
  - Not currently used by mobile UI: `apps/client/src/screens/*`

- `GET /brand/commissions?brand_id=...|shop_domain=...`
  - Returns creator commission rows filtered by brand or shop.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_order_commissions`
  - Not currently used by mobile UI: `apps/client/src/screens/*`

- `GET /brand/creators?brand_id=...|shop_domain=...`
  - Returns creator/shop link rows merged with aggregated backend commission totals.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_creator_brand_links`, `shopify_order_commissions`
  - Not currently used by mobile UI: `apps/client/src/screens/*`

- `GET /brand/clicks?brand_id=...|shop_domain=...`
  - Returns backend click rows filtered by brand or shop.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_link_clicks`
  - Not currently used by mobile UI: `apps/client/src/screens/*`

- `POST /brand/campaigns`
  - Creates a brand campaign with name, shopper offer, commission rate, and duration.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/controllers/dashboard-controller.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Writes: `shopify_campaigns`
  - Used by: `apps/client/src/screens/CreateCampaignScreen.js`
  - Used by: `apps/client/src/context/AppContext.js` (`createBrandCampaign`)

- `GET /brand/campaigns` (included in install-status response)
  - Campaign data flows through the install-status endpoint for mobile consumption.
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_campaigns`
  - Used by: `apps/client/src/screens/BrandHomeScreen.js`
  - Used by: `apps/client/src/screens/CampaignGateScreen.js`

### Debug endpoints

These are mounted only when `NODE_ENV !== "production"`.

- `GET /debug/shops`
- `GET /debug/clicks/latest`
- `GET /debug/links/latest`
- `GET /debug/orders/latest`
- `GET /debug/attribution/latest`
- `GET /debug/storefront-script`
- `GET /debug/shopify-install-status`
- `GET /debug/user-creator-weights`
- `GET /debug/user-route-clicks/latest`
- `GET /debug/user-value-distribution`
- `GET /debug/snapshot/:snapshot_id`
- `POST /debug/seed-user-weights`

Implemented in: `services/shopify-app/src/app.js`
Implemented in: `services/shopify-app/src/routes/debug-routes.js`
Not currently used by production UI: `apps/client/src/screens/*`

## Database Truth

### Upstream app tables read by the backend

- `profiles`
  - Used to validate supporter identity in Supabase mode.
  - Implemented in: `services/shopify-app/src/repositories/user-repository.js`
  - Used by: `services/shopify-app/src/services/link-service.js`

- `creator_profiles`
  - Used to resolve creator records and expand affiliate-link data.
  - Implemented in: `services/shopify-app/src/repositories/creator-repository.js`

- `creator_affiliate_links`
  - Used for external domain support and external URL rewrite/tagging.
  - Implemented in: `services/shopify-app/src/repositories/creator-repository.js`
  - Written directly by mobile UI in current app flow: `apps/client/src/context/AppContext.js`

- `creator_social_accounts`
  - Stores creator social platform connections (platform, username, permissions).
  - Implemented in: `apps/client/src/context/AppContext.js` (`connectSocialAccount`)
  - Upserted on conflict: `creator_profile_id,platform`

- `creator_social_audience_snapshots`
  - Stores audience metrics snapshots (follower counts, demographics) for social accounts.
  - Implemented in: `apps/client/src/context/AppContext.js` (`buildAudienceSnapshot`)

- `domain_requests`
  - Stores user-submitted domain requests for unsupported domains.
  - Implemented in: `apps/client/src/context/AppContext.js` (`submitDomainRequest`)
  - Used by: `apps/client/src/screens/FallbackStateScreen.js`

- `routing_events`
  - Stores analytics events for supporter routing actions.
  - Implemented in: `apps/client/src/context/AppContext.js` (`recordRoutingEvent`)
  - Used by: `apps/client/src/screens/HomeScreen.js`
  - Used by: `apps/client/src/screens/ShareRouteScreen.js`

- `tribe_memberships`
  - Current live supporter selection source in Supabase mode.
  - Implemented in: `services/shopify-app/src/repositories/user-creator-weight-repository.js`
  - Written directly by mobile UI in current app flow: `apps/client/src/context/AppContext.js`

### Backend-owned Shopify tables

- `shopify_shops`
  - Shopify install credentials and scopes.
  - Implemented in: `services/shopify-app/src/repositories/shop-repository.js`

- `shopify_brand_integrations`
  - Shopify shop install status and brand-side integration metadata.
  - Implemented in: `services/shopify-app/src/repositories/brand-integration-repository.js`
  - Updated by install persistence in: `services/shopify-app/src/repositories/shop-repository.js`

- `shopify_creator_brand_links`
  - Backend-owned creator↔shop association table.
  - Implemented in: `services/shopify-app/src/repositories/creator-brand-link-repository.js`

- `shopify_links`
  - Legacy creator-owned tracking links.
  - Implemented in: `services/shopify-app/src/repositories/link-repository.js`

- `shopify_link_clicks`
  - Universal click record for `/r` and `/u` backend routes.
  - Implemented in: `services/shopify-app/src/repositories/link-click-repository.js`

- `shopify_click_weight_snapshots`
  - Immutable supporter snapshot rows for backend routing.
  - Implemented in: `services/shopify-app/src/repositories/click-weight-snapshot-repository.js`

- `shopify_orders`
  - Stored Shopify orders received through backend webhooks.
  - Implemented in: `services/shopify-app/src/repositories/shopify-order-repository.js`

- `shopify_order_attributions`
  - One attribution row per backend-attributed Shopify order.
  - Implemented in: `services/shopify-app/src/repositories/order-attribution-repository.js`

- `shopify_order_commissions`
  - Commission event rows, including multi-creator Shopify splits and reversals.
  - Implemented in: `services/shopify-app/src/repositories/order-commission-repository.js`

- `shopify_user_creator_ledger`
  - Performance ledger updated by backend attribution, not a source of current supporter selection.
  - Implemented in: `services/shopify-app/src/repositories/user-creator-weight-repository.js`

- `shopify_creator_coupon_mappings`
  - Backend coupon fallback mapping.
  - Implemented in: `services/shopify-app/src/repositories/creator-coupon-repository.js`

- `shopify_campaigns`
  - Brand campaign records with name, shopper offer type/value, commission rate, duration, and status.
  - Implemented in: `services/shopify-app/src/repositories/campaign-repository.js`
  - Created by: `POST /brand/campaigns`
  - Read by: brand install-status endpoint for mobile consumption
  - Used by: `apps/client/src/screens/CreateCampaignScreen.js`
  - Used by: `apps/client/src/screens/CampaignGateScreen.js`
  - Used by: `apps/client/src/screens/BrandHomeScreen.js`

### Authoritative data ownership

- Supporter selection truth today:
  - runtime read source: `tribe_memberships`
  - implemented in: `services/shopify-app/src/repositories/user-creator-weight-repository.js`
  - written by current UI: `apps/client/src/context/AppContext.js`

- Creator affiliate link truth today:
  - runtime read source for mobile and external attribution: `creator_affiliate_links`
  - implemented in: `apps/client/src/context/AppContext.js`
  - implemented in: `services/shopify-app/src/repositories/creator-repository.js`

- Shopify creator↔shop association truth today:
  - backend source: `shopify_creator_brand_links`
  - implemented in: `services/shopify-app/src/repositories/creator-brand-link-repository.js`
  - not currently used by mobile creator brand flow: `apps/client/src/screens/ConnectBrandsScreen.js`

- Shopify attribution and commission truth today:
  - `shopify_link_clicks`
  - `shopify_click_weight_snapshots`
  - `shopify_orders`
  - `shopify_order_attributions`
  - `shopify_order_commissions`
  - implemented in: `services/shopify-app/src/services/order-attribution-service.js`
  - implemented in: `services/shopify-app/src/services/commission-service.js`

## User Flow Mapping

### Supporter flow

#### Current UI journey

1. Supporter signs in and gets a profile.
   - Implemented in: `apps/client/src/context/AppContext.js`

2. Supporter selects creators and weights.
   - Implemented in: `apps/client/src/screens/CreatorSelectionScreen.js`
   - Writes: `tribe_memberships`
   - Implemented in: `apps/client/src/context/AppContext.js`

3. Supporter can paste a URL on `HomeScreen` or share one into `ShareRouteScreen`.
   - Implemented in: `apps/client/src/screens/HomeScreen.js`
   - Implemented in: `apps/client/src/screens/ShareRouteScreen.js`

4. Current mobile flow builds a backend `/u/:user_id/route` URL and opens that route instead of selecting a creator locally.
   - Implemented in: `apps/client/src/screens/HomeScreen.js`
   - Implemented in: `apps/client/src/screens/ShareRouteScreen.js`
   - Implemented in: `apps/client/src/lib/backend.js`

#### Current backend/API usage

- The backend supporter route is the default mobile routing path today.
  - Implemented in: `services/shopify-app/src/routes/redirect-routes.js`
  - Used by: `apps/client/src/screens/HomeScreen.js`
  - Used by: `apps/client/src/screens/ShareRouteScreen.js`

- The backend can build immutable supporter snapshots and route Shopify or external links.
  - Implemented in: `services/shopify-app/src/services/link-service.js`

#### Current direct Supabase writes

- Supporter weights are written directly by the mobile app.
  - Implemented in: `apps/client/src/context/AppContext.js`
  - Writes: `tribe_memberships`

### Creator flow

#### Current UI journey

1. Creator onboarding and dashboard live in the mobile app.
   - Implemented in: `apps/client/src/screens/CreatorOnboardingScreen.js`
   - Implemented in: `apps/client/src/screens/CreatorDashboardScreen.js`

2. Creator can browse brand programs.
   - Implemented in: `apps/client/src/screens/ConnectBrandsScreen.js`

3. Creator can open a brand program webview and either save an external affiliate URL or create a Shopify store association through backend creator-brand endpoints.
   - Implemented in: `apps/client/src/screens/BrandProgramWebViewScreen.js`

4. Creator can add/remove external affiliate links directly, while Shopify store connections go through backend creator-brand endpoints.
   - Implemented in: `apps/client/src/screens/AddAffiliateLinksScreen.js`
   - Implemented in: `apps/client/src/context/AppContext.js`

#### Current backend/API usage

- Backend exposes creator reporting endpoints and creator-brand association endpoints, and the mobile creator flows now use the creator-brand endpoints for Shopify store connections.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Not currently used by UI: `apps/client/src/screens/CreatorDashboardScreen.js`
  - Used by: `apps/client/src/context/AppContext.js`
  - Used by: `apps/client/src/screens/AddAffiliateLinksScreen.js`
  - Used by: `apps/client/src/screens/BrandProgramWebViewScreen.js`

#### Current direct Supabase writes

- Creator affiliate links are written directly to `creator_affiliate_links`.
  - Implemented in: `apps/client/src/context/AppContext.js`

- Shopify creator-brand connections are written through backend `shopify_creator_brand_links`.
  - Implemented in: `apps/client/src/context/AppContext.js`
  - Used by: `apps/client/src/screens/AddAffiliateLinksScreen.js`
  - Used by: `apps/client/src/screens/BrandProgramWebViewScreen.js`

### Brand flow

#### Current UI journey

- Brand flow is implemented in the mobile app with dedicated onboarding, Shopify connection, campaign creation, and a brand home screen.
  - Implemented in: `apps/client/src/screens/BrandOnboardingScreen.js`
  - Implemented in: `apps/client/src/screens/BrandConnectingScreen.js`
  - Implemented in: `apps/client/src/screens/BrandShopifySuccessScreen.js`
  - Implemented in: `apps/client/src/screens/CampaignGateScreen.js`
  - Implemented in: `apps/client/src/screens/CreateCampaignScreen.js`
  - Implemented in: `apps/client/src/screens/CampaignSuccessScreen.js`
  - Implemented in: `apps/client/src/screens/BrandHomeScreen.js`

- Brand entry point:
  - `IntentSelectionScreen` presents `Brand` as a real, independent role choice that navigates to the brand flow.
  - Implemented in: `apps/client/src/screens/IntentSelectionScreen.js`
  - Navigated by: `apps/client/src/navigation/AppNavigator.js`

- Brand onboarding flow:
  1. `BrandOnboarding` — enter Shopify store domain and connect.
  2. `BrandConnecting` — opens Shopify OAuth install flow via backend `/auth`, then polls install status.
  3. `BrandShopifySuccess` — confirms store is connected, prompts campaign creation.
  4. `CampaignGate` — gate screen requiring an active campaign before accessing `BrandHome`.
  5. `CreateCampaign` — form for campaign name, shopper offer, creator payout commission rate, duration.
  6. `CampaignSuccess` — confirmation after campaign creation with invite-creators share action.
  7. `BrandHome` — minimal brand status view showing connected shop, campaign status, commission pool.

#### Current backend/API usage

- Brand mobile flow uses backend endpoints:
  - `GET /brand/shopify/install-status` — polled from `BrandConnectingScreen`, `BrandShopifySuccessScreen`, and `BrandOnboardingScreen` to check Shopify connection.
    - Implemented in: `apps/client/src/context/AppContext.js` (`refreshBrandInstallStatus`, `fetchBrandInstallStatus`)
  - `POST /brand/campaigns` — called from `CreateCampaignScreen` via `createBrandCampaign`.
    - Implemented in: `apps/client/src/context/AppContext.js`
  - `GET /auth?shop=...` — build Shopify install URL via `buildBrandShopifyInstallUrl`.
    - Implemented in: `apps/client/src/lib/backend.js`
    - Opened in: `apps/client/src/screens/BrandConnectingScreen.js`

- Backend brand reporting endpoints exist but are not yet consumed by mobile UI:
  - `GET /brand/orders`, `GET /brand/commissions`, `GET /brand/creators`, `GET /brand/clicks`
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Not currently used by UI: `apps/client/src/screens/BrandHomeScreen.js`

#### Current backend-owned brand integration behavior

- Shopify install state is tracked on the backend and used to determine whether a store is an active Atribe Shopify shop.
  - Implemented in: `services/shopify-app/src/repositories/brand-integration-repository.js`
  - Implemented in: `services/shopify-app/src/services/link-service.js`

- Brand campaigns are stored in backend `shopify_campaigns` table, created via `POST /brand/campaigns`, and the active campaign status flows back to mobile via the install-status response.
  - Implemented in: `services/shopify-app/src/repositories/campaign-repository.js`
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`
  - Reads: `shopify_campaigns`
  - Used by: `apps/client/src/screens/CreateCampaignScreen.js`
  - Used by: `apps/client/src/screens/CampaignGateScreen.js`
  - Used by: `apps/client/src/screens/BrandHomeScreen.js`

## Current Contradictions

### 1. `services/shopify-app/README.md` can lag runtime behavior if not maintained with backend changes

- Current behavior:
  - service-local README is secondary documentation, not runtime authority.
  - README truth: `services/shopify-app/README.md`

- Conflicting runtime truth:
  - app entry exposes `/u/{user_id}/route`
  - creator-brand write endpoints exist
  - auth guards exist on creator and brand route families
  - supported attribution behavior includes Shopify snapshots, house fallback, and multi-creator commission rows
  - Implemented in: `services/shopify-app/src/app.js`
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/middleware/auth-context.js`
  - Implemented in: `services/shopify-app/src/services/order-attribution-service.js`

- Impact:
  - README readers can form a stale model of the backend if they trust prose over runtime. `IMPLEMENTATION.md` and exercised code still take precedence.

### 2. Root README layout still overstates `services/api` and `services/redirect` as separate codebases

- Current behavior:
  - root README presents `services/api` and `services/redirect` as core backend pieces with their own implementations.
  - `services/api` and `services/redirect` now have live `createApp.js` entrypoints sharing the source tree under `services/shopify-app/src/`. They boot independently without Shopify credentials.
  - README truth: `README.md`

- Conflicting runtime truth:
  - the actual implemented code lives in a shared source tree under `services/shopify-app/src/`, composed through `services/backend/src/createApp.js`.
  - Implemented in: `services/backend/src/createApp.js`

- Impact:
  - repo orientation can send readers to the service directories expecting independent codebases when they share a common source tree (Phase 2 will extract shared code into packages).

### 3. Backend auth is minimal and only partially hardened

- Current behavior:
  - backend now accepts optional bearer tokens, verifies Supabase users in Supabase mode, enforces self-routing for authenticated `/u` requests, enforces creator ownership on creator endpoints, and enforces creator-brand-link ownership on `PATCH /creator/brands/:id` and `DELETE /creator/brands/:id`.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/middleware/auth-context.js`

- Conflicting product expectation:
  - brand endpoints still require authentication but do not yet enforce brand ownership, and dev bypass remains active outside production.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Implemented in: `services/shopify-app/src/middleware/auth-context.js`
  - However, the brand mobile flow now provides a real product surface for brand onboarding, Shopify connection, and campaign creation, which exercises these endpoints.

- Conflicting UI expectation:
  - mobile app is built around signed-in user ownership and role-based surfaces for supporter, creator, and brand roles.
  - Implemented in: `apps/client/src/context/AppContext.js`
  - Used by: `apps/client/src/screens/*`

- Impact:
  - creator paths are guarded enough for current integration work, brand campaign creation is functional through the mobile flow, but brand reporting paths are still not production-grade ownership-checked APIs.

## Current Supported Capabilities

### Implemented and exercised

- Shopify app install with offline token storage.
  - Implemented in: `services/shopify-app/src/controllers/auth-controller.js`

- Supporter `/u` routing for Shopify.
  - Implemented in: `services/shopify-app/src/services/link-service.js`

- Eligibility-aware Shopify snapshots.
  - Implemented in: `services/shopify-app/src/services/link-service.js`

- House fallback when no eligible creators exist for a Shopify store.
  - Implemented in: `services/shopify-app/src/services/link-service.js`

- Storefront attribution persistence through the theme app embed.
  - Implemented in: `services/shopify-app/extensions/atribe-theme-extension/assets/atribe-app-embed.js`
  - Implemented in: `services/shopify-app/src/services/storefront-script-service.js`

- Shopify webhook ingestion and multi-row commission split.
  - Implemented in: `services/shopify-app/src/services/order-attribution-service.js`
  - Implemented in: `services/shopify-app/src/services/commission-service.js`

- Supabase-backed creator and brand reporting endpoints.
  - Implemented in: `services/shopify-app/src/services/dashboard-service.js`

- Mobile supporter routing through backend `/u/:user_id/route`.
  - Implemented in: `apps/client/src/screens/HomeScreen.js`
  - Implemented in: `apps/client/src/screens/ShareRouteScreen.js`
  - Used by backend: `services/shopify-app/src/routes/redirect-routes.js`

- Mobile Shopify creator-brand connection through backend endpoints.
  - Implemented in: `apps/client/src/context/AppContext.js`
  - Implemented in: `apps/client/src/screens/AddAffiliateLinksScreen.js`
  - Implemented in: `apps/client/src/screens/BrandProgramWebViewScreen.js`
  - Used by backend: `services/shopify-app/src/routes/dashboard-routes.js`

- Extension backend-driven external routing with loop prevention and no hardcoded creator tag.
  - Implemented in: `atribe-extension/content.js`
  - Implemented in: `atribe-extension/options.js`

- Mobile brand onboarding, Shopify connection, and campaign creation through backend endpoints.
  - Implemented in: `apps/client/src/screens/BrandOnboardingScreen.js`
  - Implemented in: `apps/client/src/screens/BrandConnectingScreen.js`
  - Implemented in: `apps/client/src/screens/BrandShopifySuccessScreen.js`
  - Implemented in: `apps/client/src/screens/CreateCampaignScreen.js`
  - Implemented in: `apps/client/src/screens/BrandHomeScreen.js`
  - Used by backend: `services/shopify-app/src/routes/dashboard-routes.js`

- Backend campaign creation and active-campaign gating.
  - Implemented in: `services/shopify-app/src/repositories/campaign-repository.js`
  - Used by: `apps/client/src/screens/CampaignGateScreen.js`
  - Used by: `apps/client/src/screens/CampaignSuccessScreen.js`

- Price history lookup for Amazon and Flipkart product links via ProductHistory.in (primary) and PriceHistoryApp.com (fallback).
  - Backend: dual-provider orchestration with search-based resolution, confidence scoring, caching, and SSRF-safe outbound fetching.
  - Implemented in: `services/shopify-app/src/services/priceHistory/index.js`
  - Mobile: debounced lookup and themed price history card on HomeScreen.
  - Implemented in: `apps/client/src/lib/priceHistory.js`
  - Implemented in: `apps/client/src/components/PriceHistoryCard.js`
  - Used by: `apps/client/src/screens/HomeScreen.js`

### Implemented but not currently wired into UI

- Brand reporting endpoints (orders, commissions, creators, clicks) beyond install-status.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Not currently used by UI: `apps/client/src/screens/*`

- Backend creator reporting endpoints.
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Not currently used by UI: `apps/client/src/screens/CreatorDashboardScreen.js`

- Brand home screen is minimal status display only — does not yet surface detailed orders, commissions, or creator management data from backend reporting.

## Known Documentation Limits

- This file must be updated when runtime behavior changes.
- Stale READMEs and mockups must never override runtime evidence.
- If this file conflicts with exercised code paths, the code path wins until this file is updated.
- Schema files and migrations are useful context, but they are secondary to runtime repository usage and exercised flows.

Implemented in: `services/shopify-app/src/app.js`
Implemented in: `services/shopify-app/src/repositories/*.js`
Implemented in: `apps/client/src/context/AppContext.js`
