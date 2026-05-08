import { dashboardService } from "@atribe/domain";

const handleRequest = (res, handler) => {
  try {
    return Promise.resolve(handler())
      .then((payload) => res.status(200).json(payload))
      .catch((error) =>
        res.status(400).json({
          error: error.message
        })
      );
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
};

export const dashboardController = {
  creatorLinks(req, res) {
    return handleRequest(res, async () => ({
      links: await dashboardService.getCreatorLinks(req.query.creator_id)
    }));
  },

  creatorEarnings(req, res) {
    return handleRequest(res, () => dashboardService.getCreatorEarnings(req.query.creator_id));
  },

  creatorOrders(req, res) {
    return handleRequest(res, async () => ({
      orders: await dashboardService.getCreatorOrders(req.query.creator_id)
    }));
  },

  creatorBrands(req, res) {
    return handleRequest(res, async () => ({
      brands: await dashboardService.getCreatorBrands(req.query.creator_id)
    }));
  },

  creatorBrandCreate(req, res) {
    return handleRequest(res, async () => ({
      brand_link: await dashboardService.createCreatorBrandLink({
        creatorId: req.body.creator_id,
        shopDomain: req.body.shop_domain
      })
    }));
  },

  creatorBrandUpdate(req, res) {
    return handleRequest(res, async () => ({
      brand_link: await dashboardService.updateCreatorBrandLink({
        id: req.params.id,
        status: req.body.status
      })
    }));
  },

  creatorBrandArchive(req, res) {
    return handleRequest(res, async () => ({
      brand_link: await dashboardService.archiveCreatorBrandLink(req.params.id)
    }));
  },

  brandInstallStatus(req, res) {
    return handleRequest(res, async () => ({
      install_status: await dashboardService.getBrandShopifyInstallStatus({
        brandId: req.query.brand_id,
        shopDomain: req.query.shop_domain
      })
    }));
  },

  brandOrders(req, res) {
    return handleRequest(res, async () => ({
      orders: await dashboardService.getBrandOrders({
        brandId: req.query.brand_id,
        shopDomain: req.query.shop_domain
      })
    }));
  },

  brandCommissions(req, res) {
    return handleRequest(res, async () => ({
      commissions: await dashboardService.getBrandCommissions({
        brandId: req.query.brand_id,
        shopDomain: req.query.shop_domain
      })
    }));
  },

  brandCreators(req, res) {
    return handleRequest(res, async () => ({
      creators: await dashboardService.getBrandCreators({
        brandId: req.query.brand_id,
        shopDomain: req.query.shop_domain
      })
    }));
  },

  brandClicks(req, res) {
    return handleRequest(res, async () => ({
      clicks: await dashboardService.getBrandClicks({
        brandId: req.query.brand_id,
        shopDomain: req.query.shop_domain
      })
    }));
  },

  brandCampaignCreate(req, res) {
    return handleRequest(res, () =>
      dashboardService.createBrandCampaign({
        brandId: req.body.brand_id || null,
        shopDomain: req.body.shop_domain,
        name: req.body.name,
        shopperOfferType: req.body.shopper_offer_type,
        shopperOfferValue: req.body.shopper_offer_value,
        commissionRate: req.body.commission_rate,
        duration: req.body.duration
      })
    );
  }
};
