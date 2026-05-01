import { creatorCouponRepository } from "../repositories/creator-coupon-repository.js";

const normalizeCreatorId = (creatorId) => String(creatorId || "").trim();
const normalizeCouponCode = (couponCode) => String(couponCode || "").trim().toUpperCase();

const buildCouponCode = (creatorId) => normalizeCouponCode(`CREATOR_${normalizeCreatorId(creatorId)}`);

export const couponService = {
  ensureCreatorCoupon(creatorId) {
    const normalizedCreatorId = normalizeCreatorId(creatorId);

    if (!normalizedCreatorId) {
      return null;
    }

    const couponCode = buildCouponCode(normalizedCreatorId);
    creatorCouponRepository.upsert({
      couponCode,
      creatorId: normalizedCreatorId
    });

    return couponCode;
  },

  findCreatorByCouponCode(couponCode) {
    if (!couponCode) {
      return null;
    }

    return creatorCouponRepository.findByCouponCode(normalizeCouponCode(couponCode));
  }
};
