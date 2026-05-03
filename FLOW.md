# Atribe Flow Map

## 1. Purpose

`FLOW.md` documents the current Atribe user journeys as implemented today. It focuses on:

- user roles
- mobile navigation
- browser-extension behavior
- Shopify backend touchpoints
- Supabase touchpoints
- UX contradictions between the current UI and the implemented backend model

This file is documentation only.

- Do not modify app behavior from this file.
- Do not treat intended product direction as current implementation.
- If runtime code conflicts with this document, runtime code wins.

Primary implementation references:

- Implemented in: `apps/mobile/src/navigation/AppNavigator.js`
- Implemented in: `apps/mobile/src/context/AppContext.js`
- Implemented in: `atribe-extension/content.js`
- Implemented in: `services/shopify-app/src/app.js`
- Cross-system reference: `IMPLEMENTATION.md`

## 2. App Surfaces

### Mobile app

- Role: current primary product surface for supporters and creators
- Current maturity: active UI with working supporter routing, creator onboarding, creator affiliate-link management, and partial Shopify creator-brand connection support
- Main files/folders:
  - Implemented in: `apps/mobile/App.js`
  - Implemented in: `apps/mobile/src/navigation/AppNavigator.js`
  - Implemented in: `apps/mobile/src/context/AppContext.js`
  - Implemented in: `apps/mobile/src/screens/*`
- What it currently owns:
  - auth entry
  - role selection
  - supporter creator discovery and tribe selection
  - supporter link routing entry
  - creator onboarding
  - creator affiliate-link management
  - creator brand-program browsing
  - partial Shopify creator-brand connection through backend endpoints

### Browser extension

- Role: lightweight external-routing helper for Amazon product pages
- Current maturity: MVP, manually configured, backend-driven, no internal auth model
- Main files/folders:
  - Implemented in: `atribe-extension/manifest.json`
  - Implemented in: `atribe-extension/content.js`
  - Implemented in: `atribe-extension/options.html`
  - Implemented in: `atribe-extension/options.js`
- What it currently owns:
  - detects Amazon `/dp/` pages
  - reads configured backend URL and supporter user id from extension storage
  - redirects through backend `/u/:userId/route`
  - loop prevention for already-attributed URLs

### Shopify backend/app

- Role: server-side attribution engine and Shopify commerce integration
- Current maturity: operational backend with proven Shopify attribution, multi-creator snapshot splitting, creator-brand link storage, and creator/brand JSON endpoints
- Main files/folders:
  - Implemented in: `services/shopify-app/src/app.js`
  - Implemented in: `services/shopify-app/src/routes/*`
  - Implemented in: `services/shopify-app/src/services/*`
  - Implemented in: `services/shopify-app/extensions/atribe-theme-extension/*`
- What it currently owns:
  - Shopify install/auth
  - `/u/:userId/route`
  - legacy `/r/:creatorId/:linkId`
  - storefront attribution persistence
  - order webhook attribution
  - commission ledger
  - creator-brand association APIs
  - creator and brand reporting APIs

### Supabase data layer

- Role: main app identity and data store for mobile, plus one backend provider for Shopify backend
- Current maturity: active
- Main files/folders:
  - Implemented in: `apps/mobile/src/lib/supabase.js`
  - Implemented in: `apps/mobile/src/context/AppContext.js`
  - Implemented in: `services/shopify-app/src/db/supabase.js`
  - Implemented in: `supabase/migrations/*`
- What it currently owns:
  - auth sessions
  - profiles
  - creator profiles
  - tribe memberships
  - external affiliate links
  - Shopify-prefixed attribution tables when `DB_PROVIDER=supabase`

## 3. User Roles

### Supporter

- Goal: discover creators, build a tribe, and route shopping links so attribution follows the supporter’s creator preferences
- Current entry point:
  - Implemented in: `apps/mobile/src/screens/LandingScreen.js`
  - Implemented in: `apps/mobile/src/screens/LoginScreen.js`
  - Implemented in: `apps/mobile/src/screens/IntentSelectionScreen.js`
- Current screens:
  - `Landing`
  - `Login`
  - `IntentSelection`
  - `Home`
  - `CreatorDiscovery`
  - `CreatorSelection`
  - `ShareRoute`
  - `Settings`
  - `FallbackState`
  - `Feedback`
- Current data written/read:
  - reads `profiles`, `creator_profiles`, `creator_affiliate_links`, `tribe_memberships`
  - writes `tribe_memberships`
  - writes `routing_events`
  - routes through backend `/u/:userId/route`
  - Implemented in: `apps/mobile/src/context/AppContext.js`
