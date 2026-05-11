import React, { useState } from "react";
import { Text, View } from "react-native";
import { useAppContext } from "../context";
import { createCreatorReward, isAtribeBackendConfigured } from "../lib";
import { Card, BodyText, InputField, PrimaryButton, SecondaryButton } from "./ui";
import { theme } from "../theme";
import { supabase } from "../lib";

const REWARD_TYPE_OPTIONS = [
  { value: "early_access", label: "Early Access" },
  { value: "shared_community", label: "Shared Community" },
  { value: "private_ama", label: "Private AMA" },
];

export function CreateRewardForm({ onCreated }) {
  const { session } = useAppContext();
  const [rewardType, setRewardType] = useState("early_access");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("100");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const points = parseInt(requiredPoints, 10);
    if (isNaN(points) || points < 0) {
      setError("Required points must be a non-negative number.");
      return;
    }

    if (!isAtribeBackendConfigured) {
      setError("Set EXPO_PUBLIC_ATRIBE_BACKEND_URL to create rewards.");
      return;
    }

    if (!session?.id || session.mode === "demo") {
      setError("Sign in with a non-demo creator account to create rewards.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      await createCreatorReward({
        title: title.trim(),
        description: description.trim() || undefined,
        rewardType,
        requiredPoints: points,
        deliveryType: "external_url",
        destinationUrl: destinationUrl.trim() || undefined,
        isActive,
        accessToken,
      });
      setSuccess(true);
      setTitle("");
      setDescription("");
      setRequiredPoints("100");
      setDestinationUrl("");
      setIsActive(true);
      if (onCreated) {
        onCreated();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card style={styles.card}>
        <Text style={styles.successTitle}>Reward created!</Text>
        <BodyText>Your shoppers can now see and work toward this reward.</BodyText>
        <SecondaryButton
          compact
          label="Create another"
          onPress={() => setSuccess(false)}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Create a reward</Text>

      <View style={styles.typePicker}>
        {REWARD_TYPE_OPTIONS.map((option) => (
          <SecondaryButton
            key={option.value}
            compact
            label={option.label}
            selected={rewardType === option.value}
            onPress={() => setRewardType(option.value)}
          />
        ))}
      </View>

      <InputField
        label="Title"
        placeholder="Early Deal Drops"
        value={title}
        onChangeText={setTitle}
      />

      <InputField
        label="Description"
        placeholder="Get my weekly product picks 48 hours early."
        value={description}
        onChangeText={setDescription}
      />

      <InputField
        label="Required points"
        placeholder="100"
        keyboardType="numeric"
        value={requiredPoints}
        onChangeText={setRequiredPoints}
      />

      <InputField
        label="Destination URL"
        placeholder="https://discord.gg/example"
        keyboardType="url"
        autoCapitalize="none"
        value={destinationUrl}
        onChangeText={setDestinationUrl}
      />

      <View style={styles.typePicker}>
        <SecondaryButton
          compact
          label="Active"
          selected={isActive}
          onPress={() => setIsActive(true)}
        />
        <SecondaryButton
          compact
          label="Inactive"
          selected={!isActive}
          onPress={() => setIsActive(false)}
        />
      </View>

      {error ? <BodyText style={{ color: theme.colors.errorText }}>{error}</BodyText> : null}

      {session?.mode === "demo" ? (
        <BodyText style={styles.hint}>
          Demo creator sessions can browse the rewards UI, but saving rewards requires a real signed-in creator account.
        </BodyText>
      ) : null}

      <PrimaryButton
        label={submitting ? "Creating..." : "Create reward"}
        onPress={handleSubmit}
        disabled={submitting}
      />
    </Card>
  );
}

const styles = {
  card: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 30,
  },
  successTitle: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34,
  },
  typePicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  hint: {
    color: theme.colors.textMuted,
  },
};
