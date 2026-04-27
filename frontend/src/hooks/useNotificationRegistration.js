import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteToken as firebaseDeleteToken,
  getMessagingInstance,
  getToken as firebaseGetToken,
  messagingConfig,
  onMessage,
} from "../config/firebase.js";
import { apiClient } from "../lib/apiClient.js";

const LOCAL_TOKEN_ID_KEY = "glide_push_token_id";

function getStoredTokenId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LOCAL_TOKEN_ID_KEY) || "";
}

function setStoredTokenId(tokenId) {
  if (typeof window === "undefined") return;
  if (!tokenId) {
    window.localStorage.removeItem(LOCAL_TOKEN_ID_KEY);
    return;
  }
  window.localStorage.setItem(LOCAL_TOKEN_ID_KEY, tokenId);
}

function readPermissionState() {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

export default function useNotificationRegistration() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState(() => readPermissionState());
  const [tokens, setTokens] = useState([]);
  const [registering, setRegistering] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [lastForegroundMessage, setLastForegroundMessage] = useState(null);

  const vapidConfigured = Boolean(messagingConfig.vapidKey);

  const refreshTokens = useCallback(async () => {
    try {
      const data = await apiClient.get("/api/notifications/device-tokens");
      setTokens(Array.isArray(data?.tokens) ? data.tokens : []);
    } catch (error) {
      if (error?.message !== "Not authenticated") {
        console.error("Failed to fetch device tokens:", error);
      }
      setTokens([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    getMessagingInstance()
      .then((instance) => {
        if (cancelled) return;
        setSupported(Boolean(instance));

        if (!instance) return;
        unsubscribe = onMessage(instance, (payload) => {
          setLastForegroundMessage(payload);
        });
      })
      .catch((error) => {
        console.error("Messaging support check failed:", error);
        if (!cancelled) setSupported(false);
      });

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    refreshTokens().catch(() => {});
  }, [refreshTokens]);

  const localTokenId = getStoredTokenId();
  const currentBrowserToken = useMemo(
    () => tokens.find((token) => token.tokenId === localTokenId) || null,
    [tokens, localTokenId]
  );

  const browserRegistered = Boolean(currentBrowserToken?.active);

  const registerThisBrowser = useCallback(async () => {
    setRegistering(true);
    setRegistrationError("");
    setPermission(readPermissionState());

    try {
      if (!supported) {
        throw new Error("Push notifications are not supported in this browser.");
      }

      if (!vapidConfigured) {
        throw new Error("Missing VAPID key. Add VITE_FIREBASE_VAPID_KEY before registering this browser.");
      }

      if (typeof navigator === "undefined" || !navigator.serviceWorker) {
        throw new Error("Service workers are not available in this browser.");
      }

      const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const messaging = await getMessagingInstance();

      if (!messaging) {
        throw new Error("Firebase messaging is not available in this browser.");
      }

      const token = await firebaseGetToken(messaging, {
        vapidKey: messagingConfig.vapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        throw new Error("No registration token was returned by Firebase Messaging.");
      }

      const data = await apiClient.post("/api/notifications/device-tokens", {
        token,
        platform: "web",
        provider: "fcm",
      });

      setStoredTokenId(data?.tokenId || "");
      setPermission(readPermissionState());
      await refreshTokens();
      return data;
    } catch (error) {
      console.error("Browser notification registration failed:", error);
      setPermission(readPermissionState());
      setRegistrationError(error?.message || "Unable to register this browser for notifications.");
      throw error;
    } finally {
      setRegistering(false);
    }
  }, [refreshTokens, supported, vapidConfigured]);

  const disableThisBrowser = useCallback(async () => {
    setDisabling(true);
    setRegistrationError("");

    try {
      const tokenId = getStoredTokenId();
      if (tokenId) {
        await apiClient.patch(`/api/notifications/device-tokens/${tokenId}`, {
          active: false,
          platform: "web",
          provider: "fcm",
        });
      }

      const messaging = await getMessagingInstance();
      if (messaging) {
        await firebaseDeleteToken(messaging).catch((error) => {
          console.error("Failed to delete Firebase token locally:", error);
        });
      }

      setStoredTokenId("");
      await refreshTokens();
    } catch (error) {
      console.error("Disable browser notifications failed:", error);
      setRegistrationError(error?.message || "Unable to disable notifications on this browser.");
      throw error;
    } finally {
      setDisabling(false);
    }
  }, [refreshTokens]);

  return {
    supported,
    vapidConfigured,
    permission,
    tokens,
    browserRegistered,
    currentBrowserToken,
    registering,
    disabling,
    registrationError,
    lastForegroundMessage,
    refreshTokens,
    registerThisBrowser,
    disableThisBrowser,
  };
}
