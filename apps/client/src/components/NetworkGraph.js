import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

const NODES = [
  { id: "atribe", label: "Atribe", top: "44%", left: "44%", size: 74, primary: true },
  { id: "creator-1", label: "Creator", top: "12%", left: "18%", size: 52 },
  { id: "creator-2", label: "Creator", top: "18%", left: "72%", size: 48 },
  { id: "creator-3", label: "Creator", top: "68%", left: "12%", size: 46 },
  { id: "creator-4", label: "Creator", top: "76%", left: "72%", size: 50 },
  { id: "buyer-1", label: "Buyer", top: "4%", left: "46%", size: 38 },
  { id: "buyer-2", label: "Buyer", top: "56%", left: "84%", size: 38 },
  { id: "buyer-3", label: "Buyer", top: "58%", left: "0%", size: 38 }
];

const EDGES = [
  { id: "e1", top: "21%", left: "27%", width: "28%", rotate: "-18deg" },
  { id: "e2", top: "26%", left: "50%", width: "24%", rotate: "24deg" },
  { id: "e3", top: "57%", left: "19%", width: "30%", rotate: "16deg" },
  { id: "e4", top: "63%", left: "49%", width: "28%", rotate: "-20deg" },
  { id: "e5", top: "17%", left: "44%", width: "10%", rotate: "0deg" },
  { id: "e6", top: "53%", left: "68%", width: "16%", rotate: "12deg" },
  { id: "e7", top: "53%", left: "6%", width: "20%", rotate: "-14deg" }
];

export default function NetworkGraph() {
  return (
    <View style={styles.frame}>
      <View style={styles.gridGlow} />
      <View style={styles.graphCard}>
        {EDGES.map((edge) => (
          <View
            key={edge.id}
            style={[
              styles.edge,
              {
                left: edge.left,
                top: edge.top,
                transform: [{ rotate: edge.rotate }]
              },
              { width: edge.width }
            ]}
          />
        ))}

        {NODES.map((node) => (
          <View
            key={node.id}
            style={[
              styles.node,
              node.primary ? styles.nodePrimary : styles.nodeSecondary,
              {
                width: node.size,
                height: node.size,
                left: node.left,
                top: node.top,
                marginLeft: -(node.size / 2),
                marginTop: -(node.size / 2)
              }
            ]}
          >
            <View style={[styles.nodeInner, node.primary && styles.nodeInnerPrimary]} />
            <Text style={[styles.nodeLabel, node.primary && styles.nodeLabelPrimary]}>
              {node.label}
            </Text>
          </View>
        ))}

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Weighted routing graph</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    maxWidth: 480,
    minHeight: 360,
    alignSelf: "stretch",
    justifyContent: "center"
  },
  gridGlow: {
    position: "absolute",
    inset: 0,
    borderRadius: 28,
    backgroundColor: "rgba(167, 139, 250, 0.08)"
  },
  graphCard: {
    minHeight: 360,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  edge: {
    position: "absolute",
    height: 1,
    backgroundColor: "rgba(167, 139, 250, 0.34)"
  },
  node: {
    position: "absolute",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  nodePrimary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: theme.colors.accentViolet,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12
  },
  nodeSecondary: {
    backgroundColor: "rgba(34, 26, 68, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.24)"
  },
  nodeInner: {
    position: "absolute",
    width: "42%",
    height: "42%",
    borderRadius: 999,
    backgroundColor: "rgba(167, 139, 250, 0.25)"
  },
  nodeInnerPrimary: {
    backgroundColor: "rgba(255,255,255,0.72)"
  },
  nodeLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: "700"
  },
  nodeLabelPrimary: {
    color: theme.colors.bgPrimary,
    fontSize: 12
  },
  badge: {
    position: "absolute",
    left: 18,
    bottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)"
  },
  badgeText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "700"
  }
});
