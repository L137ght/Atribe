import test from "node:test";
import assert from "node:assert/strict";

import { parsePriceHistoryAppProductPage } from "../src/services/priceHistory/priceHistoryAppProvider.js";
import { extractProductInfoFromUrl } from "../src/services/priceHistory/productInfo.js";

test("amzn.in links are accepted as Amazon price history candidates", () => {
  const productInfo = extractProductInfoFromUrl("https://amzn.in/d/01dHCwYf");

  assert.equal(productInfo.isValid, true);
  assert.equal(productInfo.marketplace, "amazon");
  assert.equal(productInfo.domain, "amzn.in");
});

test("PriceHistoryApp parser uses Next data price stats and avoids unrelated chart data", () => {
  const nextData = {
    props: {
      pageProps: {
        ogProduct: {
          name: "Dapr. Hair Setting Clay",
          price: 699,
          lowest_price: 450,
          highest_price: 699,
          average_price: 589,
          history: {}
        }
      }
    }
  };

  const html = `
    <html>
      <head>
        <title>Dapr. Hair Setting Clay - Price History</title>
      </head>
      <body>
        <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>
        <section>Similar deal updated_at 2024-04-13T20:55:52Z discount 20</section>
      </body>
    </html>
  `;

  const parsed = parsePriceHistoryAppProductPage(html, "https://pricehistoryapp.com/product/dapr-hair-setting-clay", {
    marketplace: "amazon",
    originalUrl: "https://amzn.in/d/01dHCwYf"
  });

  assert.equal(parsed.productTitle, "Dapr. Hair Setting Clay");
  assert.equal(parsed.currentPrice, "₹699");
  assert.equal(parsed.lowestPrice, "₹450");
  assert.equal(parsed.highestPrice, "₹699");
  assert.equal(parsed.averagePrice, "₹589");
  assert.deepEqual(parsed.chartData, []);
});

test("PriceHistoryApp parser converts real history maps into chart data", () => {
  const nextData = {
    props: {
      pageProps: {
        ogProduct: {
          name: "Sample Product",
          price: 1000,
          lowest_price: 800,
          highest_price: 1200,
          average_price: 950,
          history: {
            1712966400: 1000,
            1715558400: 800
          }
        }
      }
    }
  };

  const parsed = parsePriceHistoryAppProductPage(
    `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`,
    "https://pricehistoryapp.com/product/sample-product",
    {
      marketplace: "amazon",
      originalUrl: "https://www.amazon.in/sample/dp/B000000000"
    }
  );

  assert.deepEqual(parsed.chartData, [
    { date: "2024-04-13", price: 1000 },
    { date: "2024-05-13", price: 800 }
  ]);
});
