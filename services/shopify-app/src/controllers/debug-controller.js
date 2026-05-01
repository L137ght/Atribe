import { debugService } from "../services/debug-service.js";

export const debugController = {
  shops(_req, res) {
    return res.status(200).json({
      shops: debugService.getShops()
    });
  },

  latestClicks(_req, res) {
    return res.status(200).json({
      clicks: debugService.getLatestClicks()
    });
  },

  latestLinks(_req, res) {
    return res.status(200).json({
      links: debugService.getLatestLinks()
    });
  },

  latestOrders(_req, res) {
    return res.status(200).json({
      orders: debugService.getLatestOrders()
    });
  },

  latestAttributions(_req, res) {
    return res.status(200).json({
      attributions: debugService.getLatestAttributions()
    });
  },

  storefrontScript(_req, res) {
    return res.status(200).json({
      storefront_script: debugService.getStorefrontScriptInfo()
    });
  },

  shopifyInstallStatus(_req, res) {
    return res.status(200).json({
      shopify_install_status: debugService.getShopifyInstallStatus()
    });
  },

  userCreatorWeights(req, res) {
    return res.status(200).json({
      user_creator_weights: debugService.getUserCreatorWeights(String(req.query.user_id || ""))
    });
  },

  latestUserRouteClicks(_req, res) {
    return res.status(200).json({
      user_route_clicks: debugService.getLatestUserRouteClicks()
    });
  },

  userValueDistribution(req, res) {
    return res.status(200).json({
      user_value_distribution: debugService.getUserValueDistribution(String(req.query.user_id || ""))
    });
  },

  snapshot(req, res) {
    const snapshot = debugService.getSnapshot(req.params.snapshot_id);
    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found." });
    }

    return res.status(200).json({
      snapshot
    });
  }
};
