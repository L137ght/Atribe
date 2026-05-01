import { env } from "../config/env.js";
import { orderAttributionRepository } from "../repositories/order-attribution-repository.js";
import { orderCommissionRepository } from "../repositories/order-commission-repository.js";
import { logger } from "../utils/logger.js";

const roundCurrency = (value) => (Math.round(value * 100) / 100).toFixed(2);

const parseAmount = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return parsed;
};

const parseRate = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number.`);
  }

  return parsed;
};

const buildCommissionKey = ({ orderId, eventType, referenceId }) =>
  referenceId ? `${eventType}:${orderId}:${referenceId}` : `${eventType}:${orderId}`;

const sumRefundAmount = (refundPayload) => {
  const lineItemTotal = Array.isArray(refundPayload?.refund_line_items)
    ? refundPayload.refund_line_items.reduce((sum, item) => {
        const subtotal = Number(item?.subtotal || 0);
        const totalTax = Number(item?.total_tax || 0);
        return sum + subtotal + totalTax;
      }, 0)
    : 0;

  const orderAdjustmentsTotal = Array.isArray(refundPayload?.order_adjustments)
    ? refundPayload.order_adjustments.reduce((sum, adjustment) => {
        return sum + Number(adjustment?.amount || 0);
      }, 0)
    : 0;

  return lineItemTotal + orderAdjustmentsTotal;
};

const createStoredCommissionRecord = ({
  commissionKey,
  orderId,
  shopDomain,
  creatorId,
  userId,
  snapshotId,
  eventType,
  orderValue,
  currency,
  commissionRate,
  creatorCommission,
  platformFee,
  status,
  referenceId
}) => {
  const record = {
    commissionKey,
    orderId,
    shopDomain,
    creatorId,
    userId: userId || null,
    snapshotId: snapshotId || null,
    eventType,
    orderValue: roundCurrency(orderValue),
    currency: currency || null,
    commissionRate,
    creatorCommission: roundCurrency(creatorCommission),
    platformFee: roundCurrency(platformFee),
    status,
    referenceId: referenceId || null
  };

  orderCommissionRepository.create(record);
  return record;
};

const allocateRemainder = ({ index, totalCount, totalAmount, priorAllocated, rawShare }) => {
  if (index === totalCount - 1) {
    return totalAmount - priorAllocated;
  }

  return Number(roundCurrency(rawShare));
};

export const commissionService = {
  calculateCommission({
    orderValue,
    commissionRate = env.defaultCommissionRate,
    platformFeeRate = env.platformFeeRate
  }) {
    const normalizedOrderValue = parseAmount(orderValue, "order_value");
    const normalizedCommissionRate = parseRate(commissionRate, "commission_rate");
    const normalizedPlatformFeeRate = parseRate(platformFeeRate, "platform_fee_rate");

    return {
      orderValue: roundCurrency(normalizedOrderValue),
      commissionRate: normalizedCommissionRate,
      creatorCommission: roundCurrency(normalizedOrderValue * normalizedCommissionRate),
      platformFee: roundCurrency(normalizedOrderValue * normalizedPlatformFeeRate)
    };
  },

  createOrderCommission({
    orderId,
    shopDomain,
    creatorId,
    userId,
    snapshotId,
    orderValue,
    currency,
    commissionRate,
    creatorCommissionOverride,
    platformFeeOverride
  }) {
    const commissionKey = buildCommissionKey({
      orderId,
      eventType: "sale",
      referenceId: creatorId
    });

    const existing = orderCommissionRepository.findByCommissionKey(commissionKey);
    if (existing) {
      return {
        ...existing,
        duplicate: true
      };
    }

    const calculated = this.calculateCommission({
      orderValue,
      commissionRate
    });

    const creatorCommission =
      creatorCommissionOverride === undefined
        ? calculated.creatorCommission
        : roundCurrency(creatorCommissionOverride);
    const platformFee =
      platformFeeOverride === undefined
        ? calculated.platformFee
        : roundCurrency(platformFeeOverride);

    logger.info("Calculated sale commission", {
      orderId,
      shopDomain,
      creatorId,
      orderValue: calculated.orderValue,
      creatorCommission,
      platformFee
    });

    return {
      ...createStoredCommissionRecord({
        commissionKey,
        orderId,
        shopDomain,
        creatorId,
        userId,
        snapshotId,
        eventType: "sale",
        orderValue: calculated.orderValue,
        currency,
        commissionRate: calculated.commissionRate,
        creatorCommission,
        platformFee,
        status: "active"
      }),
      duplicate: false
    };
  },

  createSplitOrderCommissions({ orderId, shopDomain, userId, snapshotId, snapshot, orderValue, currency, commissionRate }) {
    const calculated = this.calculateCommission({
      orderValue,
      commissionRate
    });
    const totalWeight = snapshot.reduce((sum, item) => sum + Number(item.weight || 0), 0);

    if (totalWeight <= 0) {
      throw new Error("Snapshot weights must sum to a value greater than zero.");
    }

    let allocatedCreatorCommission = 0;
    let allocatedPlatformFee = 0;

    const commissions = snapshot.map((item, index) => {
      const share = Number(item.weight || 0) / totalWeight;
      const creatorCommission = allocateRemainder({
        index,
        totalCount: snapshot.length,
        totalAmount: Number(calculated.creatorCommission),
        priorAllocated: allocatedCreatorCommission,
        rawShare: Number(calculated.creatorCommission) * share
      });
      const platformFee = allocateRemainder({
        index,
        totalCount: snapshot.length,
        totalAmount: Number(calculated.platformFee),
        priorAllocated: allocatedPlatformFee,
        rawShare: Number(calculated.platformFee) * share
      });

      allocatedCreatorCommission += creatorCommission;
      allocatedPlatformFee += platformFee;

      return this.createOrderCommission({
        orderId,
        shopDomain,
        creatorId: item.creator_id,
        userId,
        snapshotId,
        orderValue,
        currency,
        commissionRate: calculated.commissionRate,
        creatorCommissionOverride: creatorCommission,
        platformFeeOverride: platformFee
      });
    });

    return {
      commissionKey: `${orderId}:${snapshotId || "split"}`,
      commissions,
      duplicate: commissions.every((item) => item.duplicate)
    };
  },

  createCancelledOrderCommission({ orderId, shopDomain }) {
    const saleCommissions = orderCommissionRepository.findSalesByOrderIdAndShopDomain(orderId, shopDomain);
    if (saleCommissions.length === 0) {
      return null;
    }

    const commissions = saleCommissions.map((saleCommission) => {
      const commissionKey = buildCommissionKey({
        orderId,
        eventType: "cancel",
        referenceId: saleCommission.commissionKey
      });

      const existing = orderCommissionRepository.findByCommissionKey(commissionKey);
      if (existing) {
        logger.debug("Skipping duplicate cancelled commission", {
          orderId,
          shopDomain,
          commissionKey
        });
        return {
          ...existing,
          duplicate: true
        };
      }

      return {
        ...createStoredCommissionRecord({
          commissionKey,
          orderId,
          shopDomain,
          creatorId: saleCommission.creatorId,
          userId: saleCommission.userId,
          snapshotId: saleCommission.snapshotId,
          eventType: "cancel",
          orderValue: -Number(saleCommission.orderValue),
          currency: saleCommission.currency,
          commissionRate: Number(saleCommission.commissionRate),
          creatorCommission: -Number(saleCommission.creatorCommission),
          platformFee: -Number(saleCommission.platformFee),
          status: "cancelled",
          referenceId: saleCommission.commissionKey
        }),
        duplicate: false
      };
    });

    return {
      commissions,
      duplicate: commissions.every((item) => item.duplicate),
      creatorId: commissions[0]?.creatorId || null,
      eventType: "cancel"
    };
  },

  createRefundCommission({ shopDomain, refundPayload }) {
    const orderId = String(refundPayload?.order_id || "").trim();
    const refundId = String(refundPayload?.id || "").trim();

    if (!orderId || !refundId) {
      throw new Error("Refund payload is missing order_id or id.");
    }

    const attribution = orderAttributionRepository.findByOrderIdAndShopDomain(orderId, shopDomain);
    if (!attribution) {
      return null;
    }

    const saleCommissions = orderCommissionRepository.findSalesByOrderIdAndShopDomain(orderId, shopDomain);
    if (saleCommissions.length === 0) {
      return null;
    }

    const refundAmount = sumRefundAmount(refundPayload);
    if (refundAmount <= 0) {
      return null;
    }

    const saleOrderValueTotal = saleCommissions.reduce(
      (sum, commission) => sum + Math.abs(Number(commission.orderValue || 0)),
      0
    );

    let allocatedRefundValue = 0;
    const commissions = saleCommissions.map((saleCommission, index) => {
      const commissionKey = buildCommissionKey({
        orderId,
        eventType: "refund",
        referenceId: `${refundId}:${saleCommission.commissionKey}`
      });

      const existing = orderCommissionRepository.findByCommissionKey(commissionKey);
      if (existing) {
        logger.debug("Skipping duplicate refund commission", {
          orderId,
          refundId,
          commissionKey
        });
        return {
          ...existing,
          duplicate: true
        };
      }

      const proportionalOrderValue = allocateRemainder({
        index,
        totalCount: saleCommissions.length,
        totalAmount: refundAmount,
        priorAllocated: allocatedRefundValue,
        rawShare:
          refundAmount *
          (saleOrderValueTotal > 0
            ? Math.abs(Number(saleCommission.orderValue || 0)) / saleOrderValueTotal
            : 0)
      });

      allocatedRefundValue += proportionalOrderValue;

      const calculated = this.calculateCommission({
        orderValue: -proportionalOrderValue,
        commissionRate: Number(saleCommission.commissionRate)
      });

      return {
        ...createStoredCommissionRecord({
          commissionKey,
          orderId,
          shopDomain,
          creatorId: saleCommission.creatorId,
          userId: saleCommission.userId,
          snapshotId: saleCommission.snapshotId,
          eventType: "refund",
          orderValue: calculated.orderValue,
          currency: saleCommission.currency,
          commissionRate: calculated.commissionRate,
          creatorCommission: calculated.creatorCommission,
          platformFee: calculated.platformFee,
          status: "refunded",
          referenceId: refundId
        }),
        duplicate: false
      };
    });

    logger.info("Calculated refund commissions", {
      orderId,
      refundId,
      refundAmount: roundCurrency(refundAmount),
      creatorId: attribution.creatorId,
      commissionCount: commissions.length
    });

    return {
      commissions,
      duplicate: commissions.every((item) => item.duplicate),
      creatorId: attribution.creatorId,
      eventType: "refund"
    };
  }
};
