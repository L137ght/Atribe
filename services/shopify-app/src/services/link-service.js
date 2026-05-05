import crypto from "node:crypto";

import { env } from "../config/env.js";
import { brandIntegrationRepository } from "../repositories/brand-integration-repository.js";
import { campaignRepository } from "../repositories/campaign-repository.js";
import { clickWeightSnapshotRepository } from "../repositories/click-weight-snapshot-repository.js";
import { creatorRepository } from "../repositories/creator-repository.js";
import { creatorBrandLinkRepository } from "../repositories/creator-brand-link-repository.js";
import { linkClickRepository } from "../repositories/link-click-repository.js";
import { linkRepository } from "../repositories/link-repository.js";
import { shopRepository } from "../repositories/shop-repository.js";
import { userCreatorWeightRepository } from "../repositories/user-creator-weight-repository.js";
import { userRepository } from "../repositories/user-repository.js";
import { couponService } from "./coupon-service.js";
import { externalSelectionService } from "./external-selection-service.js";
import { logger } from "../utils/logger.js";
import { appendQueryParams } from "../utils/url.js";

const createId = (size = 12) => crypto.randomBytes(size).toString("hex");
const createUuid = () => crypto.randomUUID();

const normalizeRequiredString = (value, fieldName) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
};

const validateDestinationUrl = (value) => {
  const normalized = normalizeRequiredString(value, "destination_url");
  let parsedUrl;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error("destination_url must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("destination_url must use http or https.");
  }

  return parsedUrl.toString();
};

const hashIp = (ipAddress) =>
  crypto.createHash("sha256").update(String(ipAddress || "unknown")).digest("hex");

const getTrackingBaseUrl = () => {
  const trackingBaseUrl = String(env.atribeBaseUrl || "").trim();

  if (!trackingBaseUrl) {
    throw new Error("ATRIBE_BASE_URL must be configured before generating tracking links.");
  }

  return trackingBaseUrl;
};

const normalizeShopDomain = (value) => String(value || "").trim().toLowerCase();
const normalizeDomain = (value) => normalizeShopDomain(String(value || "").replace(/^www\./i, ""));
const FLIPKART_HOST_PATTERN = /(^|\.)flipkart\.com$/i;

const detectPlatformType = async (destinationUrl) => {
  const parsed = new URL(destinationUrl);
  const hostname = normalizeShopDomain(parsed.hostname);
  const knownShop = await shopRepository.findByShopDomain(hostname);
  const brandIntegration = await brandIntegrationRepository.findByShopDomain(hostname);

  if (
    knownShop &&
    brandIntegration &&
    brandIntegration.integrationStatus === "active" &&
    !brandIntegration.uninstalledAt
  ) {
    const brandId = brandIntegration?.brandId || (env.dbProvider === "supabase" ? null : hostname);

    return {
      platformType: "atribe_shopify",
      shopDomain: hostname,
      brandId,
      brandIntegration
    };
  }

  return {
    platformType: "external",
    shopDomain: null,
    brandId: env.dbProvider === "supabase" ? null : hostname,
    brandIntegration: null
  };
};

const buildSnapshot = (weights) => {
  const totalWeight = weights.reduce((sum, weight) => sum + Number(weight.weight || 0), 0);

  return weights.map((weight) => ({
    creator_id: weight.creatorId,
    raw_weight: Number(weight.weight || 0),
    normalized_weight:
      totalWeight > 0 ? Number(weight.weight || 0) / totalWeight : 0
  }));
};

const buildHouseFallbackSnapshot = () => {
  if (!env.atribeHouseCreatorId) {
    throw new Error("ATRIBE_HOUSE_CREATOR_ID must be configured for Shopify house fallback.");
  }

  return [
    {
      creator_id: env.atribeHouseCreatorId,
      raw_weight: 100,
      normalized_weight: 1
    }
  ];
};

const creatorSupportsDomain = (creator, hostname) => {
  const normalizedHostname = normalizeDomain(hostname);
  if (!creator) {
    return false;
  }

  if (
    creator.links?.some(
      (link) => link.url && normalizeDomain(link.domain) === normalizedHostname
    )
  ) {
    return true;
  }

  if (resolveExternalTagConfig(creator.externalTagsJson, normalizedHostname)) {
    return true;
  }

  return normalizedHostname.includes("amazon.") && Boolean(creator.affiliateTag);
};