- Current backend endpoints used:
  - `GET /u/:user_id/route?url=...`
  - Implemented in: `services/shopify-app/src/routes/redirect-routes.js`
  - Used by: `apps/mobile/src/screens/HomeScreen.js`
  - Used by: `apps/mobile/src/screens/ShareRouteScreen.js`
- Missing backend integration if any:
  - no authenticated ownership check from mobile token is passed on supporter `/u` calls today
  - `FallbackState` still describes unsupported-domain handling, but current primary flow routes through backend and may not hit that screen for Shopify cases

### Creator

- Goal: create a creator identity, connect socials, add affiliate links, and connect brands/stores
- Current entry point:
  - Implemented in: `apps/mobile/src/screens/LoginScreen.js`
  - Implemented in: `apps/mobile/src/screens/IntentSelectionScreen.js`
- Current screens:
  - `CreatorOnboarding`
  - `CreatorDashboard`
  - `ConnectSocialAccounts`
  - `ConnectBrands`
  - `BrandProgramWebView`
  - `AddAffiliateLinks`
  - `Settings`
- Current data written/read:
  - writes `creator_profiles`
  - writes `creator_social_connections`-style data through AppContext social methods
  - writes `creator_affiliate_links` directly for external affiliate URLs
  - uses backend `creator/brands` endpoints for Shopify store connections
  - Implemented in: `apps/mobile/src/context/AppContext.js`
- Current backend endpoints used:
  - `GET /creator/brands?creator_id=...`
  - `POST /creator/brands`
  - `DELETE /creator/brands/:id`
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Used by: `apps/mobile/src/context/AppContext.js`
- Missing backend integration if any:
  - creator dashboard does not consume backend reporting endpoints such as `/creator/earnings`, `/creator/orders`, or `/creator/links`
  - external affiliate-link flow still writes directly to Supabase, not through backend

### Brand

- Goal: install Shopify integration, connect creators, and inspect attributed orders/commissions
- Current entry point:
  - UI entry point is not implemented as a dedicated brand experience
  - `IntentSelection` maps `"brand"` to `"supporter"`
  - Implemented in: `apps/mobile/src/screens/IntentSelectionScreen.js`
- Current screens:
  - no dedicated brand screens confirmed in code
- Current data written/read:
  - backend reads and writes Shopify-prefixed install, attribution, and commission tables
  - mobile app does not expose a brand dashboard
- Current backend endpoints used:
  - not used by current mobile UI
  - backend surface exists:
    - `GET /brand/shopify/install-status`
    - `GET /brand/orders`
    - `GET /brand/commissions`
    - `GET /brand/creators`
    - `GET /brand/clicks`
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
- Missing backend integration if any:
  - all brand-facing product UI is missing
  - brand ownership/auth model is only minimally hardened

## 4. Navigation Map

### Landing

- Screen name: `Landing`
- File path: `apps/mobile/src/screens/LandingScreen.js`
- User role: unauthenticated user
- Purpose: marketing-style landing page and login entry
- Entry path:
  - first screen when no `session`
  - Implemented in: `apps/mobile/src/navigation/AppNavigator.js`
- Exit/next actions:
  - `Login`
  - auto-redirect to `IntentSelection`, `CreatorDashboard`, `CreatorOnboarding`, or `Home` if already signed in
- Data source:
  - `session`, `intent`, `currentCreator`
  - Implemented in: `apps/mobile/src/context/AppContext.js`
- Backend/Supabase calls:
  - none directly in the screen
- Current UX issues:
  - not confirmed to expose product distinctions between supporter, creator, and brand flows beyond login
- Implementation notes:
  - redirect decisions happen from app state, not backend

### Login

- Screen name: `Login`
- File path: `apps/mobile/src/screens/LoginScreen.js`
- User role: unauthenticated supporter or creator
- Purpose: Google auth, password auth, or demo entry
- Entry path:
  - `Landing -> Login`
  - `ShareRoute -> Login` when trying to route while logged out
- Exit/next actions:
  - `IntentSelection`
- Data source:
  - `useAppContext()` auth methods
- Backend/Supabase calls:
  - Supabase auth:
    - `signInWithIdToken`
    - `signInWithOAuth`
    - `signInWithPassword`
  - Implemented in: `apps/mobile/src/context/AppContext.js`
- Current UX issues:
  - sign-in copy is generic and does not explain the difference between supporter and creator data paths
- Implementation notes:
  - demo login bypasses real Supabase auth

### IntentSelection

