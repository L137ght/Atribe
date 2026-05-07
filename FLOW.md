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

- Role: current primary product surface for supporters, creators, and brands
- Current maturity: active UI with working supporter routing, creator onboarding, creator affiliate-link management, partial Shopify creator-brand connection support, and brand onboarding/Shopify connection/campaign creation
- Main files/folders:
  - Implemented in: `apps/mobile/App.js`
  - Implemented in: `apps/mobile/src/navigation/AppNavigator.js`
  - Implemented in: `apps/mobile/src/context/AppContext.js`
  - Implemented in: `apps/mobile/src/screens/*`
- What it currently owns:
  - auth entry
  - role selection (supporter, creator, brand)
  - supporter creator discovery and tribe selection
  - supporter link routing entry
  - creator onboarding
  - creator affiliate-link management
  - creator brand-program browsing
  - partial Shopify creator-brand connection through backend endpoints
  - brand Shopify store connection flow
  - brand campaign creation and gating
  - brand home status view
  - price history inspection for Amazon/Flipkart product links via PriceHistoryApp

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
- Current maturity: operational backend with proven Shopify attribution, multi-creator snapshot splitting, creator-brand link storage, campaign creation, and creator/brand JSON endpoints
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
  - brand campaign creation APIs

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
  - creator social accounts and audience snapshots
  - tribe memberships
  - external affiliate links
  - domain requests
  - routing events
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
  - `WebView`
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

- Goal: install Shopify integration, create campaigns, connect creators, and inspect attributed orders/commissions
- Current entry point:
  - `IntentSelection` maps `"brand"` to the brand onboarding flow
  - Implemented in: `apps/mobile/src/screens/IntentSelectionScreen.js`
  - Navigated by: `apps/mobile/src/navigation/AppNavigator.js`
- Current screens:
  - `BrandOnboarding` — enter Shopify store domain
  - `BrandConnecting` — opens Shopify OAuth install, polls backend for install confirmation
  - `BrandShopifySuccess` — confirms connected shop, prompts campaign creation
  - `CampaignGate` — requires an active campaign before accessing `BrandHome`
  - `CreateCampaign` — campaign name, shopper offer, commission rate, duration
  - `CampaignSuccess` — confirmation with share/invite action
  - `BrandHome` — minimal brand status view (connected shop, campaign status, commission pool)
- Current data written/read:
  - reads `shopify_brand_integrations`, `shopify_shops`, `shopify_campaigns` via backend endpoints
  - writes `shopify_campaigns` via `POST /brand/campaigns`
  - persists `brandShopDomain` in app state via AsyncStorage
  - Implemented in: `apps/mobile/src/context/AppContext.js`
