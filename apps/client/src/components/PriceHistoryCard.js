import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { BodyText, Card, Kicker } from "./ui";
import { theme } from "../theme";

function PriceRow({ label, value }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value ?? "—"}</Text>
    </View>
  );
}

function DealVerdict({ verdict, recommendationText }) {
  if (!verdict && !recommendationText) return null;

  const lowerVerdict = (verdict || "").toLowerCase();
  const isGood =
    lowerVerdict.includes("good time") ||
    lowerVerdict.includes("great") ||
    lowerVerdict.includes("buy now");
  const isBad =
    lowerVerdict.includes("bad time") ||
    lowerVerdict.includes("wait") ||
    lowerVerdict.includes("avoid") ||
    lowerVerdict.includes("overpriced");

  const verdictColor = isGood
    ? theme.colors.successText
    : isBad
    ? theme.colors.errorText
    : theme.colors.textMuted;

  const verdictLabel = verdict && verdict !== "Unknown" ? verdict : null;
  const verdictDetail = isGood
    ? "This price looks favorable compared with its history."
    : isBad
    ? "You may want to wait unless you need it now."
    : recommendationText || "";

  return (
    <View style={[styles.verdictWrap, { borderColor: verdictColor }]}>
      {verdictLabel ? (
        <Text style={[styles.verdictLabel, { color: verdictColor }]}>
          {verdictLabel}
        </Text>
      ) : null}
      {verdictDetail ? (
        <BodyText style={styles.verdictDetail}>{verdictDetail}</BodyText>
      ) : null}
    </View>
  );
}

function PriceChart({ chartData }) {
  if (!chartData || chartData.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <BodyText>Not enough price history data for a chart yet.</BodyText>
      </View>
    );
  }

  const prices = chartData.map((p) => p.price).filter((p) => p > 0);
  if (prices.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <BodyText>Not enough price history data for a chart yet.</BodyText>
      </View>
    );
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;
  const chartHeight = 120;
  const barWidth = Math.max(2, Math.min(8, Math.floor(200 / chartData.length)));

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartYAxis}>
        <Text style={styles.chartAxisLabel}>
          ₹{maxPrice.toLocaleString("en-IN")}
        </Text>
        <Text style={styles.chartAxisLabel}>
          ₹{minPrice.toLocaleString("en-IN")}
        </Text>
      </View>
      <View style={[styles.chartArea, { height: chartHeight }]}>
        {chartData.map((point, index) => {
          const barHeight = Math.max(
            1,
            ((point.price - minPrice) / range) * chartHeight
          );

          return (
            <View
              key={`${point.date}-${index}`}
              style={[
                styles.chartBar,
                {
                  height: barHeight,
                  width: barWidth,
                  borderRadius: barWidth / 2
                }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function PriceHistoryCard({
  data,
  onViewFullPage,
  state
}) {
  if (state === "unsupported") return null;

  if (state === "loading") {
    return (
      <Card style={styles.card}>
        <Kicker>Price history</Kicker>
        <BodyText>Checking price history...</BodyText>
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card style={styles.card}>
        <Kicker>Price history</Kicker>
        <Text style={styles.emptyTitle}>Price history unavailable</Text>
        <BodyText>
          We could not find reliable price history for this product.
        </BodyText>
      </Card>
    );
  }

  if (state === "error" || !data) {
    return (
      <Card style={styles.card}>
        <Kicker>Price history</Kicker>
        <Text style={styles.emptyTitle}>Could not load price history</Text>
        <BodyText>Try again later.</BodyText>
      </Card>
    );
  }

  const providerLabel =
    data.provider === "producthistory" ? "ProductHistory" : "PriceHistoryApp";

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Kicker>
            Price history{data.provider ? ` · via ${providerLabel}` : ""}
          </Kicker>
          <Text style={styles.title} numberOfLines={2}>
            {data.productTitle || "Product price history"}
          </Text>
        </View>
      </View>

      <BodyText style={styles.subtitle}>
        Checking whether this is a good time to buy.
      </BodyText>

      <DealVerdict
        verdict={data.dealVerdict}
        recommendationText={data.recommendationText}
      />

      <View style={styles.priceGrid}>
        <PriceRow label="Current" value={data.currentPrice} />
        <PriceRow label="Lowest" value={data.lowestPrice} />
        <PriceRow label="Highest" value={data.highestPrice} />
        <PriceRow label="Average" value={data.averagePrice} />
      </View>

      {data.chartData && data.chartData.length >= 2 ? (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Price trend</Text>
          <PriceChart chartData={data.chartData} />
        </View>
      ) : null}

      {data.productPageUrl ? (
        <Pressable
          onPress={() =>
            onViewFullPage
              ? onViewFullPage(data.productPageUrl)
              : Linking.openURL(data.productPageUrl)
          }
          style={({ pressed }) => [
            styles.externalLink,
            pressed && styles.pressed
          ]}
        >
          <Text style={styles.externalLinkText}>
            View full price history on {providerLabel}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = {
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: theme.colors.accentBorder,
    borderWidth: 1,
    gap: theme.spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    lineHeight: 28
  },
  subtitle: {
    color: theme.colors.textSecondary
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    lineHeight: 28
  },
  verdictWrap: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.md,
    gap: 4
  },
  verdictLabel: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    lineHeight: 24
  },
  verdictDetail: {
    fontSize: 14,
    lineHeight: 20
  },
  priceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  priceRow: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    gap: 4
  },
  priceLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  priceValue: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30
  },
  chartSection: {
    gap: theme.spacing.sm
  },
  chartTitle: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  chartWrap: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  chartYAxis: {
    justifyContent: "space-between",
    paddingVertical: 0,
    width: 56
  },
  chartAxisLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 9,
    textAlign: "right"
  },
  chartArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingLeft: 2,
    paddingBottom: 0
  },
  chartBar: {
    backgroundColor: theme.colors.accentSoft,
    opacity: 0.8
  },
  chartEmpty: {
    paddingVertical: theme.spacing.md,
    alignItems: "center"
  },
  externalLink: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 0
  },
  externalLinkText: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  pressed: {
    opacity: 0.7
  }
};