- Screen name: `IntentSelection`
- File path: `apps/mobile/src/screens/IntentSelectionScreen.js`
- User role: authenticated user choosing mode
- Purpose: choose supporter vs creator role
- Entry path:
  - after `Login`
  - after `Landing` auto-redirect when signed in but `intent` missing
- Exit/next actions:
  - `CreatorOnboarding` for creator
  - `Home` for supporter
- Data source:
  - `setIntent`
- Backend/Supabase calls:
  - indirect writes through `setIntent`
  - Implemented in: `apps/mobile/src/context/AppContext.js`
- Current UX issues:
  - `"Brand"` choice currently normalizes to `"supporter"` rather than a real brand flow
- Implementation notes:
  - Implemented in: `apps/mobile/src/screens/IntentSelectionScreen.js`

### Home

- Screen name: `Home`
- File path: `apps/mobile/src/screens/HomeScreen.js`
- User role: supporter
- Purpose: paste a destination URL and route through backend attribution
- Entry path:
  - `IntentSelection -> Home`
  - `Settings -> Home`
- Exit/next actions:
  - `CreatorDiscovery`
  - `CreatorSelection`
  - open backend `/u/:userId/route`
- Data source:
  - `session`
  - `tribeCreators`
  - `distributionMode`
  - `recordRoutingEvent`
- Backend/Supabase calls:
  - constructs backend `/u/:userId/route` URL
  - writes `routing_events` via `recordRoutingEvent`
  - Used by backend: `services/shopify-app/src/routes/redirect-routes.js`
- Current UX issues:
  - the screen still previews tribe members and local weights, but backend is the final authority for eligible creator selection and Shopify snapshot construction
- Implementation notes:
  - no client-side affiliate rewrite remains in this screen

### CreatorDiscovery

- Screen name: `CreatorDiscovery`
- File path: `apps/mobile/src/screens/CreatorDiscoveryScreen.js`
- User role: supporter
- Purpose: search creators and add/remove them from tribe
- Entry path:
  - `Home -> Add creator`
  - `Feedback -> Explore others`
- Exit/next actions:
  - add/remove tribe membership
  - `CreatorSelection`
- Data source:
  - `creators`
  - `getPreference`
  - `addToTribe`
  - `removeFromTribe`
- Backend/Supabase calls:
  - writes `tribe_memberships` through `updatePreference`
  - Implemented in: `apps/mobile/src/context/AppContext.js`
- Current UX issues:
  - discover surface is creator-centric; it does not clearly distinguish creator entities from brand-program entities
- Implementation notes:
  - supported domains shown here come from creator affiliate-link data

### CreatorSelection

- Screen name: `CreatorSelection`
- File path: `apps/mobile/src/screens/CreatorSelectionScreen.js`
- User role: supporter
- Purpose: manage selected creators and their weights
- Entry path:
  - `CreatorDiscovery`
  - `Home -> Edit`
- Exit/next actions:
  - add/remove creators
  - adjust weight
  - back to `Home`
- Data source:
  - `creators`
  - `distributionMode`
  - `getPreference`
  - `updatePreference`
- Backend/Supabase calls:
  - writes `tribe_memberships`
- Current UX issues:
  - the screen presents supporter weights as global routing intent, but Shopify routing later normalizes only across backend-eligible creators for the destination shop
- Implementation notes:
  - if `distributionMode === "even"`, manual weight controls are hidden in UI only

### ShareRoute

- Screen name: `ShareRoute`
- File path: `apps/mobile/src/screens/ShareRouteScreen.js`
- User role: supporter or unauthenticated user opening a shared/deep-linked URL
- Purpose: process shared URLs and open backend route
- Entry path:
  - mounted in every navigator branch
  - receives `route.params.url` and `route.params.source`
- Exit/next actions:
  - `Login`
  - `IntentSelection`
  - open backend `/u/:userId/route`
- Data source:
  - `session`
  - `intent`
  - `recordRoutingEvent`
  - deep-link parser helpers
- Backend/Supabase calls:
  - constructs backend `/u/:userId/route`
  - writes `routing_events` via `recordRoutingEvent`
- Current UX issues:
  - copy mentions URL validation and creator settings, but not the difference between external affiliate routing and Atribe Shopify split attribution
- Implementation notes:
  - current path is backend-driven, not local URL rewriting

### CreatorOnboarding

- Screen name: `CreatorOnboarding`
- File path: `apps/mobile/src/screens/CreatorOnboardingScreen.js`
- User role: creator
- Purpose: create creator profile, select platforms/niches, connect socials
- Entry path:
  - `IntentSelection -> CreatorOnboarding`
  - `Landing` redirect when signed-in creator has no completed profile
