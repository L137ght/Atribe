import React from "react";
import {
  AccessibilityInfo,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { theme } from "../theme";
import { useAppContext } from "../context";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedText = Animated.createAnimatedComponent(Text);
const LIGHT_PINK = "#ffafd6";
const SOFT_IVORY = "#ffe9f4";
const MID_PINK = "#f287c0";
const ROSE_MAGENTA = "#de5ca6";
const BRIGHT_BERRY = "#c93e90";
const DARK_RASPBERRY = "#8f0164";

const NICHE_PLACEHOLDERS = {
  "Howto & Style": require("../../assets/placeholders/avatar_cooking.png"),
  "Music": require("../../assets/placeholders/avatar_music.png"),
  "Gaming": require("../../assets/placeholders/avatar_gaming.png"),
  "Autos & Vehicles": require("../../assets/placeholders/avatar_autos.png"),
  "Film & Animation": require("../../assets/placeholders/avatar_film.png"),
  "Pets & Animals": require("../../assets/placeholders/avatar_pets.png"),
  "Sports": require("../../assets/placeholders/avatar_sports.png"),
  "Travel & Events": require("../../assets/placeholders/avatar_travel.png"),
  "Education": require("../../assets/placeholders/avatar_education.png"),
  "Science & Technology": require("../../assets/placeholders/avatar_science.png"),
  "Sustainability": require("../../assets/placeholders/avatar_sustainability.png"),
  "Visual storytelling": require("../../assets/placeholders/avatar_photography.png"),
  "Lifestyle / tech": require("../../assets/placeholders/avatar_tech.png"),
  "Editorial style": require("../../assets/placeholders/avatar_photography.png"),
  "Architecture": require("../../assets/placeholders/avatar_photography.png")
};

export function CreatorAvatar({ creator, size = 34, style }) {
  if (!creator) return null;

  const source = creator.profilePic 
    ? { uri: creator.profilePic } 
    : (NICHE_PLACEHOLDERS[creator.niche] || null);

  if (source) {
    return (
      <Image 
        source={source} 
        style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: theme.colors.borderSubtle }, style]} 
      />
    );
  }

  const initial = creator.name ? creator.name.charAt(0).toUpperCase() : "A";
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surfaceElevated }, style]}>
      <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.sans, fontWeight: "700" }}>{initial}</Text>
    </View>
  );
}

function useReducedMotionPreference() {
  const [reducedMotionEnabled, setReducedMotionEnabled] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    if (typeof AccessibilityInfo.isReduceMotionEnabled === "function") {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          if (isMounted) {
            setReducedMotionEnabled(enabled);
          }
        })
        .catch(() => {});
    }

    const subscription = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      setReducedMotionEnabled
    );

    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reducedMotionEnabled;
}

function GradientLabel({ text, style, palette }) {
  return (
    <Text style={style}>
      {text.split("").map((char, index) => {
        const color = palette[Math.min(index, palette.length - 1)];

        return (
          <Text key={`${char}-${index}`} style={{ color }}>
            {char}
          </Text>
        );
      })}
    </Text>
  );
}

function getBrandGlowStyles(hovered) {
  const glow = hovered ? theme.effects.brandGlow.hover : theme.effects.brandGlow.base;

  return Platform.OS === "web"
    ? {
        text: {
          textShadow: glow.textShadow
        },
        wrapper: {
          filter: glow.filter
        }
      }
    : {
        text: {
          textShadowColor: glow.nativeTextShadowColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: glow.nativeTextShadowRadius
        },
        wrapper: null
      };
}

export function GradientWordmark({ text = "Atribe" }) {
  const [hovered, setHovered] = React.useState(false);
  const palette = hovered
    ? [SOFT_IVORY, LIGHT_PINK, MID_PINK, ROSE_MAGENTA, BRIGHT_BERRY, DARK_RASPBERRY]
    : [LIGHT_PINK, "#f9a6cf", MID_PINK, "#e772b6", ROSE_MAGENTA, BRIGHT_BERRY];
  const glowStyles = getBrandGlowStyles(hovered);

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={styles.brandPressable}
    >
      <View
        style={[
          glowStyles.wrapper,
          Platform.OS === "web" && {
            transform: hovered ? "translateY(-1px)" : "translateY(0px)",
            transitionDuration: "280ms",
            transitionProperty: "transform, filter"
          }
        ]}
      >
        <GradientLabel palette={palette} style={[styles.brand, glowStyles.text]} text={text} />
      </View>
    </Pressable>
  );
}

