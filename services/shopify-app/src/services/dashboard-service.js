import { linkRepository } from "../repositories/link-repository.js";
import { orderAttributionRepository } from "../repositories/order-attribution-repository.js";
import { orderCommissionRepository } from "../repositories/order-commission-repository.js";

const requireId = (value, fieldName) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
};

const toNumber = (value) => Number(value || 0);

export const dashboardService = {
  getCreatorLinks(creatorId) {
    const normalizedCreatorId = requireId(creatorId, "creator_id");
    return linkRepository.findByCreatorId(normalizedCreatorId);
  },

  getCreatorOrders(creatorId) {
    const normalizedCreatorId = requireId(creatorId, "creator_id");
    return orderAttributionRepository.findOrdersByCreatorId(normalizedCreatorId);
  },

  getCreatorEarnings(creatorId) {
    const normalizedCreatorId = requireId(creatorId, "creator_id");
    const commissions = orderCommissionRepository.findByCreatorId(normalizedCreatorId);

    const totals = commissions.reduce(
      (accumulator, commission) => {
        accumulator.creatorCommissionTotal += toNumber(commission.creatorCommission);
        accumulator.platformFeeTotal += toNumber(commission.platformFee);
        return accumulator;
      },
      {
        creatorCommissionTotal: 0,
        platformFeeTotal: 0
      }
    );

    return {
      creator_id: normalizedCreatorId,
      totals: {
        creator_commission: totals.creatorCommissionTotal.toFixed(2),
        platform_fee: totals.platformFeeTotal.toFixed(2)
      },
      commissions
    };
  },

  getBrandOrders(brandId) {
    const normalizedBrandId = requireId(brandId, "brand_id");
    return orderAttributionRepository.findOrdersByBrandId(normalizedBrandId);
  },

  getBrandCommissions(brandId) {
    const normalizedBrandId = requireId(brandId, "brand_id");
    return orderCommissionRepository.findByBrandId(normalizedBrandId);
  },

  getBrandCreators(brandId) {
    const normalizedBrandId = requireId(brandId, "brand_id");
    const orders = orderAttributionRepository.findOrdersByBrandId(normalizedBrandId);
    const creators = new Map();

    for (const order of orders) {
      const current = creators.get(order.creatorId) || {
        creator_id: order.creatorId,
        brand_id: normalizedBrandId,
        orders_count: 0,
        total_order_value: 0,
        total_creator_commission: 0
      };

      current.orders_count += 1;
      current.total_order_value += toNumber(order.orderValue);
      current.total_creator_commission += toNumber(order.creatorCommission);
      creators.set(order.creatorId, current);
    }

    return [...creators.values()].map((creator) => ({
      ...creator,
      total_order_value: creator.total_order_value.toFixed(2),
      total_creator_commission: creator.total_creator_commission.toFixed(2)
    }));
  }
};
