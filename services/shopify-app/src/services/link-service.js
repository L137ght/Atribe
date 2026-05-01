import crypto from "node:crypto";

import { env } from "../config/env.js";
import { clickWeightSnapshotRepository } from "../repositories/click-weight-snapshot-repository.js";
import { creatorRepository } from "../repositories/creator-repository.js";
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

const detectPlatformType = (destinationUrl) => {
  const parsed = new URL(destinationUrl);
  const hostname = normalizeShopDomain(parsed.hostname);
  const knownShop = shopRepository.findByShopDomain(hostname);

  if (knownShop) {
    return {
      platformType: "atribe_shopify",
      shopDomain: hostname,
      brandId: hostname
    };
  }

  return {
    platformType: "external",
    shopDomain: null,
    brandId: hostname
  };
};

const buildSnapshot = (weights) =>
  weights.map((weight) => ({
    creator_id: weight.creatorId,
    weight: Number(weight.weight)
  }));

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
  const hostname = normalizeShopDomain(url.hostname);
  const tagConfig = resolveExternalTagConfig(creator?.externalTagsJson, hostname);

  if (!tagConfig?.param || !tagConfig?.value) {
    return destinationUrl;
  }

  url.searchParams.set(String(tagConfig.param), String(tagConfig.value));
  return url.toString();
};

export const linkService = {
  createLink({ creatorId, brandId, destinationUrl }) {
    const normalizedCreatorId = normalizeRequiredString(creatorId, "creator_id");
    const normalizedBrandId = normalizeRequiredString(brandId, "brand_id");
    const normalizedDestinationUrl = validateDestinationUrl(destinationUrl);
    const trackingBaseUrl = getTrackingBaseUrl();
    const linkId = createId(8);
    creatorRepository.upsert({ id: normalizedCreatorId });
    const couponCode = couponService.ensureCreatorCoupon(normalizedCreatorId);

    linkRepository.create({
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

  resolveLink({ creatorId, linkId, ipAddress, userAgent }) {
    const normalizedCreatorId = normalizeRequiredString(creatorId, "creator_id");
    const normalizedLinkId = normalizeRequiredString(linkId, "link_id");
    const link = linkRepository.findByCreatorAndLinkId({
      creatorId: normalizedCreatorId,
      linkId: normalizedLinkId
    });

    if (!link) {
      return null;
    }

    const clickId = createId(10);
    const detectedPlatform = detectPlatformType(link.destinationUrl);
    linkClickRepository.create({
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

  createUserRoute({ userId, destinationUrl, ipAddress, userAgent }) {
    const normalizedUserId = normalizeRequiredString(userId, "user_id");
    const normalizedDestinationUrl = validateDestinationUrl(destinationUrl);
    const user = userRepository.findById(normalizedUserId);

    if (!user) {
      throw new Error("User not found.");
    }

    const weights = userCreatorWeightRepository.findActiveByUserId(normalizedUserId);
    if (weights.length === 0) {
      throw new Error("User has no active creator weights.");
    }

    const { platformType, brandId, shopDomain } = detectPlatformType(normalizedDestinationUrl);
    const clickId = createId(10);
    const snapshotId = createId(10);
    const snapshot = buildSnapshot(weights);

    clickWeightSnapshotRepository.create({
      id: snapshotId,
      clickId,
      userId: normalizedUserId,
      snapshotJson: JSON.stringify(snapshot)
    });

    let selectedCreatorId = null;
    if (platformType === "external") {
      const selectedWeight = externalSelectionService.selectCreator(weights);
      selectedCreatorId = selectedWeight?.creatorId || null;

      if (!selectedCreatorId) {
        throw new Error("No creator could be selected for external attribution.");
      }

      creatorRepository.upsert({ id: selectedCreatorId });
      couponService.ensureCreatorCoupon(selectedCreatorId);
    }

    const selectedCreator = selectedCreatorId
      ? creatorRepository.findById(selectedCreatorId)
      : null;
    const finalDestinationUrl =
      platformType === "external" && selectedCreator
        ? applyExternalCreatorTag(normalizedDestinationUrl, selectedCreator)
        : normalizedDestinationUrl;

    linkClickRepository.create({
      clickId,
      userId: normalizedUserId,
      selectedCreatorId,
      destinationUrl: finalDestinationUrl,
      platformType,
      brandId,
      shopDomain,
      snapshotId,
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
      selectedCreatorId,
      redirectUrl: appendQueryParams(finalDestinationUrl, redirectParams)
    };
  }
};
