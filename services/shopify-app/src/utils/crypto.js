import crypto from "node:crypto";

export const createNonce = () => crypto.randomBytes(16).toString("hex");

export const toBase64Hmac = (payload, secret) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64");

export const toHexHmac = (payload, secret) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

export const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(left || "", "utf8");
  const rightBuffer = Buffer.from(right || "", "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};