- Exit/next actions:
  - `CreatorDashboard`
  - social account linking
- Data source:
  - `completeCreatorOnboarding`
  - `connectSocialAccount`
  - `creatorSocialAccounts`
  - `session`
- Backend/Supabase calls:
  - direct Supabase profile/creator writes through `completeCreatorOnboarding`
  - direct Supabase auth identity linking for social OAuth
  - social account storage through `connectSocialAccount`
- Current UX issues:
  - onboarding is creator-centric and does not explain how Shopify creator-brand links differ from generic external affiliate links
- Implementation notes:
  - social OAuth is currently web-oriented for provider account linking

### CreatorDashboard

- Screen name: `CreatorDashboard`
- File path: `apps/mobile/src/screens/CreatorDashboardScreen.js`
- User role: creator
- Purpose: launch creator tools
- Entry path:
  - `CreatorOnboarding`
  - app start when signed-in creator already has profile
- Exit/next actions:
  - `ConnectBrands`
  - `ConnectSocialAccounts`
  - `AddAffiliateLinks`
  - `CreatorSelection`
- Data source:
  - `currentCreator`
- Backend/Supabase calls:
  - none directly in this screen
- Current UX issues:
  - “Added brands” count is currently derived from `currentCreator.links` and does not clearly represent backend `creatorBrandLinks` Shopify associations
- Implementation notes:
  - no creator earnings/orders reporting is surfaced here yet

### ConnectBrands

- Screen name: `ConnectBrands`
- File path: `apps/mobile/src/screens/ConnectBrandsScreen.js`
- User role: creator
- Purpose: browse static brand programs and initiate external affiliate-link or Shopify-brand connection flows
- Entry path:
  - `CreatorDashboard`
- Exit/next actions:
  - save connection directly
  - `BrandProgramWebView`
  - `CreatorDashboard`
- Data source:
  - local `brandPrograms`
  - `currentCreator.links`
  - `creatorBrandLinks`
  - social audience snapshots for country-based recommendations
- Backend/Supabase calls:
  - external save path uses `addAffiliateLink`, which writes direct to `creator_affiliate_links`
  - Shopify domain save path also goes through `addAffiliateLink`, which branches to backend `POST /creator/brands`
- Current UX issues:
  - screen does not clearly label which program rows are external affiliate programs vs Atribe-powered Shopify brands
  - current catalog is static local data, not backend-discovered brand data
- Implementation notes:
  - “Connected” state merges direct affiliate-link domains and backend creator-brand links

### BrandProgramWebView

- Screen name: `BrandProgramWebView`
- File path: `apps/mobile/src/screens/BrandProgramWebViewScreen.js`
- User role: creator
- Purpose: open partner program page and save either external affiliate link or Shopify store association
- Entry path:
  - `ConnectBrands -> Join program`
- Exit/next actions:
  - save connection
  - switch to country-specific program pages
  - return to `ConnectBrands`
- Data source:
  - `route.params` from `ConnectBrands`
  - `creatorBrandLinks`
  - `currentCreator.links`
- Backend/Supabase calls:
  - external save path uses `addAffiliateLink` -> direct `creator_affiliate_links`
  - Shopify save path uses `createCreatorBrandLink` -> backend `POST /creator/brands`
- Current UX issues:
  - the same screen handles two materially different models:
    - external affiliate link capture
    - Shopify creator-store association
  - the distinction is present in copy, but not yet structurally strong in the navigation model
- Implementation notes:
  - Shopify connection hides affiliate URL/coupon inputs

### AddAffiliateLinks

- Screen name: `AddAffiliateLinks`
- File path: `apps/mobile/src/screens/AddAffiliateLinksScreen.js`
- User role: creator
- Purpose: directly add external affiliate links or Shopify store domains
- Entry path:
  - `CreatorDashboard`
- Exit/next actions:
  - save connection
  - remove external link
  - archive Shopify creator-brand link
  - back to `CreatorDashboard`
- Data source:
  - `currentCreator.links`
  - `creatorBrandLinks`
- Backend/Supabase calls:
  - external link save -> direct Supabase `creator_affiliate_links`
  - Shopify store save -> backend `POST /creator/brands`
  - Shopify archive -> backend `DELETE /creator/brands/:id`
- Current UX issues:
  - “Active connections” combines two different storage models in one list
- Implementation notes:
  - domain type is inferred from `.myshopify.com`

### ConnectSocialAccounts

