import { buildOfflineSession, shopify } from "../config/shopify.js";
import { env } from "../config/env.js";
import { shopScriptTagRepository } from "../repositories/shop-script-tag-repository.js";

const storefrontScriptSrc = `${env.shopifyAppUrl}/storefront/atribe.js`;

const listScriptTagsQuery = `#graphql
  query ListScriptTags {
    scriptTags(first: 100) {
      nodes {
        id
        src
        displayScope
      }
    }
  }
`;

const createScriptTagMutation = `#graphql
  mutation CreateScriptTag($input: ScriptTagInput!) {
    scriptTagCreate(input: $input) {
      scriptTag {
        id
        src
        displayScope
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const scriptTagService = {
  async registerStorefrontScript({ shop, accessToken, scope }) {
    const session = buildOfflineSession({ shop, accessToken, scope });
    const client = new shopify.clients.Graphql({ session });

    const existingResponse = await client.request(listScriptTagsQuery);

    const existingScriptTag = existingResponse.data?.scriptTags?.nodes?.find(
      (scriptTag) => scriptTag.src === storefrontScriptSrc
    );

    if (existingScriptTag) {
      shopScriptTagRepository.upsert({
        shopDomain: shop,
        scriptTagId: existingScriptTag.id,
        src: existingScriptTag.src
      });

      return existingScriptTag;
    }

    const createResponse = await client.request(createScriptTagMutation, {
      variables: {
        input: {
          src: storefrontScriptSrc,
          displayScope: "ONLINE_STORE",
          cache: true
        }
      }
    });

    const payload = createResponse.data?.scriptTagCreate;
    const userErrors = payload?.userErrors || [];

    if (userErrors.length > 0) {
      throw new Error(
        `Failed to register storefront ScriptTag: ${userErrors.map((error) => error.message).join(", ")}`
      );
    }

    const createdScriptTag = payload?.scriptTag;

    if (!createdScriptTag) {
      throw new Error("Failed to register storefront ScriptTag: missing ScriptTag response.");
    }

    shopScriptTagRepository.upsert({
      shopDomain: shop,
      scriptTagId: createdScriptTag.id,
      src: createdScriptTag.src
    });

    return createdScriptTag;
  }
};
