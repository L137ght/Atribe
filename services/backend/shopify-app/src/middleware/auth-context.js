import { env } from "../config/env.js";
import { getSupabase } from "../db/supabase.js";
import { creatorBrandLinkRepository } from "../repositories/creator-brand-link-repository.js";
import { creatorRepository } from "../repositories/creator-repository.js";

const getBearerToken = (req) => {
  const authorization = String(req.get("authorization") || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice("bearer ".length).trim();
};

const isDevBypassAllowed = () => env.nodeEnv !== "production";

export const attachAuthContext = async (req, _res, next) => {
  const token = getBearerToken(req);
  req.auth = {
    token: token || null,
    isAuthenticated: false,
    isBypassed: false,
    userId: null,
    user: null
  };

  if (!token || env.dbProvider !== "supabase") {
    return next();
  }

  try {
    const { data, error } = await getSupabase().auth.getUser(token);
    if (error || !data?.user) {
      return next();
    }

    req.auth = {
      token,
      isAuthenticated: true,
      isBypassed: false,
      userId: data.user.id,
      user: data.user
    };
  } catch {
    // Leave req.auth in unauthenticated state. Dev flows may still bypass below.
  }

  return next();
};

export const requireAuthenticatedUser = (req, res, next) => {
  if (req.auth?.isAuthenticated) {
    return next();
  }

  if (isDevBypassAllowed()) {
    req.auth = {
      ...(req.auth || {}),
      isAuthenticated: false,
      isBypassed: true
    };
    return next();
  }

  return res.status(401).json({
    error: "Authentication is required for this endpoint."
  });
};

export const requireSelfUserRouteIfAuthenticated = (req, res, next) => {
  if (!req.auth?.isAuthenticated) {
    return next();
  }

  if (req.auth.userId === String(req.params.user_id || "").trim()) {
    return next();
  }

  return res.status(403).json({
    error: "Authenticated supporters can route links only for themselves."
  });
};

export const requireCreatorOwnership = async (req, res, next) => {
  if (req.auth?.isBypassed) {
    return next();
  }

  const creatorId =
    String(req.body?.creator_id || req.query?.creator_id || "").trim();

  if (!creatorId) {
    return res.status(400).json({
      error: "creator_id is required."
    });
  }

  const creator = await creatorRepository.findById(creatorId);
  if (!creator) {
    return res.status(404).json({
      error: "Creator not found."
    });
  }

  if (!creator.userId || creator.userId !== req.auth?.userId) {
    return res.status(403).json({
      error: "Authenticated creators can only manage their own creator resources."
    });
  }

  return next();
};

export const requireCreatorBrandLinkOwnership = async (req, res, next) => {
  if (req.auth?.isBypassed) {
    return next();
  }

  const linkId = String(req.params?.id || "").trim();
  if (!linkId) {
    return res.status(400).json({
      error: "id is required."
    });
  }

  const brandLink = await creatorBrandLinkRepository.findById(linkId);
  if (!brandLink) {
    return res.status(404).json({
      error: "Creator brand link not found."
    });
  }

  const creator = await creatorRepository.findById(brandLink.creatorId);
  if (!creator?.userId || creator.userId !== req.auth?.userId) {
    return res.status(403).json({
      error: "Authenticated creators can only manage their own creator brand links."
    });
  }

  return next();
};
