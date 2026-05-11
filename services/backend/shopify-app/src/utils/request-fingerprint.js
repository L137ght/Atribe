import crypto from "node:crypto";

export function hashValue(value) {
  if (!value) {
    return null;
  }

  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function getClientIp(req) {
  const forwardedFor = req.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "";
}

export function buildVisitorFingerprint(ipHash, userAgentHash) {
  if (!ipHash && !userAgentHash) {
    return null;
  }

  return crypto
    .createHash("sha256")
    .update(`${ipHash || "unknown"}:${userAgentHash || "unknown"}`)
    .digest("hex");
}

export function getRequestFingerprint(req) {
  const clientIp = getClientIp(req);
  const userAgent = req.get("user-agent") || "";

  const ipHash = hashValue(clientIp);
  const userAgentHash = hashValue(userAgent);
  const visitorFingerprintHash = buildVisitorFingerprint(ipHash, userAgentHash);

  return {
    clientIp,
    userAgent,
    ipHash,
    userAgentHash,
    visitorFingerprintHash,
  };
}
