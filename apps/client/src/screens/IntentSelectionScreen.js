import React from "react";
import { View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  ChoiceCard,
  EditorialHero
} from "../components";

export default function IntentSelectionScreen({ navigation }) {
  const { setIntent } = useAppContext();

  async function handleSelectIntent(intent) {
    await setIntent(intent);
    navigation.replace(
      intent === "creator"
        ? "CreatorOnboarding"
        : intent === "brand"
        ? "BrandOnboarding"
        : "Home"
    );
  }

  return (
    <AppShell navigation={navigation}>
      <EditorialHero
        eyebrow="Join the inner circle"
        title="Choose your path"
        body="Pick the route that matches how you want to participate."
      />

      <View style={{ flexDirection: "column", gap: 16 }}>
        <View style={{ width: "100%" }}>
          <ChoiceCard
            title="Support creators"
            description=""
            caption="Support your favorite creators, brands, and causes."
            onPress={() => handleSelectIntent("supporter")}
          />
        </View>
        <View style={{ width: "100%" }}>
          <ChoiceCard
            title="I am a creator"
            description=""
            caption="Partner with Brands you love"
            onPress={() => handleSelectIntent("creator")}
          />
        </View>
        <View style={{ width: "100%" }}>
          <ChoiceCard
            title="Brand"
            description=""
            caption="Partner with influencers and connect with the right audience"
            onPress={() => handleSelectIntent("brand")}
          />
        </View>
      </View>
    </AppShell>
  );
}
