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

const getClickAttribution = (clickId) => {
  if (!clickId) {
    return null;
  }

  const click = linkClickRepository.findByClickId(clickId);
  if (!click) {
    return null;
  }

  const snapshotRecord = click.snapshotId
    ? clickWeightSnapshotRepository.findById(click.snapshotId)
    : null;

  return {
    creatorId: click.selectedCreatorId || click.creatorId || null,
    clickId: click.clickId,
    userId: click.userId || snapshotRecord?.userId || null,
    platformType: click.platformType || "legacy_single_creator",
    snapshotId: click.snapshotId || null,
    snapshot: parseSnapshot(snapshotRecord)
  };
};

const getCouponCreatorAttribution = (discountCodes) => {
  if (!Array.isArray(discountCodes)) {
    return null;
  }

  for (const discountCode of discountCodes) {
    const code = String(discountCode?.code || "").trim();
    if (!code) {
      continue;
    }

    const mapping = couponService.findCreatorByCouponCode(code);
    if (mapping) {
      return {
        creatorId: mapping.creatorId,
        couponCode: mapping.couponCode
      };
    }
  }

  return null;
};

const resolveAttribution = ({
  clickId,
  atribeUser,
  snapshotId,
  atribeCreator,
  atribeRef,
  discountCodes
}) => {
  const clickAttribution = getClickAttribution(clickId);
  const couponAttribution = getCouponCreatorAttribution(discountCodes);

  if (clickAttribution) {
    return {
      creatorId: clickAttribution.creatorId,
      userId: clickAttribution.userId,
      platformType: clickAttribution.platformType,
      attributionSource: "click",
      clickId: clickAttribution.clickId,
      snapshotId: clickAttribution.snapshotId,
      snapshot: clickAttribution.snapshot,
      atribeRef: atribeRef || null,
      couponCode: couponAttribution?.couponCode || null
    };
  }

  if (snapshotId && atribeUser) {
    const snapshotRecord = clickWeightSnapshotRepository.findById(snapshotId);
    const snapshot = parseSnapshot(snapshotRecord);
    if (snapshot.length > 0) {
      return {
        creatorId: atribeCreator || atribeRef || null,
        userId: atribeUser,
        platformType: "atribe_shopify",
        attributionSource: "cookie",
        clickId: null,
        snapshotId,
        snapshot,
        atribeRef: atribeRef || null,
        couponCode: couponAttribution?.couponCode || null
      };
    }
  }

  if (atribeCreator) {
    return {
      creatorId: atribeCreator,
      userId: atribeUser || null,
      platformType: "external",
      attributionSource: "cookie",
      clickId: null,
      snapshotId: snapshotId || null,
      snapshot: [],
      atribeRef: atribeRef || atribeCreator,
      couponCode: couponAttribution?.couponCode || null
    };
  }

  if (couponAttribution) {
    return {
      creatorId: couponAttribution.creatorId,
      userId: null,
      platformType: "legacy_single_creator",
      attributionSource: "coupon",
      clickId: null,
      snapshotId: null,
      snapshot: [],
      atribeRef: null,
      couponCode: couponAttribution.couponCode
    };
  }

  if (atribeRef) {
    return {
      creatorId: atribeRef,
      userId: atribeUser || null,
      platformType: "legacy_single_creator",
      attributionSource: "cookie",
      clickId: null,
      snapshotId: snapshotId || null,
      snapshot: [],
      atribeRef,
      couponCode: couponAttribution?.couponCode || null
    };
  }

  return null;
};

export const orderAttributionService = {
  processOrderWebhook({ shopDomain, orderPayload }) {
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

    shopifyOrderRepository.upsert({
      orderId,
      shopDomain,
      totalPrice,
      currency
    });

    const existingAttribution = orderAttributionRepository.findByOrderIdAndShopDomain(orderId, shopDomain);
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
        atribeRef: existingAttribution.atribeRef,
        couponCode: existingAttribution.couponCode,
        duplicate: true
      };
    }

    const attribution = resolveAttribution({
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

    orderAttributionRepository.create({
      orderId,
      shopDomain,
      creatorId: attribution.platformType === "atribe_shopify" ? null : attribution.creatorId,
      userId: attribution.userId,
      platformType: attribution.platformType,
      attributionSource: attribution.attributionSource,
      orderValue: totalPrice,
      currency,
      clickId: attribution.clickId,
      snapshotId: attribution.snapshotId,
      atribeRef: attribution.atribeRef,
      couponCode: attribution.couponCode
    });

    let commission;
    if (attribution.platformType === "atribe_shopify" && attribution.snapshot.length > 0) {
      commission = commissionService.createSplitOrderCommissions({
        orderId,
        shopDomain,
        userId: attribution.userId,
        snapshotId: attribution.snapshotId,
        snapshot: attribution.snapshot,
        orderValue: totalPrice,
        currency
      });

      const totalWeight = attribution.snapshot.reduce((sum, item) => sum + Number(item.weight || 0), 0);
      for (const share of commission.commissions || []) {
        const snapshotItem = attribution.snapshot.find((item) => item.creator_id === share.creatorId);
        const weight = Number(snapshotItem?.weight || 0);
        const orderValueShare = totalWeight > 0 ? (Number(totalPrice) * weight) / totalWeight : 0;
        userCreatorWeightRepository.incrementPerformance({
          userId: attribution.userId,
          creatorId: share.creatorId,
          attributedValueIncrement: orderValueShare,
          commissionValueIncrement: Number(share.creatorCommission),
          eventCountIncrement: 1
        });
      }
    } else {
      commission = commissionService.createOrderCommission({
        orderId,
        shopDomain,
        creatorId: attribution.creatorId,
        userId: attribution.userId,
        snapshotId: attribution.snapshotId,
        orderValue: totalPrice,
        currency
      });

      if (
        attribution.platformType === "external" &&
        attribution.userId &&
        attribution.creatorId &&
        commission &&
        !commission.duplicate
      ) {
        userCreatorWeightRepository.incrementPerformance({
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