- Current backend endpoints used:
  - `GET /brand/shopify/install-status?shop_domain=...`
  - `POST /brand/campaigns`
  - `GET /auth?shop=...` (for Shopify install URL construction)
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`
  - Used by: `apps/mobile/src/context/AppContext.js`
- Missing backend integration if any:
  - brand reporting endpoints (`/brand/orders`, `/brand/commissions`, `/brand/creators`, `/brand/clicks`) exist but are not consumed by mobile UI
  - brand ownership/auth model is only minimally hardened
  - `BrandHome` is a minimal status view; creator management and detailed analytics are not yet surfaced

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
  - `"Brand"` choice navigates to the brand onboarding flow; brand is now an independent role with dedicated screens
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
  - calls backend `GET /api/price-history/lookup?url=...` when Amazon or Flipkart link detected (debounced, 800ms)
  - Used by backend: `services/shopify-app/src/routes/redirect-routes.js`
  - Used by backend: `services/shopify-app/src/routes/price-history-routes.js`
- Current UX issues:
  - the screen still previews tribe members and local weights, but backend is the final authority for eligible creator selection and Shopify snapshot construction
  - Amazon/Flipkart price history card appears below the shopping intel card; ProductHistory.in is tried first, PriceHistoryApp.com is fallback
- Implementation notes:
  - no client-side affiliate rewrite remains in this screen
  - price history uses dual-provider backend orchestration with caching

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
  - no creator earnings/orders reporting is surfaced here yet
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

### WebView

- Screen name: `WebView`
- File path: `apps/mobile/src/screens/WebViewScreen.js`
- User role: supporter (available to all signed-in roles)
- Purpose: generic in-app browser for any URL
- Entry path:
  - navigated to programmatically from any screen with `route.params.initialUrl`
- Exit/next actions:
  - close (navigate back)
  - navigate within webview
  - open external links in system browser
- Data source:
  - `route.params.initialUrl`
- Backend/Supabase calls:
  - none directly
- Current UX issues:
  - only available on iOS and Android; web platform shows empty state
- Implementation notes:
  - renders `react-native-webview` with cookie/storage support and URL allow-list filtering

### BrandOnboarding

- Screen name: `BrandOnboarding`
- File path: `apps/mobile/src/screens/BrandOnboardingScreen.js`
- User role: brand
- Purpose: enter Shopify store domain and initiate Shopify connection
- Entry path:
  - `IntentSelection` when role is `"brand"` and no connected store exists
- Exit/next actions:
  - `BrandConnecting` — opens Shopify OAuth install
  - `CampaignGate` — if store already connected and active campaign exists
  - `BrandHome` — if store is connected with active campaign
  - `Settings` — skip for now
- Data source:
  - `brandInstallStatus`, `brandInstallStatusLoading`, `brandShopDomain`
  - `setBrandShopDomain`, `refreshBrandInstallStatus`
- Backend/Supabase calls:
  - `GET /brand/shopify/install-status` through `refreshBrandInstallStatus`
  - `setBrandShopDomain` persists shop domain to AsyncStorage and fetches install status
- Current UX issues:
  - requires backend URL configuration (`EXPO_PUBLIC_ATRIBE_BACKEND_URL`)
- Implementation notes:
  - shows connection status card and backend-configuration notice

### BrandConnecting

- Screen name: `BrandConnecting`
- File path: `apps/mobile/src/screens/BrandConnectingScreen.js`
- User role: brand
- Purpose: open Shopify OAuth install flow and poll for connection confirmation
- Entry path:
  - `BrandOnboarding` after entering shop domain
- Exit/next actions:
  - `BrandShopifySuccess` — after install is confirmed
  - stay on screen with error message if install not detected
- Data source:
  - `route.params.shopDomain`
  - `setBrandShopDomain`, `refreshBrandInstallStatus`
- Backend/Supabase calls:
  - builds backend `/auth?shop=...` URL via `buildBrandShopifyInstallUrl`
  - opens Shopify OAuth install URL
  - polls `GET /brand/shopify/install-status` on "I connected my store"
- Current UX issues:
  - polling requires user to manually tap "I connected my store" after completing Shopify OAuth

### BrandShopifySuccess

- Screen name: `BrandShopifySuccess`
- File path: `apps/mobile/src/screens/BrandShopifySuccessScreen.js`
- User role: brand
- Purpose: confirm store is connected and prompt campaign creation
- Entry path:
  - `BrandConnecting` after install confirmation
  - deep link `brand/shopify-connected`
- Exit/next actions:
  - `CreateCampaign` — create first campaign
  - `CampaignGate` — skip for now
- Data source:
  - `brandInstallStatus`, `brandInstallStatusLoading`, `brandShopDomain`
  - `setBrandShopDomain`, `refreshBrandInstallStatus`
- Backend/Supabase calls:
  - `GET /brand/shopify/install-status` on mount to sync connected shop state
- Current UX issues:
  - screen auto-syncs install status on mount; loading state while checking

### CampaignGate

- Screen name: `CampaignGate`
- File path: `apps/mobile/src/screens/CampaignGateScreen.js`
- User role: brand
- Purpose: gate screen requiring an active campaign before accessing BrandHome
- Entry path:
  - `BrandOnboarding` when store connected but no active campaign
  - `BrandShopifySuccess` when skipping campaign creation
  - any redirect when `brandHasActiveCampaign` is false
- Exit/next actions:
  - `CreateCampaign`
  - auto-redirect to `BrandHome` if campaign becomes active
- Data source:
  - `brandHasActiveCampaign`, `brandShopDomain`
- Backend/Supabase calls:
  - none directly
- Current UX issues:
  - UX is a hard gate; no way to skip past this screen without creating a campaign

### CreateCampaign

- Screen name: `CreateCampaign`
- File path: `apps/mobile/src/screens/CreateCampaignScreen.js`
- User role: brand
- Purpose: form to create a creator campaign with name, shopper offer, payout rate, and duration
- Entry path:
  - `CampaignGate`
  - `BrandShopifySuccess`
  - `BrandHome`
- Exit/next actions:
  - `CampaignSuccess` — on successful creation
  - `CampaignGate` — skip for now
- Data source:
  - `brandInstallStatus`, `brandShopDomain`
  - `createBrandCampaign`
- Backend/Supabase calls:
  - `POST /brand/campaigns` via `createBrandCampaign`
  - Writes: `shopify_campaigns`
- Current UX issues:
  - shopper offer parsing is regex-based for percentages and free shipping; other offer types may not parse correctly

### CampaignSuccess

- Screen name: `CampaignSuccess`
- File path: `apps/mobile/src/screens/CampaignSuccessScreen.js`
- User role: brand
- Purpose: confirmation after campaign creation with share/invite action
- Entry path:
  - `CreateCampaign` after successful campaign creation
- Exit/next actions:
  - `BrandHome`
  - share invite via system share sheet
- Data source:
  - `route.params.campaignId`, `route.params.commissionRatePercent`, `route.params.shopDomain`
  - `brandShopDomain`
- Backend/Supabase calls:
  - none directly
- Implementation notes:
  - share action uses React Native `Share.share` with campaign details

### BrandHome

- Screen name: `BrandHome`
- File path: `apps/mobile/src/screens/BrandHomeScreen.js`
- User role: brand
- Purpose: minimal brand status view showing connected shop, campaign status, and commission pool
- Entry path:
  - app start when brand has active campaign
  - `CampaignSuccess`
  - `Settings`
- Exit/next actions:
  - `CreateCampaign` — create another campaign
  - `Settings`
  - auto-redirect to `CampaignGate` if no active campaign
- Data source:
  - `brandHasActiveCampaign`, `brandInstallStatus`, `brandShopDomain`
- Backend/Supabase calls:
  - none directly in the screen; data flows from `brandInstallStatus` (populated via `refreshBrandInstallStatus` elsewhere)
- Current UX issues:
  - commission pool display uses campaign rate or default rate from install status; actual backend commission data is not queried
  - no creator management or detailed order analytics surfaced

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
  - “Brand” is now a real independent role with dedicated screens and flow
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

### 5. Price history check (Amazon / Flipkart only)

- What user sees:
  - when an Amazon or Flipkart link is pasted, a price history card appears below the input after a brief check
  - the card shows product title, current/lowest/highest/average prices, deal verdict, a price trend chart, provider source (ProductHistory or PriceHistoryApp), and a link to the full provider page
- What code currently does:
  - detects Amazon/Flipkart domain from the pasted URL
  - extracts product title from the URL path
  - calls backend `GET /api/price-history/lookup?url=...` with 800ms debounce
  - backend tries ProductHistory.in first (search-based, no suffix guessing), then falls back to PriceHistoryApp.com
  - backend caches results in memory (6h success TTL, 30min empty TTL)
  - renders a themed `PriceHistoryCard` below the shopping intel card
- Whether it uses backend `/u/:userId/route`:
  - no (separate backend endpoint)
- Whether it writes directly to Supabase:
  - no
- Current friction/UX issues:
  - ProductHistory search-based resolution depends on their search page markup, which may change
  - PriceHistoryApp fallback uses slug approximation which may not always match
  - price history is supplemental only; primary routing flow is unaffected by failures

### 6. Open shopping destination

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

### 7. Attribution behavior

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

- Brand has a dedicated mobile flow with 7 screens: `BrandOnboarding`, `BrandConnecting`, `BrandShopifySuccess`, `CampaignGate`, `CreateCampaign`, `CampaignSuccess`, `BrandHome`.
  - Implemented in: `apps/mobile/src/screens/BrandOnboardingScreen.js`
  - Implemented in: `apps/mobile/src/screens/BrandConnectingScreen.js`
  - Implemented in: `apps/mobile/src/screens/BrandShopifySuccessScreen.js`
  - Implemented in: `apps/mobile/src/screens/CampaignGateScreen.js`
  - Implemented in: `apps/mobile/src/screens/CreateCampaignScreen.js`
  - Implemented in: `apps/mobile/src/screens/CampaignSuccessScreen.js`
  - Implemented in: `apps/mobile/src/screens/BrandHomeScreen.js`

- `IntentSelection` presents `Brand` as a real, independent role choice that navigates to the brand flow.
  - Implemented in: `apps/mobile/src/screens/IntentSelectionScreen.js`
  - Navigated by: `apps/mobile/src/navigation/AppNavigator.js`

### Implemented backend

- Shopify install/auth
- creator-brand link storage
- shop integration state
- order attribution and commissions
- brand campaign creation and status
- brand reporting endpoints
  - Implemented in: `services/shopify-app/src/app.js`
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`

