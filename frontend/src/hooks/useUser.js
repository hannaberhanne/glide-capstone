import { useEffect, useState } from "react";
import { auth } from "../config/firebase";

export default function useUser(API_URL) {
  const [user, setUser] = useState(null);
  const [xp, setXp] = useState(0);

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const userData = await res.json();
      setUser(userData);
      if (Array.isArray(userData) && userData[0]?.totalXP !== undefined) {
        setXp(userData[0].totalXP || 0);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [API_URL]);

  return { user, xp, setXp, refreshUser };
}
