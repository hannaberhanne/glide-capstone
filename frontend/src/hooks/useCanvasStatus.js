import { useCallback, useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { apiClient } from "../lib/apiClient.js";

export default function useCanvasStatus() {
  const [canvasStatus, setCanvasStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchCanvasStatus = useCallback(async () => {
    if (!auth.currentUser) {
      setCanvasStatus(null);
      return null;
    }
    setStatusLoading(true);
    try {
      const data = await apiClient.get("/api/canvas/status");
      const nextStatus = data?.data || null;
      setCanvasStatus(nextStatus);
      return nextStatus;
    } catch (err) {
      console.error("Failed to fetch canvas status:", err);
      setCanvasStatus(null);
      throw err;
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const syncCanvas = useCallback(async ({ canvasToken } = {}) => {
    setSyncing(true);
    try {
      const data = await apiClient.post("/api/canvas/sync", {
        canvasToken: canvasToken?.trim() || undefined,
      });
      await fetchCanvasStatus();
      return data?.data || data;
    } finally {
      setSyncing(false);
    }
  }, [fetchCanvasStatus]);

  const disconnectCanvas = useCallback(async ({ deleteData = false } = {}) => {
    setDisconnecting(true);
    try {
      const data = await apiClient.post("/api/canvas/disconnect", { deleteData });
      await fetchCanvasStatus();
      return data;
    } finally {
      setDisconnecting(false);
    }
  }, [fetchCanvasStatus]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        fetchCanvasStatus().catch(() => {});
      } else {
        setCanvasStatus(null);
        setStatusLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchCanvasStatus]);

  return {
    canvasStatus,
    statusLoading,
    syncing,
    disconnecting,
    refetchCanvasStatus: fetchCanvasStatus,
    syncCanvas,
    disconnectCanvas,
  };
}