### Brand journey

1. **Select brand role** — `IntentSelection` -> Brand
   - Screen/file: `apps/mobile/src/screens/IntentSelectionScreen.js`
   - Data written: `profiles.preferred_intent` = `"brand"`
   - Navigator routes to `BrandOnboarding` (no store) or `CampaignGate`/`BrandHome` (connected store)

2. **Enter Shopify domain** — `BrandOnboarding`
   - Screen/file: `apps/mobile/src/screens/BrandOnboardingScreen.js`
   - Data read: `brandInstallStatus`, `brandShopDomain` from AppContext
   - Backend call: `GET /brand/shopify/install-status`
   - Exit: `BrandConnecting`

3. **Connect Shopify** — `BrandConnecting`
   - Screen/file: `apps/mobile/src/screens/BrandConnectingScreen.js`
   - Opens Shopify OAuth install URL via `Linking.openURL(buildBrandShopifyInstallUrl(...))`
   - Backend call: builds backend `/auth?shop=...` URL
   - User taps "I connected my store" to poll backend install status
   - Exit: `BrandShopifySuccess` when install confirmed

4. **Confirm connection** — `BrandShopifySuccess`
   - Screen/file: `apps/mobile/src/screens/BrandShopifySuccessScreen.js`
   - Auto-syncs install status on mount via `refreshBrandInstallStatus`
   - Exit: `CreateCampaign` or `CampaignGate`

