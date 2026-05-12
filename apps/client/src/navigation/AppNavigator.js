import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppContext } from "../context";
import {
  AddAffiliateLinksScreen,
  BrandConnectingScreen,
  BrandHomeScreen,
  BrandProgramWebViewScreen,
  BrandOnboardingScreen,
  BrandShopifySuccessScreen,
  CampaignGateScreen,
  CampaignSuccessScreen,
  ConnectBrandsScreen,
  ConnectSocialAccountsScreen,
  CreateCampaignScreen,
  CreatorBioPageScreen,
  CreatorBioPublicScreen,
  CreatorDashboardScreen,
  CreatorDiscoveryScreen,
  CreatorOnboardingScreen,
  CreatorSelectionScreen,
  CreatorShareStoryScreen,
  FeedbackScreen,
  FallbackStateScreen,
  HomeScreen,
  IntentSelectionScreen,
  LandingScreen,
  LocalePickerScreen,
  LoginScreen,
  SettingsScreen,
  ShareRouteScreen,
  WebViewScreen
} from "../screens";
import { theme } from "../theme";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const {
    brandHasActiveCampaign,
    brandInstallStatus,
    brandShopDomain,
    creatorOnboardingPending,
    currentCreator,
    intent,
    localeSelectionRequired,
    session
  } = useAppContext();
  const navigatorStateKey = `${session?.id || "guest"}:${intent || "none"}`;
  const initialBrandRouteName =
    brandShopDomain && brandInstallStatus?.install_status === "installed"
      ? brandHasActiveCampaign
        ? "BrandHome"
        : "CampaignGate"
      : "BrandOnboarding";
  const initialBrandComponent =
    initialBrandRouteName === "BrandHome"
      ? BrandHomeScreen
      : initialBrandRouteName === "CampaignGate"
      ? CampaignGateScreen
      : BrandOnboardingScreen;

  return (
    <Stack.Navigator
      key={navigatorStateKey}
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.bgPrimary
        }
      }}
    >
      {localeSelectionRequired ? (
        <Stack.Screen component={LocalePickerScreen} name="LocalePicker" />
      ) : !session ? (
        <>
          <Stack.Screen component={LandingScreen} name="Landing" />
          <Stack.Screen component={LoginScreen} name="Login" />
          <Stack.Screen component={CreatorBioPublicScreen} name="CreatorBioPublic" />
          <Stack.Screen component={ShareRouteScreen} name="ShareRoute" />
        </>
      ) : !intent ? (
        <>
          <Stack.Screen component={IntentSelectionScreen} name="IntentSelection" />
          <Stack.Screen component={ShareRouteScreen} name="ShareRoute" />
          <Stack.Screen component={CreatorBioPublicScreen} name="CreatorBioPublic" />
        </>
      ) : (
        <>
          {intent === "creator" ? (
            currentCreator && !creatorOnboardingPending ? (
              <Stack.Screen component={CreatorDashboardScreen} name="CreatorDashboard" />
            ) : (
              <Stack.Screen component={CreatorOnboardingScreen} name="CreatorOnboarding" />
            )
          ) : intent === "brand" ? (
            <Stack.Screen component={initialBrandComponent} name={initialBrandRouteName} />
          ) : (
            <Stack.Screen component={HomeScreen} name="Home" />
          )}
          {intent !== "brand" ? (
            <>
              <Stack.Screen component={CreatorDiscoveryScreen} name="CreatorDiscovery" />
              <Stack.Screen component={CreatorSelectionScreen} name="CreatorSelection" />
            </>
          ) : null}
          <Stack.Screen component={SettingsScreen} name="Settings" />
          {intent === "creator" ? (
            <>
              {currentCreator && !creatorOnboardingPending ? (
                <Stack.Screen component={CreatorOnboardingScreen} name="CreatorOnboarding" />
              ) : (
                <Stack.Screen component={CreatorDashboardScreen} name="CreatorDashboard" />
              )}
              <Stack.Screen component={ConnectBrandsScreen} name="ConnectBrands" />
              <Stack.Screen component={ConnectSocialAccountsScreen} name="ConnectSocialAccounts" />
              <Stack.Screen component={CreatorBioPageScreen} name="CreatorBioPage" />
              <Stack.Screen component={BrandProgramWebViewScreen} name="BrandProgramWebView" />
              <Stack.Screen component={AddAffiliateLinksScreen} name="AddAffiliateLinks" />
              <Stack.Screen component={CreatorShareStoryScreen} name="CreatorShareStory" />
            </>
          ) : intent === "brand" ? (
            <>
              {initialBrandRouteName !== "BrandOnboarding" ? (
                <Stack.Screen component={BrandOnboardingScreen} name="BrandOnboarding" />
              ) : null}
              <Stack.Screen component={BrandConnectingScreen} name="BrandConnecting" />
              <Stack.Screen component={BrandShopifySuccessScreen} name="BrandShopifySuccess" />
              {initialBrandRouteName !== "CampaignGate" ? (
                <Stack.Screen component={CampaignGateScreen} name="CampaignGate" />
              ) : null}
              <Stack.Screen component={CreateCampaignScreen} name="CreateCampaign" />
              <Stack.Screen component={CampaignSuccessScreen} name="CampaignSuccess" />
              {initialBrandRouteName !== "BrandHome" ? (
                <Stack.Screen component={BrandHomeScreen} name="BrandHome" />
              ) : null}
            </>
          ) : null}
          <Stack.Screen component={LocalePickerScreen} name="LocalePicker" />
          <Stack.Screen component={FallbackStateScreen} name="FallbackState" />
          <Stack.Screen component={FeedbackScreen} name="Feedback" />
          <Stack.Screen component={CreatorBioPublicScreen} name="CreatorBioPublic" />
          <Stack.Screen component={ShareRouteScreen} name="ShareRoute" />
          <Stack.Screen component={WebViewScreen} name="WebViewScreen" />
        </>
      )}
    </Stack.Navigator>
  );
}
