import { useCallback, useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { apiClient } from "../lib/apiClient.js";

export default function useCanvasStatus() {
  const [canvasStatus, setCanvasStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchCanvasStatus = useCallback(async () => {
    if (!auth.currentUser) return;
    setStatusLoading(true);
    try {
      const data = await apiClient.get("/api/canvas/status");
      setCanvasStatus(data?.data || null);
    } catch (err) {
      console.error("Failed to fetch canvas status:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

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
