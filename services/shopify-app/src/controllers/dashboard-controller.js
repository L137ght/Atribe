import { dashboardService } from "../services/dashboard-service.js";

const handleRequest = (res, handler) => {
  try {
    return res.status(200).json(handler());
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
};

export const dashboardController = {
  creatorLinks(req, res) {
    return handleRequest(res, () => ({
      links: dashboardService.getCreatorLinks(req.query.creator_id)
    }));
  },

  creatorEarnings(req, res) {
    return handleRequest(res, () => dashboardService.getCreatorEarnings(req.query.creator_id));
  },

  creatorOrders(req, res) {
    return handleRequest(res, () => ({
      orders: dashboardService.getCreatorOrders(req.query.creator_id)
    }));
  },

  brandOrders(req, res) {
    return handleRequest(res, () => ({
      orders: dashboardService.getBrandOrders(req.query.brand_id)
    }));
  },

  brandCommissions(req, res) {
    return handleRequest(res, () => ({
      commissions: dashboardService.getBrandCommissions(req.query.brand_id)
    }));
  },

  brandCreators(req, res) {
    return handleRequest(res, () => ({
      creators: dashboardService.getBrandCreators(req.query.brand_id)
    }));
  }
};
