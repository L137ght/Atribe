import { debugService } from "@atribe/domain";

export const debugController = {
  async latestClicks(_req, res) {
    return res.status(200).json({
      clicks: await debugService.getLatestClicks()
    });
  },

  async latestLinks(_req, res) {
    return res.status(200).json({
      links: await debugService.getLatestLinks()
    });
  },

  async latestOrders(_req, res) {
    return res.status(200).json({
      orders: await debugService.getLatestOrders()
    });
  },

  async latestAttributions(_req, res) {
    return res.status(200).json({
      attributions: await debugService.getLatestAttributions()
    });
  },

  async userCreatorWeights(req, res) {
    return res.status(200).json({
      user_creator_weights: await debugService.getUserCreatorWeights(String(req.query.user_id || ""))
    });
  },

  async latestUserRouteClicks(_req, res) {
    return res.status(200).json({
      user_route_clicks: await debugService.getLatestUserRouteClicks()
    });
  },

  async userValueDistribution(req, res) {
    return res.status(200).json({
      user_value_distribution: await debugService.getUserValueDistribution(String(req.query.user_id || ""))
    });
  },

  async snapshot(req, res) {
    const snapshot = await debugService.getSnapshot(req.params.snapshot_id);
    if (!snapshot) {
      return res.status(404).json({ error: "Snapshot not found." });
    }

    return res.status(200).json({
      snapshot
    });
  },

  async seedUserWeights(req, res) {
    try {
      const seededWeights = await debugService.seedUserWeights({
        userId: req.body.user_id,
        weights: req.body.weights
      });

      return res.status(200).json({
        user_creator_weights: seededWeights
      });
    } catch (error) {
      return res.status(400).json({
        error: error.message
      });
    }
  }
};