- Screen name: `ConnectSocialAccounts`
- File path: `apps/mobile/src/screens/ConnectSocialAccountsScreen.js`
- User role: creator
- Purpose: connect creator social platforms
- Entry path:
  - `CreatorDashboard`
  - `Settings`
  - onboarding follow-on
- Exit/next actions:
  - connect account
  - return to `CreatorDashboard`
- Data source:
  - `creatorSocialAccounts`
  - `session`
  - selected onboarding platform state
- Backend/Supabase calls:
  - Supabase `auth.linkIdentity`
  - `connectSocialAccount` in app context
- Current UX issues:
  - platform connection maturity varies by provider and web/mobile behavior
- Implementation notes:
  - provider-account choice modal exists for Google/Facebook-family cases

### Settings

- Screen name: `Settings`
- File path: `apps/mobile/src/screens/SettingsScreen.js`
- User role: supporter or creator
- Purpose: switch active role, routing mode, tutorial, socials, and sign out
- Entry path:
  - from `AppShell` navigation controls
- Exit/next actions:
  - switch role
  - `CreatorOnboarding`
  - `Home`
  - `ConnectSocialAccounts`
- Data source:
  - `intent`
  - `distributionMode`
  - `session`
  - `creatorSocialAccounts`
- Backend/Supabase calls:
  - indirect state writes through `setIntent`, `setDistributionMode`, `signOut`
- Current UX issues:
  - “Brand” is not represented as an actual independent role here
- Implementation notes:
  - routing mode is a UI preference over supporter weights, not the final backend split logic

### FallbackState

- Screen name: `FallbackState`
- File path: `apps/mobile/src/screens/FallbackStateScreen.js`
- User role: supporter
- Purpose: collect unsupported domain requests
- Entry path:
  - not confirmed in current active routing flow
- Exit/next actions:
  - submit domain request
  - `CreatorDiscovery`
- Data source:
  - `submitDomainRequest`
- Backend/Supabase calls:
  - local app-state request capture through AppContext
- Current UX issues:
  - not confirmed to be connected to the current backend `/u` routing path
- Implementation notes:
  - this screen may represent older unsupported-domain handling

### Feedback

- Screen name: `Feedback`
- File path: `apps/mobile/src/screens/FeedbackScreen.js`
- User role: supporter
- Purpose: success-style confirmation screen after routing
- Entry path:
  - not confirmed in the active supporter routing path after backend `/u` adoption
- Exit/next actions:
  - `Home`
  - `CreatorDiscovery`
- Data source:
  - `route.params.creatorName`
  - `route.params.domain`
- Backend/Supabase calls:
  - none
- Current UX issues:
  - screen copy still assumes a creator-specific support outcome, while backend `/u` may resolve eligibility or house fallback without mobile knowing the final creator state locally
- Implementation notes:
  - appears to be a legacy UX screen relative to the current backend-driven route opening flow

## 5. Supporter Flow

### 1. Login

- What user sees:
  - landing page, then login screen with Google, email/password, or demo
- What code currently does:
  - signs into Supabase or creates a demo session
- Whether it uses backend `/u/:userId/route`:
  - no
- Whether it writes directly to Supabase:
  - yes, via auth/session handling
- Current friction/UX issues:
  - the route between login and role selection is clear, but brand mode is not actually separate

### 2. Discover/search creators

- What user sees:
  - searchable list of creators, niche filters, supported domains
- What code currently does:
  - filters local creator dataset loaded through AppContext
  - add/remove creator from tribe
- Whether it uses backend `/u/:userId/route`:
  - no
- Whether it writes directly to Supabase:
  - yes, `tribe_memberships`
- Current friction/UX issues:
  - discover is creator-focused and does not distinguish between creator discovery and brand discovery

### 3. Add creators to tribe

- What user sees:
  - add/remove buttons and weight controls
- What code currently does:
  - writes supporter preferences to `tribe_memberships`
  - `distributionMode` alters whether weight controls are shown
- Whether it uses backend `/u/:userId/route`:
  - no
- Whether it writes directly to Supabase:
  - yes
- Current friction/UX issues:
  - supporter weight values are shown as global intent, but backend routing later filters and normalizes only the eligible subset

### 4. Route/paste/open product links

- What user sees:
  - `Home` or `ShareRoute` accepts a destination URL and presents a routed backend URL
- What code currently does:
  - builds backend `/u/:userId/route?url=...`
  - opens that route
  - records a mobile `routing_events` row
- Whether it uses backend `/u/:userId/route`:
  - yes
- Whether it writes directly to Supabase:
  - yes, `routing_events`