const rewriteUrlFromAffiliateLink = (inputUrl, affiliateUrl) => {
  const destinationUrl = new URL(inputUrl.trim());
  const sourceUrl = new URL(affiliateUrl.trim());

  sourceUrl.searchParams.forEach((value, key) => {
    destinationUrl.searchParams.set(key, value);
  });

  return destinationUrl.toString();
};

const rewriteFlipkartUrl = (inputUrl, affid) => {
  const destinationUrl = new URL(inputUrl.trim());
  const normalizedAffid = String(affid || "").trim();

  if (!FLIPKART_HOST_PATTERN.test(normalizeDomain(destinationUrl.hostname)) || !normalizedAffid) {
    return inputUrl;
  }

  destinationUrl.protocol = "https:";
  destinationUrl.hostname = "dl.flipkart.com";
  destinationUrl.pathname = destinationUrl.pathname.startsWith("/dl/")
    ? destinationUrl.pathname
    : `/dl${destinationUrl.pathname.startsWith("/") ? "" : "/"}${destinationUrl.pathname}`;
  destinationUrl.searchParams.set("affid", normalizedAffid);

  return destinationUrl.toString();
};

const resolveExternalTagConfig = (externalTagsJson, hostname) => {
  if (!externalTagsJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(externalTagsJson);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed[hostname] || parsed[hostname.replace(/^www\./, "")] || null;
  } catch {
    return null;
  }
};

const applyExternalCreatorTag = (destinationUrl, creator) => {
  const url = new URL(destinationUrl);
  const hostname = normalizeDomain(url.hostname);
  const matchingLink = creator?.links?.find(
    (link) => normalizeDomain(link.domain) === hostname && link.url
  );

  if (matchingLink?.url) {
    return rewriteUrlFromAffiliateLink(destinationUrl, matchingLink.url);
  }

  const tagConfig = resolveExternalTagConfig(creator?.externalTagsJson, hostname);

  if (!tagConfig?.param || !tagConfig?.value) {
    if (creator?.affiliateTag && hostname.includes("amazon.")) {
      url.searchParams.set("tag", String(creator.affiliateTag));
      return url.toString();
    }

    return destinationUrl;
  }

  if (FLIPKART_HOST_PATTERN.test(hostname) && String(tagConfig.param) === "affid") {
    return rewriteFlipkartUrl(destinationUrl, tagConfig.value);
  }

  url.searchParams.set(String(tagConfig.param), String(tagConfig.value));
  return url.toString();
};

