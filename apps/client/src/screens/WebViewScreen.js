import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View
} from "react-native";
import { WebView } from "react-native-webview";
import { BodyText } from "../components";
import { theme } from "../theme";

function isAllowedUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());

    if (parsed.protocol === "about:") {
      return true;
    }

    if (["http:", "https:"].includes(parsed.protocol)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export default function WebViewScreen({ navigation, route }) {
  const { initialUrl } = route.params || {};
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(initialUrl || "");
  const [loading, setLoading] = useState(true);
  const canRenderWebView = useMemo(
    () => Platform.OS !== "web" && Boolean(initialUrl),
    [initialUrl]
  );

  if (!canRenderWebView) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Back</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Close</Text>
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.title}>In-app shopping</Text>
          <BodyText>WebView is available on iOS and Android for this flow.</BodyText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          disabled={!canGoBack}
          onPress={() => webViewRef.current?.goBack()}
          style={[styles.headerButton, !canGoBack && styles.headerButtonDisabled]}
        >
          <Text style={styles.headerButtonText}>Back</Text>
        </Pressable>

        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            Shop with creator support
          </Text>
          <Text numberOfLines={1} style={styles.headerUrl}>
            {currentUrl}
          </Text>
        </View>

        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Close</Text>
        </Pressable>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        originWhitelist={["http://*", "https://*"]}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(state) => {
          setCanGoBack(state.canGoBack);
          setCurrentUrl(state.url);
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (isAllowedUrl(request.url)) {
            return true;
          }

          Linking.openURL(request.url).catch(() => {});
          return false;
        }}
        onError={() => setLoading(false)}
        onHttpError={() => setLoading(false)}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.colors.accentSoft} />
          </View>
        )}
      />

      {loading ? <View pointerEvents="none" style={styles.loadingBar} /> : null}
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: "rgba(18,10,14,0.94)"
  },
  headerButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  headerButtonDisabled: {
    opacity: 0.5
  },
  headerButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 20,
    lineHeight: 24
  },
  headerUrl: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 12
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bgPrimary
  },
  loadingBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.accentSoft
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    gap: theme.spacing.sm
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 32,
    lineHeight: 38
  }
};
