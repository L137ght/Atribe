import { debugService } from "@atribe/domain";

export const shopifyDebugController = {
  async shops(_req, res) {
    return res.status(200).json({
      shops: await debugService.getShops()
    });
  },

  async storefrontScript(_req, res) {
    return res.status(200).json({
      storefront_script: await debugService.getStorefrontScriptInfo()
    });
  },

  async shopifyInstallStatus(_req, res) {
    return res.status(200).json({
      shopify_install_status: await debugService.getShopifyInstallStatus()
    });
  }
};