export const linkService = {
  async createLink({ creatorId, brandId, destinationUrl }) {
    const normalizedCreatorId = normalizeRequiredString(creatorId, "creator_id");
    const normalizedBrandId = normalizeRequiredString(brandId, "brand_id");
    const normalizedDestinationUrl = validateDestinationUrl(destinationUrl);
    const trackingBaseUrl = getTrackingBaseUrl();
    const linkId = createId(8);
    await creatorRepository.upsert({ id: normalizedCreatorId });
    const couponCode = await couponService.ensureCreatorCoupon(normalizedCreatorId);

    await linkRepository.create({
      linkId,
      creatorId: normalizedCreatorId,
      brandId: normalizedBrandId,
      destinationUrl: normalizedDestinationUrl
    });

    const trackingLink = `${trackingBaseUrl}/r/${encodeURIComponent(normalizedCreatorId)}/${linkId}`;

    if (env.nodeEnv !== "production") {
      logger.info("Generated tracking link", {
        creatorId: normalizedCreatorId,
        brandId: normalizedBrandId,
        linkId,
        trackingLink
      });
    }

    return {
      linkId,
      creatorId: normalizedCreatorId,
      brandId: normalizedBrandId,
      destinationUrl: normalizedDestinationUrl,
      trackingLink,
      couponCode
    };
  },

  async resolveLink({ creatorId, linkId, ipAddress, userAgent }) {
    const normalizedCreatorId = normalizeRequiredString(creatorId, "creator_id");
    const normalizedLinkId = normalizeRequiredString(linkId, "link_id");
    const link = await linkRepository.findByCreatorAndLinkId({
      creatorId: normalizedCreatorId,
      linkId: normalizedLinkId
    });

    if (!link) {
      return null;
    }

    const clickId = createId(10);
    const detectedPlatform = await detectPlatformType(link.destinationUrl);
    await linkClickRepository.create({
      clickId,
      linkId: link.linkId,
      creatorId: link.creatorId,
      selectedCreatorId: link.creatorId,
      destinationUrl: link.destinationUrl,
      platformType: "legacy_single_creator",
      brandId: link.brandId,
      shopDomain: detectedPlatform.shopDomain,
      ipHash: hashIp(ipAddress),
      userAgent: String(userAgent || "unknown")
    });

    return {
      clickId,
      creatorId: link.creatorId,
      linkId: link.linkId,
      redirectUrl: appendQueryParams(link.destinationUrl, {
        atribe_ref: link.creatorId,
        atribe_click: clickId
      })
    };
  },

  async createUserRoute({ userId, destinationUrl, ipAddress, userAgent }) {
    const normalizedUserId = normalizeRequiredString(userId, "user_id");
    const normalizedDestinationUrl = validateDestinationUrl(destinationUrl);
    const user = await userRepository.findById(normalizedUserId);

    if (!user) {
      throw new Error("User not found.");
    }

    const weights = await userCreatorWeightRepository.findActiveByUserId(normalizedUserId);
    if (weights.length === 0) {
      throw new Error("User has no active creator weights.");
    }

    const { platformType, brandId, shopDomain, brandIntegration } = await detectPlatformType(normalizedDestinationUrl);
    const clickId = createId(10);
    const snapshotId = createUuid();
    let selectedCreatorId = null;
    let snapshot = [];
    let fallbackReason = null;

    if (platformType === "external") {
      const destinationHostname = normalizeDomain(new URL(normalizedDestinationUrl).hostname);
      const weightedCreators = await Promise.all(
        weights.map(async (weight) => ({
          weight,
          creator: await creatorRepository.findById(weight.creatorId)
        }))
      );

      const supportedWeights = weightedCreators
        .filter(({ creator }) => creatorSupportsDomain(creator, destinationHostname))
        .map(({ weight }) => weight);

      if (supportedWeights.length === 0) {
        throw new Error("No selected creators currently support this domain.");
      }

      snapshot = buildSnapshot(supportedWeights);
      const selectedWeight = externalSelectionService.selectCreator(supportedWeights);
      selectedCreatorId = selectedWeight?.creatorId || null;

      if (!selectedCreatorId) {
        throw new Error("No creator could be selected for external attribution.");
      }

      await couponService.ensureCreatorCoupon(selectedCreatorId);
    } else {
      const hasActiveCampaign = shopDomain
        ? await campaignRepository.hasActiveCampaign(shopDomain)
        : false;
      const eligibleCreatorLinks = shopDomain && hasActiveCampaign
        ? await creatorBrandLinkRepository.findActiveByShopDomain(shopDomain)
        : [];
      const eligibleCreatorIds = new Set(
        eligibleCreatorLinks
          .filter((link) => link.status === "active")
          .map((link) => link.creatorId)
      );

      const eligibleWeights = weights.filter((weight) => eligibleCreatorIds.has(weight.creatorId));

      if (eligibleWeights.length === 0) {
        snapshot = buildHouseFallbackSnapshot();
        fallbackReason = "house_fallback";
      } else {
        snapshot = buildSnapshot(eligibleWeights);
      }
    }

    await clickWeightSnapshotRepository.create({
      id: snapshotId,
      clickId,
      userId: normalizedUserId,
      snapshotJson: JSON.stringify(snapshot)
    });

    const selectedCreator = selectedCreatorId
      ? await creatorRepository.findById(selectedCreatorId)
      : null;
    const finalDestinationUrl =
      platformType === "external" && selectedCreator
        ? applyExternalCreatorTag(normalizedDestinationUrl, selectedCreator)
        : normalizedDestinationUrl;

    await linkClickRepository.create({
      clickId,
      userId: normalizedUserId,
      selectedCreatorId,
      destinationUrl: finalDestinationUrl,
      platformType,
      brandId,
      shopDomain,
      snapshotId,
      fallbackReason,
      ipHash: hashIp(ipAddress),
      userAgent: String(userAgent || "unknown")
    });

    const redirectParams = {
      atribe_user: normalizedUserId,
      atribe_click: clickId,
      atribe_snapshot: snapshotId
    };

    if (selectedCreatorId) {
      redirectParams.atribe_creator = selectedCreatorId;
      redirectParams.atribe_ref = selectedCreatorId;
    }

    return {
      clickId,
      userId: normalizedUserId,
      snapshotId,
      platformType,
      brandId: brandIntegration?.brandId || brandId,
      selectedCreatorId,
      fallbackReason,
      redirectUrl: appendQueryParams(finalDestinationUrl, redirectParams)
    };
  }
};