export function AppShell({
  activeRoute,
  children,
  navigation,
  title,
  subtitle,
  hideNavigation = false
}) {
  const { currentCreator, intent, t } = useAppContext();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const navItems =
    intent === "creator"
      ? [
          { route: "CreatorDiscovery", label: t("navigation.discover", "Discover") },
          { route: "CreatorDashboard", label: t("navigation.dashboard", "Dashboard") },
          { route: "Settings", label: t("navigation.settings", "Settings") }
        ]
      : intent === "brand"
      ? [
          { route: "BrandHome", label: t("navigation.brand", "Brand") },
          { route: "CreateCampaign", label: t("navigation.campaign", "Campaign") },
          { route: "Settings", label: t("navigation.settings", "Settings") }
        ]
      : [
          { route: "Home", label: t("navigation.links", "Links") },
          { route: "CreatorDiscovery", label: t("navigation.discover", "Discover") },
          { route: "Settings", label: t("navigation.settings", "Settings") }
        ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.bgHaloTop} />
      <View pointerEvents="none" style={styles.bgHaloBottom} />
      <View pointerEvents="none" style={styles.bgTexture} />

      <View style={styles.root}>
        <View style={styles.topBar}>
          <GradientWordmark />
          {!isCompact && !hideNavigation ? (
            <View style={styles.navRow}>
              {navItems.map((item) => (
                <NavLink
                  key={item.route}
                  active={activeRoute === item.route}
                  label={item.label}
                  onPress={() => navigation?.navigate(item.route)}
                />
              ))}
            </View>
          ) : (
            <View />
          )}
          {currentCreator ? (
            <CreatorAvatar creator={currentCreator} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {(title || subtitle) && (
            <View style={styles.inlineHeading}>
              {title ? <Text style={styles.inlineTitle}>{title}</Text> : null}
              {subtitle ? <BodyText>{subtitle}</BodyText> : null}
            </View>
          )}
          {children}
        </ScrollView>

        {isCompact && !hideNavigation ? (
          <View style={styles.bottomBar}>
            {navItems.map((item) => (
              <NavLink
                key={item.route}
                active={activeRoute === item.route}
                compact
                label={item.label}
                onPress={() => navigation?.navigate(item.route)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function EditorialHero({ eyebrow, title, body, action }) {
  return (
    <View style={styles.hero}>
      {eyebrow ? <Kicker>{eyebrow}</Kicker> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      {body ? <BodyText style={styles.heroBody}>{body}</BodyText> : null}
      {action ? <View style={{ marginTop: theme.spacing.sm }}>{action}</View> : null}
    </View>
  );
}

export function SectionHeader({ eyebrow, title, body, action }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Kicker>{eyebrow}</Kicker> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {body ? <BodyText>{body}</BodyText> : null}
      </View>
      {action ? <View style={styles.sectionAction}>{action}</View> : null}
    </View>
  );
}

export function ChoiceCard({ title, description, caption, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choiceCard, pressed && styles.pressed]}>
      <Kicker>{caption}</Kicker>
      <Text style={styles.choiceTitle}>{title}</Text>
      <BodyText>{description}</BodyText>
      <Text style={styles.choiceCta}>Continue</Text>
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatTile({ label, value, detail }) {
  return (
    <Card style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <BodyText>{detail}</BodyText>
    </Card>
  );
}

export function Kicker({ children, style }) {
  return <Text style={[styles.kicker, style]}>{children}</Text>;
}

export function BodyText({ children, style, ...props }) {
  return (
    <Text style={[styles.bodyText, style]} {...props}>
      {children}
    </Text>
  );
}

export function InputField({ label, style, inputStyle, ...props }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, inputStyle]}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({
  compact = false,
  disabled = false,
  label,
  onPress,
  style,
  variant = "solid"
}) {
  if (variant === "gradient") {
    return (
      <GradientButton compact={compact} disabled={disabled} label={label} onPress={onPress} style={style} />
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles.primaryButton,
        compact && styles.buttonCompact,
        disabled && styles.buttonDisabled,
        !disabled && pressed && styles.pressed,
        style
      ]}
    >
      <Text style={[styles.primaryButtonText, disabled && styles.primaryButtonTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

export function GradientButton({ compact = false, disabled = false, label, onPress, style }) {
  const reducedMotionEnabled = useReducedMotionPreference();
  const interactionProgress = useSharedValue(0);
  const [isFocused, setIsFocused] = React.useState(false);
  const [buttonWidth, setButtonWidth] = React.useState(compact ? 152 : 214);
  const interactionState = React.useRef({ hovered: false, pressed: false });

  const transitionDuration = reducedMotionEnabled ? 0 : 760;
  const gradientWidth = buttonWidth * 1.8;
  const gradientOffset = -((gradientWidth - buttonWidth) / 2);

  const setInteractionActive = React.useCallback(
    (key, active) => {
      interactionState.current[key] = active;
      const nextValue =
        interactionState.current.hovered || interactionState.current.pressed ? 1 : 0;

      interactionProgress.value = withTiming(nextValue, {
        duration: transitionDuration,
        easing: Easing.inOut(Easing.cubic)
      });
    },
    [interactionProgress, transitionDuration]
  );

  const animatedShellStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      interactionProgress.value,
      [0, 1],
      [theme.colors.accentBorder, "rgba(255, 175, 214, 0.3)"]
    ),
    transform: [
      {
        scale: reducedMotionEnabled ? 1 : 1 + interactionProgress.value * 0.02
      }
    ]
  }));

  const animatedGradientStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: gradientOffset + interactionProgress.value * (buttonWidth * 0.34)
      }
    ]
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      interactionProgress.value,
      [0, 1],
      [theme.colors.bgPrimary, theme.colors.textPrimary]
    )
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setInteractionActive("pressed", true)}
      onPressOut={() => setInteractionActive("pressed", false)}
      onHoverIn={() => setInteractionActive("hovered", true)}
      onHoverOut={() => setInteractionActive("hovered", false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onLayout={(event) => setButtonWidth(event.nativeEvent.layout.width)}
      accessibilityRole="button"
      style={style}
    >
      <Animated.View
        style={[
          styles.button,
          styles.gradientButtonNative,
          compact && styles.buttonCompact,
          disabled && styles.buttonDisabled,
          animatedShellStyle,
          isFocused && styles.gradientButtonFocused
        ]}
      >
        <AnimatedLinearGradient
          colors={[theme.colors.accent, theme.colors.accentSoft, theme.colors.accent]}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={[
            styles.gradientButtonAnimatedLayer,
            {
              width: gradientWidth,
              left: gradientOffset
            },
            animatedGradientStyle
          ]}
        />
        <AnimatedText
          style={[styles.primaryButtonText, styles.gradientButtonNativeText, animatedTextStyle]}
        >
          {label}
        </AnimatedText>
      </Animated.View>
    </Pressable>
  );
}

export function SecondaryButton({
  compact = false,
  label,
  onPress,
  selected = false,
  style
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles.secondaryButton,
        compact && styles.buttonCompact,
        selected && styles.secondarySelected,
        pressed && styles.pressed,
        style
      ]}
    >
      <Text style={[styles.secondaryButtonText, selected && styles.secondarySelectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function NavLink({ active, compact = false, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navLink,
        compact && styles.navLinkCompact,
        active && styles.navLinkActive,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary
  },
  root: {
    flex: 1
  },
  bgHaloTop: {
    position: "absolute",
    top: -120,
    right: -40,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(143,1,100,0.18)"
  },
  bgHaloBottom: {
    position: "absolute",
    bottom: -160,
    left: -40,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(255,175,214,0.06)"
  },
  bgTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: "transparent"
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: "rgba(18,10,14,0.72)"
  },
  brandPressable: {
    alignSelf: "flex-start"
  },
  brand: {
    fontFamily: theme.fonts.serif,
    fontSize: 32,
    fontStyle: "italic"
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated
  },
  avatarText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontWeight: "700"
  },
  scrollContent: {
    width: "100%",
    maxWidth: theme.layout.maxWidth,
    alignSelf: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
    gap: theme.layout.contentGap,
    paddingBottom: 120
  },
  inlineHeading: {
    gap: 6
  },
  inlineTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 28,
    lineHeight: 34
  },
  hero: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    maxWidth: 820
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.display.fontSize,
    lineHeight: theme.typography.display.lineHeight,
    fontWeight: theme.typography.display.fontWeight
  },
  heroBody: {
    maxWidth: 720
  },
  sectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  sectionCopy: {
    flex: 1,
    minWidth: 280,
    gap: 8
  },
  sectionAction: {
    alignItems: "flex-start"
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.hero.fontSize,
    lineHeight: theme.typography.hero.lineHeight
  },
  kicker: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  bodyText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.sans,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md
  },
  statTile: {
    minWidth: 220,
    flex: 1
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  statValue: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 34,
    lineHeight: 40
  },
  choiceCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  choiceTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 34,
    lineHeight: 40
  },
  choiceCta: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  fieldWrap: {
    gap: 8
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  input: {
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.textMuted,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    paddingVertical: 12
  },
  button: {
    minHeight: 52,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonCompact: {
    minHeight: 40,
    paddingHorizontal: 16
  },
  primaryButton: {
    backgroundColor: theme.colors.accent
  },
  primaryButtonText: {
    color: theme.colors.buttonText,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12
  },
  primaryButtonTextDisabled: {
    opacity: 0.6
  },
  buttonDisabled: {
    opacity: 0.45
  },
  gradientButtonNative: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    backgroundColor: theme.colors.accent
  },
  gradientButtonAnimatedLayer: {
    position: "absolute",
    top: 0,
    bottom: 0
  },
  gradientButtonFocused: {
    shadowColor: theme.colors.accentSoft,
    shadowOpacity: 0.2,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0
    },
    elevation: 0,
    outlineWidth: 2,
    outlineColor: theme.colors.accentSoft,
    outlineStyle: "solid",
    outlineOffset: 2
  },
  gradientButtonNativeText: {
    color: theme.colors.bgPrimary
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(242,221,228,0.18)",
    backgroundColor: "transparent"
  },
  secondarySelected: {
    backgroundColor: "rgba(143,1,100,0.18)",
    borderColor: theme.colors.accentBorder
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12
  },
  secondarySelectedText: {
    color: theme.colors.accentSoft
  },
  navLink: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  navLinkCompact: {
    flex: 1
  },
  navLinkActive: {
    backgroundColor: "rgba(143,1,100,0.18)"
  },
  navLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  navLabelActive: {
    color: theme.colors.accentSoft
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    backgroundColor: "rgba(18,10,14,0.92)"
  },
  pressed: {
    opacity: 0.86
  }
});
