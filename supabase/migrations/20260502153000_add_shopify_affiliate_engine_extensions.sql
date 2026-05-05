alter table public.shopify_brand_integrations
  add column if not exists default_commission_rate numeric null;

alter table public.shopify_link_clicks
  add column if not exists fallback_reason text null;

alter table public.shopify_order_attributions
  add column if not exists fallback_reason text null;
