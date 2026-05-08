import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useAppContext } from "../context";
import {
  AppShell,
  BodyText,
  Card,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SectionHeader
} from "../components";
import { theme } from "../theme";

export default function FallbackStateScreen({ navigation, route }) {
  const { submitDomainRequest } = useAppContext();
  const [requestedDomain, setRequestedDomain] = useState(route.params?.domain || "");

  async function handleSubmit() {
    try {
      await submitDomainRequest(requestedDomain, route.params?.url || "");
      Alert.alert("Request saved", "We recorded that unsupported domain in local state.");
    } catch (error) {
      Alert.alert("Fallback state", error.message);
    }
  }

  return (
    <AppShell navigation={navigation}>
      <SectionHeader
        eyebrow="Unmapped territory"
        title="This domain is currently unclaimed."
        body="We couldn't find any creators in your selected tribe who currently support this URL. You can request the domain or explore creators who already map other brands."
      />

      <View style={styles.grid}>
        <Card style={styles.primaryCard}>
          <Text style={styles.cardTitle}>Request this domain</Text>
          <InputField
            label="Domain"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste the unsupported domain here..."
            value={requestedDomain}
            onChangeText={setRequestedDomain}
          />
          <PrimaryButton label="Submit request" onPress={handleSubmit} />
        </Card>

        <Card style={styles.secondaryCard}>
          <Text style={styles.cardTitle}>Explore Atribe</Text>
          <BodyText>
            Browse verified creators who are already shaping the network, then return once your tribe covers the domain you want to route.
          </BodyText>
          <SecondaryButton
            label="Browse creators"
            onPress={() => navigation.navigate("CreatorDiscovery")}
          />
        </Card>
      </View>
    </AppShell>
  );
}

const styles = {
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg
  },
  primaryCard: {
    flex: 1,
    minWidth: 320
  },
  secondaryCard: {
    width: 320
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  }
};
