import { useEffect, useRef } from "react";
import { useShareIntentContext } from "expo-share-intent";
import { buildShareRouteParams } from "../utils";

export default function ShareIntentBootstrap({ navigationReady, navigationRef }) {
  const { hasShareIntent, resetShareIntent, shareIntent } = useShareIntentContext();
  const handledSignatureRef = useRef("");

  useEffect(() => {
    if (!navigationReady || !navigationRef?.isReady?.() || !hasShareIntent) {
      return;
    }

    const nextParams = buildShareRouteParams({
      sharedText: shareIntent?.text || "",
      sharedUrl: shareIntent?.webUrl || "",
      source: "share-intent"
    });
    const signature = JSON.stringify(nextParams);

    if (handledSignatureRef.current === signature) {
      return;
    }

    handledSignatureRef.current = signature;

    // Native share targets launch the main app; this bridge converts the
    // incoming payload into a normal in-app route handled by React Navigation.
    navigationRef.navigate("ShareRoute", nextParams);
    resetShareIntent();
  }, [
    hasShareIntent,
    navigationReady,
    navigationRef,
    resetShareIntent,
    shareIntent
  ]);

  return null;
}