5. **Campaign gate** — `CampaignGate`
   - Screen/file: `apps/mobile/src/screens/CampaignGateScreen.js`
   - Requires active campaign to access `BrandHome`; auto-redirects if campaign becomes active
   - Exit: `CreateCampaign`

6. **Create campaign** — `CreateCampaign`
   - Screen/file: `apps/mobile/src/screens/CreateCampaignScreen.js`
   - Backend call: `POST /brand/campaigns` via `createBrandCampaign`
   - Writes: `shopify_campaigns`
   - Exit: `CampaignSuccess`

7. **Campaign success** — `CampaignSuccess`
   - Screen/file: `apps/mobile/src/screens/CampaignSuccessScreen.js`
   - Shows confirmation with share/invite-creators action
   - Exit: `BrandHome`

8. **Brand home** — `BrandHome`
   - Screen/file: `apps/mobile/src/screens/BrandHomeScreen.js`
   - Minimal status view: connected shop domain, campaign status, commission pool
   - Auto-redirects to `CampaignGate` if no active campaign
   - Exit: `CreateCampaign`, `Settings`

### Shopify install flow

- Brand enters shop domain in mobile
- Mobile builds backend `/auth?shop=...` URL and opens it
- Backend bootstraps to Shopify OAuth when needed
- OAuth callback stores offline token and registers webhooks/script tags
- Mobile polls `GET /brand/shopify/install-status` to confirm
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
- `POST /brand/campaigns`
  - Implemented in: `services/shopify-app/src/routes/dashboard-routes.js`

### Missing UI