- Current friction/UX issues:
  - mobile does not display whether the target resolved as:
    - external single-creator routing
    - Shopify eligible subset split
    - house fallback

### 5. Open shopping destination

- What user sees:
  - final destination opens after the backend redirect
- What code currently does:
  - backend decides:
    - platform type
    - external selected creator
    - Shopify snapshot
    - house fallback
- Whether it uses backend `/u/:userId/route`:
  - yes
- Whether it writes directly to Supabase:
  - no from the screen itself; backend writes click/snapshot rows
- Current friction/UX issues:
  - final routing decision is opaque to the user in the mobile UI

### 6. Attribution behavior

- What user sees:
  - no explicit supporter-facing attribution audit UI
- What code currently does:
  - storefront embed persists attribution
  - Shopify webhooks create order attribution and commission rows
- Whether it uses backend `/u/:userId/route`:
  - yes, for click creation
- Whether it writes directly to Supabase:
  - mobile no; backend yes when in Supabase mode
- Current friction/UX issues:
  - supporter cannot inspect whether a route became:
    - external single-creator attribution
    - Shopify split attribution
    - house fallback

## 6. Creator Flow

### 1. Login / choose creator flow

- Screen/file:
  - `apps/mobile/src/screens/LoginScreen.js`
  - `apps/mobile/src/screens/IntentSelectionScreen.js`
- Data written:
  - auth session
  - `preferred_intent` through app-state persistence
- Whether backend creator endpoints are used:
  - no
- Whether direct Supabase writes happen:
  - yes
- Contradictions with `IMPLEMENTATION.md`:
  - brand role is not a real independent role in UI

### 2. Set up creator profile

- Screen/file:
  - `apps/mobile/src/screens/CreatorOnboardingScreen.js`
- Data written:
  - creator profile
  - niche/platform choices
  - social connections
- Whether backend creator endpoints are used:
  - no
- Whether direct Supabase writes happen:
  - yes
- Contradictions with `IMPLEMENTATION.md`:
  - creator identity is mobile-first and direct-to-Supabase, while creator reporting remains backend-only and unused

### 3. Add affiliate links

- Screen/file:
  - `apps/mobile/src/screens/AddAffiliateLinksScreen.js`
  - `apps/mobile/src/screens/BrandProgramWebViewScreen.js`
- Data written:
  - external affiliate links to `creator_affiliate_links`
  - Shopify store connections to backend `creator/brands`
- Whether backend creator endpoints are used:
  - yes for Shopify store connections
  - no for external affiliate links
- Whether direct Supabase writes happen:
  - yes for external affiliate links
- Contradictions with `IMPLEMENTATION.md`:
  - mixed storage model is intentional but still creates a unified UI list over different persistence paths

### 4. Add/connect brands

- Screen/file:
  - `apps/mobile/src/screens/ConnectBrandsScreen.js`
  - `apps/mobile/src/screens/BrandProgramWebViewScreen.js`
- Data written:
  - external affiliate links directly
  - Shopify creator-brand links via backend
- Whether backend creator endpoints are used:
  - yes for Shopify store domains
- Whether direct Supabase writes happen:
  - yes for external programs
- Contradictions with `IMPLEMENTATION.md`:
  - current UI still presents a single “connect brands” experience over two different integration models

### 5. View creator dashboard

- Screen/file:
  - `apps/mobile/src/screens/CreatorDashboardScreen.js`
- Data written:
  - none
- Whether backend creator endpoints are used:
  - no
- Whether direct Supabase writes happen:
  - no
- Contradictions with `IMPLEMENTATION.md`:
  - backend creator reporting endpoints exist, but this screen does not use them

## 7. Brand Flow

### Implemented UI

- No dedicated brand dashboard UI is confirmed in code.
- `IntentSelection` shows a `Brand` option, but selecting it maps to supporter mode.
  - Implemented in: `apps/mobile/src/screens/IntentSelectionScreen.js`

### Implemented backend

- Shopify install/auth
- creator-brand link storage
- shop integration state
- order attribution and commissions
- brand reporting endpoints
  - Implemented in: `services/shopify-app/src/app.js`
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`

### Missing UI

- no brand install-status screen
- no brand creator-management screen
- no brand orders/commissions screen
- no brand auth/ownership UI

### Shopify install flow

- Merchant opens custom install link
- Shopify opens app entry
- backend bootstraps to `/auth` when needed
- OAuth callback stores offline token and register webhooks/embed support
  - Implemented in: `services/shopify-app/src/app.js`
  - Implemented in: `services/shopify-app/src/controllers/auth-controller.js`

### Creator-brand link model

- Shopify creator-brand links live in backend storage and are used for eligibility-aware supporter routing.
  - Implemented in: `services/shopify-app/src/repositories/creator-brand-link-repository.js`
  - Used by: `services/shopify-app/src/services/link-service.js`

### Brand dashboard endpoints

- `GET /brand/shopify/install-status`
- `GET /brand/orders`
- `GET /brand/commissions`
- `GET /brand/creators`
- `GET /brand/clicks`
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`

