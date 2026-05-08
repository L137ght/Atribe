import React from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Asset } from "expo-asset";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { BodyText, GradientButton } from "../components";
import { useAppContext } from "../context";
import { theme } from "../theme";

const LIGHT_PINK = "#ffafd6";
const SOFT_IVORY = "#ffe9f4";
const MID_PINK = "#f287c0";
const ROSE_MAGENTA = "#de5ca6";
const BRIGHT_BERRY = "#c93e90";
const DARK_RASPBERRY = "#8f0164";

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

function GradientTextLine({ text, style }) {
  if (Platform.OS === "web") {
    return (
      <Text
        style={[
          style,
          {
            backgroundImage:
              "linear-gradient(90deg, #ffe9f4 0%, #ffafd6 22%, #f287c0 52%, #e772b6 76%, #de5ca6 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent"
          }
        ]}
      >
        {text}
      </Text>
    );
  }

  return (
    <Text style={[style, { color: theme.colors.accentSoft }]}>
      {text}
    </Text>
  );
}

function GradientWordmark() {
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
        <GradientLabel palette={palette} style={[styles.brand, glowStyles.text]} text="Atribe" />
      </View>
    </Pressable>
  );
}

function LandingGhostButton({ label, onPress }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={[
        styles.loginButton,
        hovered && styles.loginButtonHovered,
        Platform.OS === "web" &&
          hovered && {
            boxShadow: "0 16px 44px rgba(143, 1, 100, 0.18)"
          }
      ]}
    >
      {Platform.OS === "web" ? (
        <View
          pointerEvents="none"
          style={[
            styles.loginGlow,
            {
              opacity: hovered ? 1 : 0,
              backgroundImage:
                "linear-gradient(120deg, rgba(255, 175, 214, 0.18) 0%, rgba(143, 1, 100, 0.22) 100%)",
              transitionDuration: "220ms",
              transitionProperty: "opacity"
            }
          ]}
        />
      ) : null}
      <Text style={[styles.loginButtonText, hovered && styles.loginButtonTextHovered]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function LandingScreen({ navigation }) {
  const { currentCreator, intent, session } = useAppContext();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 720;
  const isNarrow = width < 430;
  const isWide = width >= 1100;
  const isShort = height < 860;
  const heroMinHeight = isCompact
    ? Math.min(Math.max(height * 0.56, 560), 720)
    : Math.max(height - 170, 680);
  const source = require("../../assets/hero-loop.mp4");
  const mobileTitleSize = isCompact
    ? Math.round(Math.min(Math.max(heroMinHeight * 0.078, isNarrow ? 58 : 78), isNarrow ? 70 : 92))
    : null;
  const mobileBodySize = isCompact
    ? Math.round(Math.min(Math.max(heroMinHeight * 0.026, isNarrow ? 22 : 25), isNarrow ? 25 : 30))
    : null;
  const mobileEmphasisSize = isCompact
    ? Math.round(Math.min(Math.max(heroMinHeight * 0.038, isNarrow ? 32 : 36), isNarrow ? 36 : 44))
    : null;

  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.playbackRate = 0.7;
    videoPlayer.play();
  });

  const webSource = Platform.OS === "web" ? Asset.fromModule(source).uri : null;

  React.useEffect(() => {
    if (!session?.id) {
      return;
    }

    if (!intent) {
      navigation.replace("IntentSelection");
      return;
    }

    if (intent === "creator") {
      navigation.replace(currentCreator ? "CreatorDashboard" : "CreatorOnboarding");
      return;
    }

    navigation.replace("Home");
  }, [currentCreator, intent, navigation, session?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={[styles.topBar, isCompact && styles.topBarCompact]}>
          <GradientWordmark />
          {isCompact ? (
            <View style={styles.mobileHeaderActions}>
              <GradientButton
                compact
                label="Get Started"
                onPress={() => navigation.navigate("Login")}
              />
              <LandingGhostButton label="Log in" onPress={() => navigation.navigate("Login")} />
            </View>
          ) : null}
          {!isCompact ? (
            <LandingGhostButton label="Log in" onPress={() => navigation.navigate("Login")} />
          ) : null}
        </View>

        <View style={styles.mediaShell}>
          {Platform.OS === "web" ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              src={webSource}
              style={styles.webVideo}
            />
          ) : (
            <VideoView
              allowsFullscreen={false}
              contentFit="cover"
              nativeControls={false}
              player={player}
              style={styles.video}
            />
          )}

          <LinearGradient
            colors={[
              "rgba(18,10,14,0.28)",
              "rgba(18,10,14,0.56)",
              "rgba(18,10,14,0.88)"
            ]}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              isWide && styles.scrollContentWide,
              isCompact && styles.scrollContentCompact
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.heroSection,
                { minHeight: heroMinHeight },
                isWide && styles.heroSectionWide,
                isCompact && styles.heroSectionCompact,
                isShort && !isCompact && styles.heroSectionShort
              ]}
            >
              <View
                style={[
                  styles.heroPrimary,
                  isCompact && styles.heroPrimaryCompact,
                  isWide && styles.heroPrimaryWide
                ]}
              >
                <View style={[styles.copyBlock, isCompact && styles.copyBlockCompact]}>
                  <Text
                    style={[
                      styles.title,
                      isWide && styles.titleWide,
                      isCompact && styles.titleCompact,
                      isNarrow && styles.titleNarrow,
                      isShort && !isCompact && styles.titleShort,
                      isCompact && {
                        fontSize: mobileTitleSize,
                        lineHeight: Math.round(mobileTitleSize * 1.2)
                      }
                    ]}
                  >
                    {isCompact ? (
                      <>
                        Support{"\n"}
                        Your Favorite{"\n"}
                        Creators{"\n"}
                        When You Shop
                      </>
                    ) : (
                      "Support your favorite creators when you shop."
                    )}
                  </Text>
                <BodyText
                  style={[
                    styles.body,
                    isCompact && styles.bodyCompact,
                    isNarrow && styles.bodyNarrow,
                    isCompact && {
                      fontSize: mobileBodySize,
                      lineHeight: Math.round(mobileBodySize * 1.45)
                    }
                  ]}
                >
                  Pick the creators you love.
                  {"\n"}
                  We make sure they benefit when you buy online.
                </BodyText>
                <GradientTextLine
                  style={[
                    styles.bodyEmphasis,
                    isCompact && styles.bodyEmphasisCompact,
                    isNarrow && styles.bodyEmphasisNarrow,
                    isCompact && {
                      fontSize: mobileEmphasisSize,
                      lineHeight: Math.round(mobileEmphasisSize * 1.2)
                    }
                  ]}
                  text={isCompact ? "Better Deals. No Extra Cost" : "Better Deals. No added Costs"}
                />
              </View>

                {!isCompact ? (
                  <View style={[styles.actions, isWide && styles.actionsWide]}>
                    <GradientButton
                      label="Get Started"
                      onPress={() => navigation.navigate("Login")}
                    />
                  </View>
                ) : null}
              </View>

              {isWide ? (
                <View style={[styles.infoCard, styles.infoCardWide]}>
                  <Text style={styles.infoLabel}>What it does</Text>
                  <View style={styles.infoList}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoNumber}>1.</Text>
                      <View style={styles.infoCopy}>
                        <Text style={styles.infoTitle}>Choose your creators</Text>
                        <BodyText style={styles.infoText}>
                          Pick the people you want to support.
                        </BodyText>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoNumber}>2.</Text>
                      <View style={styles.infoCopy}>
                        <Text style={styles.infoTitle}>Shop like you normally do</Text>
                        <BodyText style={styles.infoText}>
                          We automatically support them when you buy.
                        </BodyText>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoNumber}>3.</Text>
                      <View style={styles.infoCopy}>
                        <Text style={styles.infoTitle}>Get the best deals</Text>
                        <BodyText style={styles.infoText}>
                          Users get rewarded by getting the best deals.
                        </BodyText>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}

            </View>

            {!isWide && !isCompact ? (
              <>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>What it does</Text>
                  <View style={styles.infoList}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoNumber}>1.</Text>
                      <View style={styles.infoCopy}>
                        <Text style={styles.infoTitle}>Choose your creators</Text>
                        <BodyText style={styles.infoText}>
                          Pick the people you want to support.
                        </BodyText>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoNumber}>2.</Text>
                      <View style={styles.infoCopy}>
                        <Text style={styles.infoTitle}>Shop like you normally do</Text>
                        <BodyText style={styles.infoText}>
                          We automatically support them when you buy.
                        </BodyText>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoNumber}>3.</Text>
                      <View style={styles.infoCopy}>
                        <Text style={styles.infoTitle}>Get the best deals</Text>
                        <BodyText style={styles.infoText}>
                          Users get rewarded by getting the best deals.
                        </BodyText>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            {isCompact ? (
              <View style={[styles.infoCard, styles.infoCardCompact]}>
                <Text style={[styles.infoLabel, styles.infoLabelCompact]}>What it does</Text>
                <View style={[styles.infoList, styles.infoListCompact]}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoNumber, styles.infoNumberCompact]}>1.</Text>
                    <View style={styles.infoCopy}>
                      <Text style={[styles.infoTitle, styles.infoTitleCompact]}>Choose your creators</Text>
                      <BodyText style={[styles.infoText, styles.infoTextCompact]}>
                        Pick the people you want to support.
                      </BodyText>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoNumber, styles.infoNumberCompact]}>2.</Text>
                    <View style={styles.infoCopy}>
                      <Text style={[styles.infoTitle, styles.infoTitleCompact]}>Shop like you normally do</Text>
                      <BodyText style={[styles.infoText, styles.infoTextCompact]}>
                        We automatically support them when you buy.
                      </BodyText>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoNumber, styles.infoNumberCompact]}>3.</Text>
                    <View style={styles.infoCopy}>
                      <Text style={[styles.infoTitle, styles.infoTitleCompact]}>Get the best deals</Text>
                      <BodyText style={[styles.infoText, styles.infoTextCompact]}>
                        Users get rewarded by getting the best deals.
                      </BodyText>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

          </ScrollView>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary
  },
  root: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  },
  topBarCompact: {
    gap: theme.spacing.md
  },
  mobileHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  brandPressable: {
    alignSelf: "flex-start"
  },
  brand: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.serif,
    fontSize: 36,
    fontStyle: "italic"
  },
  loginButton: {
    minHeight: 40,
    minWidth: 92,
    paddingHorizontal: 18,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(242,221,228,0.18)",
    backgroundColor: "rgba(18,10,14,0.28)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  loginButtonHovered: {
    borderColor: "rgba(255,175,214,0.34)",
    backgroundColor: "rgba(36,24,30,0.72)"
  },
  loginGlow: {
    ...StyleSheet.absoluteFillObject
  },
  loginButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12
  },
  loginButtonTextHovered: {
    color: theme.colors.accentSoft
  },
  mediaShell: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface
  },
  video: {
    ...StyleSheet.absoluteFillObject
  },
  webVideo: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl * 1.5
  },
  scrollContentWide: {
    paddingBottom: theme.spacing.xxl
  },
  scrollContentCompact: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md
  },
  heroSection: {
    flex: 1,
    justifyContent: "space-between",
    gap: theme.spacing.xl,
    paddingTop: theme.spacing.xxl * 0.75,
    paddingBottom: theme.spacing.xxl * 0.5
  },
  heroSectionWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxl
  },
  heroSectionCompact: {
    flex: 0,
    justifyContent: "space-between",
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.lg
  },
  heroSectionShort: {
    paddingTop: theme.spacing.lg
  },
  copyBlock: {
    width: "100%",
    maxWidth: 760,
    gap: theme.spacing.lg
  },
  copyBlockCompact: {
    maxWidth: "100%",
    gap: theme.spacing.md
  },
  heroPrimary: {
    flex: 1,
    justifyContent: "space-between",
    minWidth: 0
  },
  heroPrimaryCompact: {
    flex: 0,
    flexShrink: 0,
    justifyContent: "flex-start",
    gap: theme.spacing.lg
  },
  heroPrimaryWide: {
    maxWidth: 760,
    minHeight: 560,
    alignSelf: "center"
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 62,
    lineHeight: 68,
    fontWeight: "300",
    maxWidth: 760
  },
  titleWide: {
    fontSize: 74,
    lineHeight: 80,
    maxWidth: 700
  },
  titleCompact: {
    fontSize: 65,
    lineHeight: 78,
    maxWidth: "100%"
  },
  titleNarrow: {
    fontSize: 50,
    lineHeight: 62
  },
  titleShort: {
    fontSize: 42,
    lineHeight: 46
  },
  body: {
    maxWidth: 560,
    color: theme.colors.textPrimary,
    fontSize: 18,
    lineHeight: 31,
    marginTop: Math.round(theme.spacing.sm * 1.4)
  },
  bodyCompact: {
    fontSize: 23,
    lineHeight: 34,
    maxWidth: "100%",
    marginTop: Math.round(theme.spacing.md * 1.26)
  },
  bodyNarrow: {
    fontSize: 22,
    lineHeight: 33
  },
  bodyEmphasis: {
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    marginTop: theme.spacing.md
  },
  bodyEmphasisCompact: {
    fontSize: 32,
    lineHeight: 40,
    marginTop: Math.round(theme.spacing.md * 1.25),
    marginBottom: Math.round(theme.spacing.lg * 1.2)
  },
  bodyEmphasisNarrow: {
    fontSize: 30,
    lineHeight: 38,
    marginTop: theme.spacing.md
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: theme.spacing.md
  },
  actionsWide: {
    paddingTop: theme.spacing.xxl,
    alignSelf: "flex-start"
  },
  actionsCompact: {
    paddingTop: theme.spacing.sm,
    alignItems: "flex-start"
  },
  bottomCtaCompact: {
    paddingTop: theme.spacing.lg,
    alignItems: "flex-start"
  },
  infoCard: {
    width: "100%",
    maxWidth: 760,
    marginTop: theme.spacing.xxl,
    padding: theme.spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(242,221,228,0.12)",
    backgroundColor: "rgba(29,17,22,0.8)",
    gap: theme.spacing.lg
  },
  infoCardWide: {
    width: 380,
    maxWidth: 380,
    marginTop: 0,
    minHeight: 560,
    alignSelf: "center",
    justifyContent: "center"
  },
  infoCardCompact: {
    alignSelf: "center",
    flexShrink: 0,
    marginTop: Math.round(theme.spacing.xxl * 1.44),
    padding: theme.spacing.lg,
    maxWidth: 560
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase"
  },
  infoList: {
    gap: theme.spacing.lg
  },
  infoListCompact: {
    gap: theme.spacing.md
  },
  infoLabelCompact: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 1.8
  },
  infoRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "flex-start"
  },
  infoNumber: {
    width: 28,
    color: theme.colors.accentSoft,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: 4
  },
  infoNumberCompact: {
    fontSize: 14,
    lineHeight: 20
  },
  infoCopy: {
    flex: 1,
    gap: 6
  },
  infoTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600"
  },
  infoTitleCompact: {
    fontSize: 24,
    lineHeight: 30
  },
  infoText: {
    color: theme.colors.textSecondary
  },
  infoTextCompact: {
    fontSize: 20,
    lineHeight: 28
  }
});
