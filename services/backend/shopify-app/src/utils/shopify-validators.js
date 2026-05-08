const SHOP_DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export const normalizeShopDomain = (shop) => String(shop || "").trim().toLowerCase();

export const isValidShopDomain = (shop) => SHOP_DOMAIN_PATTERN.test(normalizeShopDomain(shop));