## 8. Browser Extension Flow

- Files:
  - `atribe-extension/manifest.json`
  - `atribe-extension/content.js`
  - `atribe-extension/options.html`
  - `atribe-extension/options.js`
- Supported domains:
  - Amazon product pages matching `/dp/`
- Current hardcoded behavior:
  - none for affiliate tags
- Whether it uses backend:
  - yes, routes through `/u/:userId/route`
- Current limitations:
  - manual backend URL configuration
  - manual supporter user-id configuration
  - no auth/session model
  - only Amazon supported
  - no Shopify storefront auto-detection
- Intended integration gap:
  - extension still does not represent full supporter identity/auth, and it does not yet cover Shopify-store entry behavior

## 9. Backend Touchpoint Map

```text
Landing / Login → Supabase auth + local navigation state → same → no major gap
IntentSelection → local app-state role switch → same → brand choice is not a real brand flow
Home routing → backend /u + local routing_events → backend /u + richer supporter feedback → UI does not expose final routing outcome
ShareRoute → backend /u + local routing_events → same → outcome transparency gap
CreatorDiscovery → direct Supabase tribe_memberships → same for selection storage → discover model still creator-centric
CreatorSelection → direct Supabase tribe_memberships → same for selection storage → backend later normalizes eligible subset only
CreatorOnboarding → direct Supabase creator/social setup → same for now → backend reporting remains unused
AddAffiliateLinks external → direct Supabase creator_affiliate_links → maybe backend later, not required today → mixed persistence model
AddAffiliateLinks Shopify → backend creator/brands → same → UI still merges different connection types in one list
ConnectBrands external → direct Supabase via addAffiliateLink → same for now → external vs Shopify distinction is weak
ConnectBrands Shopify → backend creator/brands via addAffiliateLink branch / webview flow → same → static catalog, not backend-driven
BrandProgramWebView external → direct Supabase creator_affiliate_links → same for now → mixed model in one screen
BrandProgramWebView Shopify → backend creator/brands → same → UI combines two different workflows
CreatorDashboard → local creator state only → should eventually include backend reporting → backend data exists but is unused
Brand flow → backend only → backend + dedicated UI → product UI missing
Extension → backend /u with stored config → backend /u with stronger identity model → auth/config gap
```

## 10. UX Contradiction List

### 1. Brand role is presented in UI but not implemented as a real brand product flow

- Current UI behavior:
  - `IntentSelection` shows `Brand` as a role choice
- Current backend capability:
  - backend has brand reporting/install endpoints, but no corresponding product UI
- Why it matters:
  - users can infer a brand dashboard exists when it does not
- Files involved:
  - `apps/mobile/src/screens/IntentSelectionScreen.js`
  - `services/shopify-app/src/routes/dashboard-routes.js`
- Suggested fix direction:
  - either hide the brand choice or back it with a real brand flow

### 2. Creator dashboard implies brand-management progress but does not reflect backend Shopify creator-brand state cleanly

- Current UI behavior:
  - dashboard count is based on `currentCreator.links`
- Current backend capability:
  - backend creator-brand links are stored separately and power Shopify routing eligibility
- Why it matters:
  - creator may have backend Shopify connections that are not represented clearly in top-level dashboard summary
- Files involved:
  - `apps/mobile/src/screens/CreatorDashboardScreen.js`
  - `apps/mobile/src/context/AppContext.js`
- Suggested fix direction:
  - unify dashboard summary over both external links and backend Shopify creator-brand links

### 3. Discover does not clearly distinguish creators, external brands, and Atribe-powered brands

- Current UI behavior:
  - `CreatorDiscovery` is only about creators
  - `ConnectBrands` is a static local brand-program catalog
- Current backend capability:
  - backend distinguishes `external` vs `atribe_shopify` during routing
- Why it matters:
  - the product model is mixed: “discover creators” and “connect brands” are separate, but users do not see the attribution-type distinction
- Files involved:
  - `apps/mobile/src/screens/CreatorDiscoveryScreen.js`
  - `apps/mobile/src/screens/ConnectBrandsScreen.js`
  - `services/shopify-app/src/services/link-service.js`
