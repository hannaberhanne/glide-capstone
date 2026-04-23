import { useCallback, useEffect, useState } from "react";
import { auth } from "../config/firebase";

export default function useCanvasStatus(API_URL) {
  const [canvasStatus, setCanvasStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchCanvasStatus = useCallback(async () => {
    if (!auth.currentUser) return;
    setStatusLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/canvas/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCanvasStatus(data?.data || null);
      }
    } catch (err) {
      console.error("Failed to fetch canvas status:", err);
    } finally {
      setStatusLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        fetchCanvasStatus();
      } else {
        setCanvasStatus(null);
        setStatusLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchCanvasStatus]);

  return { canvasStatus, statusLoading, refetchCanvasStatus: fetchCanvasStatus };
}