- no brand creator-management screen (list/invite/manage creators)
- no brand orders/commissions analytics screen
- no brand campaign management beyond creation (no editing, pausing, or archiving in UI)
- BrandHome is a minimal status view only

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
IntentSelection → local app-state role switch (supporter/creator/brand) → same → brand now has dedicated flow
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
BrandOnboarding → backend GET /brand/shopify/install-status + local AsyncStorage → same → requires backend URL config
BrandConnecting → backend /auth?shop=... + GET /brand/shopify/install-status poll → same → manual poll after OAuth
BrandShopifySuccess → backend GET /brand/shopify/install-status sync → same → polling on mount
CampaignGate → local brandHasActiveCampaign (from install status) → same → hard gate, no skip
CreateCampaign → backend POST /brand/campaigns → same → writes shopify_campaigns
CampaignSuccess → local route params + Share.share → same → no backend call
BrandHome → local brandInstallStatus/brandHasActiveCampaign (from earlier fetch) → backend reporting data exists but unused → minimal status view
Extension → backend /u with stored config → backend /u with stronger identity model → auth/config gap
Home price-history → backend /api/price-history/lookup (ProductHistory.in → PriceHistoryApp.com fallback) → same → parsing depends on external site markup
```

## 10. UX Contradiction List

### 1. Brand role is presented in UI and has a real brand product flow, but the flow is still minimal

- Current UI behavior:
  - `IntentSelection` shows `Brand` as a role choice and navigates to a real brand onboarding flow with Shopify connection, campaign creation, and a BrandHome screen.
- Current backend capability:
  - backend has brand reporting/install/campaign endpoints; mobile now consumes install-status and campaign-creation endpoints
- Why it matters:
  - brand flow is no longer a false promise, but BrandHome is still a minimal status view lacking creator management, order analytics, and commission tracking
- Files involved:
  - `apps/mobile/src/screens/IntentSelectionScreen.js`
  - `apps/mobile/src/screens/BrandHomeScreen.js`
  - `services/shopify-app/src/routes/dashboard-routes.js`
- Suggested fix direction:
  - expand BrandHome to surface backend reporting data and creator management

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
  - the product model is mixed: "discover creators" and "connect brands" are separate, but users do not see the attribution-type distinction
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
  - backend can attribute Shopify stores and manage campaigns, but there is no user-facing product/store discovery surface for those brands
- Why it matters:
  - Atribe-powered Shopify commerce exists in backend logic and brand campaigns exist in the mobile flow, but not as a native in-app supporter shopping surface
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

### 6. Brand flow has Shopify connection and campaign creation but lacks post-campaign analytics and creator management

- Current UI behavior:
  - `BrandHome` shows connected shop, campaign status, and commission pool but no actual order/commission data
  - no UI to invite, manage, or view creators
- Current backend capability:
  - `/brand/orders`, `/brand/commissions`, `/brand/creators`, `/brand/clicks` endpoints exist but are unused by mobile
- Why it matters:
  - brands can create campaigns but cannot see their impact; campaign management beyond creation is missing
- Files involved:
  - `apps/mobile/src/screens/BrandHomeScreen.js`
  - `services/shopify-app/src/routes/dashboard-routes.js`
- Suggested fix direction:
  - surface backend reporting data in BrandHome or a dedicated analytics screen; add campaign editing/pausing

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

3. expand BrandHome beyond minimal status to surface backend reporting data
   - Current state: BrandHome exists as minimal status view
   - Remaining work: surface `/brand/orders`, `/brand/commissions`, `/brand/creators` data; add creator management

4. update Discover to distinguish creators, external brands, and Atribe-powered brands
   - Current state: not implemented as a clear user-facing model

5. add auth hardening before production dashboard work
   - Current state: minimal auth guard exists with dev bypass
   - Remaining work: stronger brand ownership enforcement and production-grade access control

## Areas Not Confirmed In Code

- A first-class "collections" model
- Whether `FallbackState` and `Feedback` are still part of the active routed-link journey
- A mobile or web surface that consumes backend brand reporting endpoints (orders, commissions, creators, clicks)
- Campaign editing, pausing, or archiving beyond creation
