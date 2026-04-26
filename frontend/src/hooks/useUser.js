import { useCallback, useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { apiClient } from "../lib/apiClient.js";

export default function useUser() {
  const [user, setUser] = useState(null);
  const [xp, setXp] = useState(0);
  const [userLoading, setUserLoading] = useState(true);

  const fillProfileGaps = useCallback(async (userData) => {
    if (!auth.currentUser) return;
    const profile = Array.isArray(userData) ? userData[0] : userData;
    if (!profile) return;

    const displayName = auth.currentUser.displayName || "";
    const [firstFromName] = displayName.split(" ").filter(Boolean);
    const payload = {};

    if (!profile.firstName && firstFromName) payload.firstName = firstFromName;
    if (!profile.lastName && displayName.includes(" ")) {
      payload.lastName = displayName.split(" ").slice(-1)[0];
    }
    if (!profile.email && auth.currentUser.email) payload.email = auth.currentUser.email;

    if (!Object.keys(payload).length) return;

    try {
      await apiClient.patch(`/api/users/${auth.currentUser.uid}`, payload);
    } catch (err) {
      console.error("Failed to fill profile gaps:", err);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) {
      setUser(null);
      setXp(0);
      setUserLoading(false);
      return;
    }
    setUserLoading(true);
    try {
      const uid = auth.currentUser.uid;
      const userData = await apiClient.get(`/api/users/${uid}`);
      setUser(userData);
      if (Array.isArray(userData) && userData[0]?.totalXP !== undefined) {
        setXp(userData[0].totalXP || 0);
      }
      await fillProfileGaps(userData);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    } finally {
      setUserLoading(false);
    }
  }, [fillProfileGaps]);

  useEffect(() => {
    refreshUser();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        refreshUser();
      } else {
        setUser(null);
        setXp(0);
        setUserLoading(false);
      }
    });
    return () => unsubscribe();
  }, [refreshUser]);

  return { user, xp, setXp, refreshUser, userLoading };
}