- Suggested fix direction:
  - add explicit program-type labelling in the UI

### 4. Product and headless-store experience is not defined around current catalog limitations

- Current UI behavior:
  - `ConnectBrands` uses local `brandPrograms` data
  - `BrandProgramWebView` opens third-party program pages
- Current backend capability:
  - backend can attribute Shopify stores, but there is no user-facing product/store discovery surface for those brands
- Why it matters:
  - Atribe-powered Shopify commerce exists in backend logic, but not as a native in-app shopping surface
- Files involved:
  - `apps/mobile/src/data/brandPrograms.js`
  - `apps/mobile/src/screens/BrandProgramWebViewScreen.js`
  - `services/shopify-app/src/services/link-service.js`
- Suggested fix direction:
  - define whether brand pages are catalog pages, partner pages, or simple routing entry points

### 5. Fallback and feedback screens appear less connected to the current backend-driven routing path

- Current UI behavior:
  - `FallbackState` and `Feedback` still exist as user-facing screens
- Current backend capability:
  - backend `/u` handles routing decisions directly, including Shopify house fallback
- Why it matters:
  - it is not clear from current navigation whether those screens are part of the active runtime path or older UX remnants
- Files involved:
  - `apps/mobile/src/screens/FallbackStateScreen.js`
  - `apps/mobile/src/screens/FeedbackScreen.js`
  - `services/shopify-app/src/routes/redirect-routes.js`
- Suggested fix direction:
  - confirm whether these screens still belong in the current routing journey

## 11. Discover Model

Current code supports these product concepts:

### Creators

- primary supporter discovery entity
- selected into tribes
- can have external affiliate links
- can have backend Shopify creator-brand associations
- Implemented in: `apps/mobile/src/screens/CreatorDiscoveryScreen.js`
- Implemented in: `apps/mobile/src/context/AppContext.js`

### Brands

- currently represented in creator UI as static `brandPrograms`
- not represented as a supporter-facing discover surface
- Implemented in: `apps/mobile/src/data/brandPrograms.js`
- Used by: `apps/mobile/src/screens/ConnectBrandsScreen.js`

### Collections

- not confirmed in code as a first-class runtime entity

### Brand program types

Current practical categories:

- `external_affiliate`
  - example: Amazon Associates, Flipkart, Canva
  - route out to external partner pages
  - creator saves an affiliate URL directly
  - backend may later select one creator at click time for supporter routing

- `atribe_shopify`
  - example: installed Shopify shops managed by Atribe backend
  - supporter routes through backend `/u`
  - backend creates snapshot and split commission behavior
  - creator brand connection is stored in backend creator-brand links

- `coupon_only / future types`
  - not confirmed in current mobile runtime as a first-class type
  - backend has coupon mapping support
  - Implemented in: `services/shopify-app/src/repositories/creator-coupon-repository.js`

Current UI limitation:

- the mobile UI does not consistently surface these types as explicit user-facing program categories

## 12. Open UX Questions

- Should brand pages be landing pages rather than headless stores?
- How should users understand Atribe-powered Shopify brands versus external partner programs?
- Where should creator-brand connection live long term: `ConnectBrands`, `AddAffiliateLinks`, or a dedicated brand relationship screen?
- What is the minimum mobile flow for low-friction routing without hiding backend attribution outcomes?
- How should extension identity be configured beyond manual backend URL and supporter user-id storage?

## 13. Next Implementation Priorities

Based on current contradictions only:

1. route mobile supporter links through backend `/u`
   - Current state: implemented
   - Remaining work: improve supporter-facing feedback about final routing outcome

2. move creator Shopify brand connections through backend APIs
   - Current state: implemented for Shopify store domains
   - Remaining work: make the UI distinction between external and Shopify connection types stronger

3. update Discover to distinguish creators, external brands, and Atribe-powered brands
   - Current state: not implemented as a clear user-facing model

4. update extension to backend-driven routing
   - Current state: implemented for Amazon product pages only
   - Remaining work: identity/config maturity and broader domain coverage

5. add auth hardening before production dashboard work
   - Current state: minimal auth guard exists
   - Remaining work: stronger brand ownership enforcement and production-grade access control

## Areas Not Confirmed In Code

- A dedicated brand UI flow beyond the placeholder `Brand` role choice
- A first-class “collections” model
- Whether `FallbackState` and `Feedback` are still part of the active routed-link journey
- A mobile or web surface that consumes backend brand reporting endpoints
