import { brandIntegrationRepository } from "../repositories/brand-integration-repository.js";
import { campaignRepository } from "../repositories/campaign-repository.js";
import { clickWeightSnapshotRepository } from "../repositories/click-weight-snapshot-repository.js";
import { linkClickRepository } from "../repositories/link-click-repository.js";
import { orderAttributionRepository } from "../repositories/order-attribution-repository.js";
import { shopifyOrderRepository } from "../repositories/shopify-order-repository.js";
import { userCreatorWeightRepository } from "../repositories/user-creator-weight-repository.js";
import { couponService } from "./coupon-service.js";
import { commissionService } from "./commission-service.js";
import { logger } from "../utils/logger.js";
import { orderWebhookService } from "./order-webhook-service.js";

const parseSnapshot = (snapshotRecord) => {
  if (!snapshotRecord?.snapshotJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(snapshotRecord.snapshotJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getClickAttribution = async (clickId) => {
  if (!clickId) {
    return null;
  }

  const click = await linkClickRepository.findByClickId(clickId);
  if (!click) {
    return null;
  }

  const snapshotRecord = click.snapshotId
    ? await clickWeightSnapshotRepository.findById(click.snapshotId)
    : null;

  return {
    creatorId: click.selectedCreatorId || click.creatorId || null,
    clickId: click.clickId,
    userId: click.userId || snapshotRecord?.userId || null,
    brandId: click.brandId || null,
    platformType: click.platformType || "legacy_single_creator",
    snapshotId: click.snapshotId || null,
    snapshot: parseSnapshot(snapshotRecord),
    fallbackReason: click.fallbackReason || null
  };
};

const getCouponCreatorAttribution = async (discountCodes) => {
  if (!Array.isArray(discountCodes)) {
    return null;
  }

  for (const discountCode of discountCodes) {
    const code = String(discountCode?.code || "").trim();
    if (!code) {
      continue;
    }

    const mapping = await couponService.findCreatorByCouponCode(code);
    if (mapping) {
      return {
        creatorId: mapping.creatorId,
        couponCode: mapping.couponCode
      };
    }
  }

  return null;
};

const resolveAttribution = async ({
  clickId,
  atribeUser,
  snapshotId,
  atribeCreator,
  atribeRef,
  discountCodes
}) => {
  const clickAttribution = await getClickAttribution(clickId);
  const couponAttribution = await getCouponCreatorAttribution(discountCodes);

  if (clickAttribution) {
    return {
      creatorId: clickAttribution.creatorId,
      userId: clickAttribution.userId,
      brandId: clickAttribution.brandId,
      platformType: clickAttribution.platformType,
      attributionSource: "click",
      clickId: clickAttribution.clickId,
      snapshotId: clickAttribution.snapshotId,
      snapshot: clickAttribution.snapshot,
      fallbackReason: clickAttribution.fallbackReason,
      atribeRef: atribeRef || null,
      couponCode: couponAttribution?.couponCode || null
    };
  }

  if (snapshotId && atribeUser) {
    const snapshotRecord = await clickWeightSnapshotRepository.findById(snapshotId);
    const snapshot = parseSnapshot(snapshotRecord);
    if (snapshot.length > 0) {
      return {
        creatorId: atribeCreator || atribeRef || null,
        userId: atribeUser,
        brandId: null,
        platformType: "atribe_shopify",
        attributionSource: "cookie",
        clickId: null,
        snapshotId,
        snapshot,
        fallbackReason: null,
        atribeRef: atribeRef || null,
        couponCode: couponAttribution?.couponCode || null
      };
    }
  }

  if (atribeCreator) {
    return {
      creatorId: atribeCreator,
      userId: atribeUser || null,
      brandId: null,
      platformType: "external",
      attributionSource: "cookie",
      clickId: null,
      snapshotId: snapshotId || null,
      snapshot: [],
      fallbackReason: null,
      atribeRef: atribeRef || atribeCreator,
      couponCode: couponAttribution?.couponCode || null
    };
  }

  if (couponAttribution) {
    return {
      creatorId: couponAttribution.creatorId,
      userId: null,
      brandId: null,
      platformType: "legacy_single_creator",
      attributionSource: "coupon",
      clickId: null,
      snapshotId: null,
      snapshot: [],
      fallbackReason: null,
      atribeRef: null,
      couponCode: couponAttribution.couponCode
    };
  }

  if (atribeRef) {
    return {
      creatorId: atribeRef,
      userId: atribeUser || null,
      brandId: null,
      platformType: "legacy_single_creator",
      attributionSource: "cookie",
      clickId: null,
      snapshotId: snapshotId || null,
      snapshot: [],
      fallbackReason: null,
      atribeRef,
      couponCode: couponAttribution?.couponCode || null
    };
  }

  return null;
};

export const orderAttributionService = {
  async processOrderWebhook({ shopDomain, orderPayload }) {
    const extractedOrder = orderWebhookService.extractOrderData(orderPayload);
    const {
      orderId,
      totalPrice,
      currency,
      discountCodes,
      atribeUser,
      clickId,
      snapshotId,
      atribeCreator,
      atribeRef
    } = extractedOrder;

    if (!orderId) {
      throw new Error("Order payload is missing an id.");
    }

    if (!totalPrice) {
      throw new Error("Order payload is missing total_price.");
    }

    await shopifyOrderRepository.upsert({
      orderId,
      shopDomain,
      totalPrice,
      currency,
      rawPayload: orderPayload
    });

    const existingAttribution = await orderAttributionRepository.findByOrderIdAndShopDomain(orderId, shopDomain);
    if (existingAttribution) {
      logger.debug("Skipping duplicate order attribution", {
        orderId,
        shopDomain,
        attributionSource: existingAttribution.attributionSource
      });
      return {
        orderId,
        creatorId: existingAttribution.creatorId,
        userId: existingAttribution.userId,
        platformType: existingAttribution.platformType,
        attributionSource: existingAttribution.attributionSource,
        orderValue: existingAttribution.orderValue,
        currency: existingAttribution.currency,
        clickId: existingAttribution.clickId,
        snapshotId: existingAttribution.snapshotId,
        fallbackReason: existingAttribution.fallbackReason || null,
        atribeRef: existingAttribution.atribeRef,
        couponCode: existingAttribution.couponCode,
        duplicate: true
      };
    }

    const attribution = await resolveAttribution({
      clickId,
      atribeUser,
      snapshotId,
      atribeCreator,
      atribeRef,
      discountCodes
    });

    if (!attribution) {
      logger.info("No attribution resolved for order", {
        orderId,
        shopDomain
      });
      return null;
    }

    await orderAttributionRepository.create({
      orderId,
      shopDomain,
      creatorId: attribution.platformType === "atribe_shopify" ? null : attribution.creatorId,
      userId: attribution.userId,
      brandId: attribution.brandId || null,
      platformType: attribution.platformType,
      attributionSource: attribution.attributionSource,
      orderValue: totalPrice,
      currency,
      clickId: attribution.clickId,
      snapshotId: attribution.snapshotId,
      fallbackReason: attribution.fallbackReason || null,
      atribeRef: attribution.atribeRef,
      couponCode: attribution.couponCode
    });

    const [brandIntegration, activeCampaign] = await Promise.all([
      brandIntegrationRepository.findByShopDomain(shopDomain),
      campaignRepository.findLatestActiveByShopDomain(shopDomain)
    ]);
    const commissionRate =
      activeCampaign?.commissionRate ??
      brandIntegration?.defaultCommissionRate ??
      undefined;

    let commission;
    if (attribution.platformType === "atribe_shopify" && attribution.snapshot.length > 0) {
      commission = await commissionService.createSplitOrderCommissions({
        orderId,
        shopDomain,
        userId: attribution.userId,
        brandId: attribution.brandId || null,
        snapshotId: attribution.snapshotId,
        snapshot: attribution.snapshot,
        orderValue: totalPrice,
        currency,
        commissionRate
      });

      for (const share of commission.commissions || []) {
        const snapshotItem = attribution.snapshot.find((item) => item.creator_id === share.creatorId);
        const normalizedWeight = Number(
          snapshotItem?.normalized_weight ?? snapshotItem?.weight ?? 0
        );
        const orderValueShare = Number(totalPrice) * normalizedWeight;
        if (attribution.fallbackReason !== "house_fallback") {
          await userCreatorWeightRepository.incrementPerformance({
            userId: attribution.userId,
            creatorId: share.creatorId,
            attributedValueIncrement: orderValueShare,
            commissionValueIncrement: Number(share.creatorCommission),
            eventCountIncrement: 1
          });
        }
      }
    } else {
      commission = await commissionService.createOrderCommission({
        orderId,
        shopDomain,
        creatorId: attribution.creatorId,
        userId: attribution.userId,
        brandId: attribution.brandId || null,
        snapshotId: attribution.snapshotId,
        orderValue: totalPrice,
        currency,
        commissionRate
      });

      if (
        attribution.platformType === "external" &&
        attribution.userId &&
        attribution.creatorId &&
        commission &&
        !commission.duplicate
      ) {
        await userCreatorWeightRepository.incrementPerformance({
          userId: attribution.userId,
          creatorId: attribution.creatorId,
          attributedValueIncrement: Number(totalPrice),
          commissionValueIncrement: Number(commission.creatorCommission),
          eventCountIncrement: 1
        });
      }
    }

    logger.info("Stored order attribution", {
      orderId,
      shopDomain,
      creatorId: attribution.creatorId,
      userId: attribution.userId,
      platformType: attribution.platformType,
      attributionSource: attribution.attributionSource,
      fallbackReason: attribution.fallbackReason || null,
      orderValue: totalPrice,
      commissionCount: Array.isArray(commission?.commissions) ? commission.commissions.length : 1
    });

    return {
      orderId,
      orderValue: totalPrice,
      currency,
      duplicate: false,
      commission,
      ...attribution
    };
  }
};
