import { useCallback, useEffect, useState } from "react";
import { auth } from "../config/firebase";

export default function useUser(API_URL) {
  const [user, setUser] = useState(null);
  const [xp, setXp] = useState(0);

  const fillProfileGaps = useCallback(async (userData) => {
    if (!auth.currentUser) return;
    const profile = Array.isArray(userData) ? userData[0] : userData;
    if (!profile) return;

    const displayName = auth.currentUser.displayName || "";
    const [firstFromName] = displayName.split(" ").filter(Boolean);
    const payload = {};

    if (!profile.firstName && firstFromName) {
      payload.firstName = firstFromName;
    }
    if (!profile.lastName && displayName && displayName.includes(" ")) {
      payload.lastName = displayName.split(" ").slice(-1)[0];
    }
    if (!profile.email && auth.currentUser.email) {
      payload.email = auth.currentUser.email;
    }

    if (!Object.keys(payload).length) {
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${API_URL}/api/users/${auth.currentUser.uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Failed to fill profile gaps:", err);
    }
  }, [API_URL]);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const uid = auth.currentUser.uid;
      const res = await fetch(`${API_URL}/api/users/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const userData = await res.json();
      setUser(userData);
      if (Array.isArray(userData) && userData[0]?.totalXP !== undefined) {
        setXp(userData[0].totalXP || 0);
      }
      await fillProfileGaps(userData);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  }, [API_URL]);

  useEffect(() => {
    refreshUser();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        refreshUser();
      } else {
        setUser(null);
        setXp(0);
      }
    });
    return () => unsubscribe();
  }, [refreshUser]);

  return { user, xp, setXp, refreshUser };
}
