import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  useNavigationContainerRef
} from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/core";
import * as Linking from "expo-linking";
import { ShareIntentProvider } from "expo-share-intent";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  AppNavigator,
  AppProvider,
  ShareIntentBootstrap,
  theme,
  useAppContext
} from "./src";

const linking = {
  prefixes: [
    Linking.createURL("/"),
    "atribe://",
    "com.atribe.io://",
    "http://localhost:8081"
  ],
  config: {
    screens: {
      Landing: "",
      LocalePicker: "locale",
      Login: "login",
      IntentSelection: "role",
      Home: "home",
      CreatorDashboard: "creator/dashboard",
      CreatorBioPage: "creator/link-in-bio",
      CreatorBioPublic: "c/:creatorId",
      CreatorOnboarding: "creator/onboarding",
      CreatorDiscovery: "discover",
      CreatorSelection: "tribe",
      BrandOnboarding: "brand/connect",
      BrandConnecting: "brand/connecting",
      BrandShopifySuccess: "brand/shopify-connected",
      CampaignGate: "brand/campaign-gate",
      CreateCampaign: "brand/campaigns/new",
      CampaignSuccess: "brand/campaigns/success",
      BrandHome: "brand/home",
      Settings: "settings",
      ConnectBrands: "creator/brands/connect",
      ConnectSocialAccounts: "creator/socials/connect",
      BrandProgramWebView: "creator/brands/program",
      AddAffiliateLinks: "creator/brands/links",
      WebViewScreen: "shop",
      FallbackState: "fallback",
      Feedback: "feedback",
      ShareRoute: "share"
    }
  }
};

function AppShell() {
  const { isReady } = useAppContext();
  const navigationRef = useNavigationContainerRef();
  const [navigationReady, setNavigationReady] = useState(false);

  if (!isReady) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={theme.colors.accentSoft} />
      </View>
    );
  }

  return (
    <NavigationIndependentTree>
      <NavigationContainer
        linking={linking}
        onReady={() => setNavigationReady(true)}
        ref={navigationRef}
      >
        <StatusBar style="light" />
        <ShareIntentBootstrap
          navigationReady={navigationReady}
          navigationRef={navigationRef}
        />
        <AppNavigator />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}

export default function App() {
  return (
    <ShareIntentProvider>
      <SafeAreaProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bgPrimary
  }
});
