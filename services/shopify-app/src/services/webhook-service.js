import { buildOfflineSession, shopify } from "../config/shopify.js";
import { shopifyEnv as env } from "../config/shopify-env.js";
import { shopWebhookRegistrationRepository } from "../repositories/shop-webhook-registration-repository.js";
import { logger } from "../utils/logger.js";

const subscriptions = [
  {
    topic: "ORDERS_CREATE",
    callbackPath: "/webhooks/orders_create"
  },
  {
    topic: "ORDERS_PAID",
    callbackPath: "/webhooks/orders_paid"
  },
  {
    topic: "ORDERS_CANCELLED",
    callbackPath: "/webhooks/orders_cancelled"
  },
  {
    topic: "REFUNDS_CREATE",
    callbackPath: "/webhooks/refunds_create"
  }
];

const isProtectedCustomerDataError = (message) =>
  typeof message === "string" &&
  message.toLowerCase().includes("not approved to subscribe to webhook topics containing protected customer data");

const webhookSubscriptionMutation = `#graphql
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: {
        callbackUrl: $callbackUrl
        format: JSON
      }
    ) {
      userErrors {
        field
        message
      }
      webhookSubscription {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
    }
  }
`;

export const webhookService = {
  async registerAll({ shop, accessToken, scope }) {
    const session = buildOfflineSession({ shop, accessToken, scope });
    const client = new shopify.clients.Graphql({ session });
    const results = {
      registered: [],
      skipped: []
    };

    for (const subscription of subscriptions) {
      const callbackUrl = `${env.shopifyAppUrl}${subscription.callbackPath}`;
      const response = await client.request(webhookSubscriptionMutation, {
        variables: {
          topic: subscription.topic,
          callbackUrl
        }
      });

      const payload = response.data?.webhookSubscriptionCreate;
      const userErrors = payload?.userErrors || [];

      if (userErrors.length > 0) {
        const protectedCustomerDataErrors = userErrors.filter((error) =>
          isProtectedCustomerDataError(error.message)
        );

        if (protectedCustomerDataErrors.length > 0) {
          const reason = protectedCustomerDataErrors.map((error) => error.message).join(", ");

          logger.warn("Skipped protected Shopify webhook during install", {
            shop,
            topic: subscription.topic,
            reason
          });

          results.skipped.push({
            topic: subscription.topic,
            callbackUrl,
            reason
          });

          continue;
        }

        throw new Error(
          `Failed to register ${subscription.topic}: ${userErrors.map((error) => error.message).join(", ")}`
        );
      }

      if (payload?.webhookSubscription) {
        await shopWebhookRegistrationRepository.upsert({
          shopDomain: shop,
          topic: subscription.topic,
          webhookId: payload.webhookSubscription.id,
          callbackUrl
        });
      }

      results.registered.push(payload?.webhookSubscription);
    }

    return results;
  }
};
