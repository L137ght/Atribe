"use strict";

const { createUserState, routeEvent } = require("./index");

function createCreators() {
  return [
    {
      id: "ava",
      targetWeight: 50,
      eventCount: 0,
      estimatedValue: 0,
      domains: ["amazon.com", "nike.com", "sephora.com"]
    },
    {
      id: "blake",
      targetWeight: 30,
      eventCount: 0,
      estimatedValue: 0,
      domains: ["amazon.com", "nike.com"]
    },
    {
      id: "cleo",
      targetWeight: 20,
      eventCount: 0,
      estimatedValue: 0,
      domains: ["amazon.com"]
    }
  ];
}

function buildEvent(index) {
  const sequence = [
    {
      url: "https://www.amazon.com/dp/B000000001",
      html: '<span id="priceblock_ourprice">$24.99</span>'
    },
    {
      url: "https://www.nike.com/t/pegasus-41",
      html: '<div class="product-price">USD 130.00</div>'
    },
    {
      url: "https://www.sephora.com/product/sample-item",
      html: '<p class="price">$42.00</p>'
    },
    {
      url: "https://www.amazon.com/dp/B000000002",
      html: '<span class="a-offscreen">$89.00</span>'
    },
    {
      url: "https://www.nike.com/t/metcon-9",
      html: ""
    }
  ];

  return sequence[index % sequence.length];
}

function summarize(creators) {
  const totalEvents = creators.reduce((sum, creator) => sum + creator.eventCount, 0);
  const totalValue = creators.reduce((sum, creator) => sum + creator.estimatedValue, 0);

  return creators.map((creator) => ({
    id: creator.id,
    targetShare: Number((creator.targetWeight / 100).toFixed(3)),
    eventShare: totalEvents ? Number((creator.eventCount / totalEvents).toFixed(3)) : 0,
    valueShare: totalValue ? Number((creator.estimatedValue / totalValue).toFixed(3)) : 0,
    events: creator.eventCount,
    estimatedValue: Number(creator.estimatedValue.toFixed(2))
  }));
}

function runSimulation(totalEvents, options) {
  const creators = createCreators();
  const userState = createUserState();

  for (let index = 0; index < totalEvents; index += 1) {
    const event = buildEvent(index);
    routeEvent(event.url, creators, event.html, { ...options, userState });
  }

  return summarize(creators);
}

function runNullPriceSimulation(totalEvents, options) {
  const creators = createCreators();
  const userState = createUserState();

  for (let index = 0; index < totalEvents; index += 1) {
    const event = buildEvent(index);
    routeEvent(event.url, creators, "", { ...options, userState });
  }

  return summarize(creators);
}

function printResults(label, results) {
  console.log(`\n${label}`);
  console.table(results);
}

const options = {
  fallbackValue: 1,
  randomTieBreak: false,
  smoothingFactor: 0.05
};

printResults("Hybrid allocation with price extraction over 100 events", runSimulation(100, options));
printResults(
  "Fallback-only allocation with price always null over 100 events",
  runNullPriceSimulation(100, options)
);
